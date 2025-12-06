/**
 * Property Image Scanner API
 * Uses SerpAPI Google Images to find property photos for properties missing images
 * 
 * GET  /api/property/image-scan - Get stats on properties missing images
 * POST /api/property/image-scan - Scan next property and update photos
 */

import { createClient } from '@supabase/supabase-js';

const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';

// Delay between requests to be nice to APIs
const SCAN_DELAY_MS = 1500;

export default async function handler(req, res) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const serpApiKey = process.env.SERP_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Supabase not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // GET: Return stats on properties missing images
    if (req.method === 'GET') {
        try {
            // Count properties missing photos
            const { data: allProps, error: countError } = await supabase
                .from('properties')
                .select('id, photos, thumbnail, name, community_name');

            if (countError) throw countError;

            const total = allProps.length;
            const missingPhotos = allProps.filter(p => !p.photos || p.photos.length === 0).length;
            const hasPhotos = total - missingPhotos;
            const missingThumbnail = allProps.filter(p => !p.thumbnail).length;

            // Get scan history stats
            const { count: scannedToday } = await supabase
                .from('properties')
                .select('id', { count: 'exact' })
                .not('photos', 'is', null)
                .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

            return res.status(200).json({
                success: true,
                stats: {
                    totalProperties: total,
                    missingPhotos,
                    hasPhotos,
                    missingThumbnail,
                    percentComplete: Math.round((hasPhotos / total) * 100),
                    scannedLast24h: scannedToday || 0
                }
            });
        } catch (error) {
            console.error('[Image Scan] GET error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // POST: Scan next property for images
    if (req.method === 'POST') {
        if (!serpApiKey) {
            return res.status(500).json({ error: 'SERP_API_KEY not configured' });
        }

        try {
            // Get next property without photos (prioritize those with names)
            const { data: property, error: fetchError } = await supabase
                .from('properties')
                .select('id, name, community_name, city, state, street_address, thumbnail')
                .or('photos.is.null,photos.eq.{}')
                .not('name', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

            if (!property) {
                // Try properties without names as fallback
                const { data: fallback } = await supabase
                    .from('properties')
                    .select('id, name, community_name, city, state, street_address, thumbnail')
                    .or('photos.is.null,photos.eq.{}')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (!fallback) {
                    return res.status(200).json({
                        success: true,
                        done: true,
                        message: 'All properties have photos!'
                    });
                }
            }

            const prop = property || fallback;
            const propertyName = prop.community_name || prop.name || prop.street_address;
            const city = prop.city || 'San Antonio';
            const state = prop.state || 'TX';

            console.log(`[Image Scan] Searching images for: ${propertyName}, ${city} ${state}`);

            // Search for property images
            const images = await searchPropertyImages(propertyName, city, state, serpApiKey);

            if (images.length === 0) {
                // Mark as scanned even if no images found (update updated_at)
                await supabase
                    .from('properties')
                    .update({
                        photos: [],
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', prop.id);

                return res.status(200).json({
                    success: true,
                    property: propertyName,
                    imagesFound: 0,
                    message: 'No images found for this property'
                });
            }

            // Update property with found images
            const updateData = {
                photos: images,
                updated_at: new Date().toISOString()
            };

            // Also set thumbnail if missing
            if (!prop.thumbnail && images.length > 0) {
                updateData.thumbnail = images[0];
            }

            const { error: updateError } = await supabase
                .from('properties')
                .update(updateData)
                .eq('id', prop.id);

            if (updateError) throw updateError;

            console.log(`[Image Scan] Updated ${propertyName} with ${images.length} images`);

            return res.status(200).json({
                success: true,
                property: propertyName,
                propertyId: prop.id,
                imagesFound: images.length,
                thumbnailUpdated: !prop.thumbnail,
                images
            });

        } catch (error) {
            console.error('[Image Scan] POST error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Search for property images using SerpAPI Google Images
 * @param {string} propertyName - Property name
 * @param {string} city - City
 * @param {string} state - State
 * @param {string} serpApiKey - SerpAPI key
 * @returns {Promise<string[]>} Array of image URLs
 */
async function searchPropertyImages(propertyName, city, state, serpApiKey) {
    if (!propertyName || !serpApiKey) return [];

    try {
        // Try multiple search queries for better results
        const queries = [
            `"${propertyName}" apartments ${city} ${state} exterior building`,
            `"${propertyName}" ${city} apartment complex`,
            `${propertyName} apartments ${city}`
        ];

        let allImages = [];

        for (const query of queries) {
            if (allImages.length >= 6) break;

            const params = new URLSearchParams({
                engine: 'google_images',
                q: query,
                num: '10',
                gl: 'us',
                hl: 'en',
                safe: 'active',
                api_key: serpApiKey
            });

            const response = await fetch(`${SERPAPI_BASE_URL}?${params.toString()}`);
            if (!response.ok) continue;

            const data = await response.json();
            const images = data.images_results || [];

            // Extract original image URLs
            const imageUrls = images
                .map(img => img.original)
                .filter(url => {
                    if (!url) return false;
                    const lowerUrl = url.toLowerCase();
                    // Filter out bad images
                    return !lowerUrl.includes('icon') &&
                        !lowerUrl.includes('logo') &&
                        !lowerUrl.includes('avatar') &&
                        !lowerUrl.includes('favicon') &&
                        !lowerUrl.includes('placeholder') &&
                        !lowerUrl.includes('maps.google') &&
                        !lowerUrl.includes('streetview') &&
                        (lowerUrl.includes('.jpg') ||
                            lowerUrl.includes('.jpeg') ||
                            lowerUrl.includes('.png') ||
                            lowerUrl.includes('.webp'));
                });

            // Add unique images
            for (const url of imageUrls) {
                if (!allImages.includes(url) && allImages.length < 8) {
                    allImages.push(url);
                }
            }

            // Small delay between queries
            if (allImages.length < 6) {
                await new Promise(r => setTimeout(r, 500));
            }
        }

        console.log(`[Image Scan] Found ${allImages.length} images for "${propertyName}"`);
        return allImages;

    } catch (error) {
        console.error('[Image Scan] Search error:', error.message);
        return [];
    }
}

