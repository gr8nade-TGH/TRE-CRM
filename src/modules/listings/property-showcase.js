/**
 * Property Showcase Modal
 * A fancy popup to showcase property details when clicking property name
 */

import { formatDate } from '../../utils/helpers.js';
import { invalidateCache } from './listings-cache.js';

let currentProperty = null;
let modalElement = null;
let currentOptions = {};
let currentPhotos = [];

/**
 * Open the property showcase modal
 */
export async function openPropertyShowcase(property, options = {}) {
    const { SupabaseAPI, toast, state } = options;
    currentProperty = property;
    currentOptions = options;

    // Fetch full property data including units and floor plans
    let fullProperty = property;
    let units = [];
    let floorPlans = [];

    try {
        if (SupabaseAPI) {
            fullProperty = await SupabaseAPI.getProperty(property.id) || property;
            units = await SupabaseAPI.getUnits({ propertyId: property.id }) || [];
            floorPlans = await SupabaseAPI.getFloorPlans(property.id) || [];
        }
    } catch (error) {
        console.error('Error fetching property details:', error);
    }

    // Create modal if doesn't exist
    if (!modalElement) {
        createModal();
    }

    // Populate and show
    populateModal(fullProperty, units, floorPlans);
    modalElement.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

/**
 * Close the property showcase modal
 */
export function closePropertyShowcase() {
    if (modalElement) {
        modalElement.classList.add('hidden');
        document.body.style.overflow = '';
    }
    currentProperty = null;
}

/**
 * Create the modal element
 */
function createModal() {
    modalElement = document.createElement('div');
    modalElement.id = 'propertyShowcaseModal';
    modalElement.className = 'modal hidden';
    modalElement.innerHTML = `
        <div class="modal-card showcase-modal">
            <button class="showcase-close-btn" aria-label="Close">×</button>
            <div class="showcase-body-wrapper">
                <div id="showcaseContent">
                    <div class="showcase-loading">
                        <div class="loading-spinner"></div>
                        <p>Loading property details...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modalElement);

    // Close handlers
    modalElement.querySelector('.showcase-close-btn').addEventListener('click', closePropertyShowcase);
    modalElement.addEventListener('click', (e) => {
        if (e.target === modalElement) closePropertyShowcase();
    });

    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboard);
}

let keyboardHandler = null;
function handleKeyboard(e) {
    if (!modalElement || modalElement.classList.contains('hidden')) return;

    if (e.key === 'Escape') {
        closePropertyShowcase();
    }
}

/**
 * Populate the modal with property data
 */
function populateModal(property, units, floorPlans) {
    const content = document.getElementById('showcaseContent');
    const name = property.community_name || property.name || 'Unknown Property';
    const address = property.street_address || property.address || '';
    const city = property.city || '';
    const stateAbbr = property.state || 'TX';
    const zip = property.zip_code || '';
    const fullAddress = [address, city, stateAbbr, zip].filter(Boolean).join(', ');

    // Photos - include floor plan images too
    const photos = property.photos || [];
    const thumbnail = property.thumbnail;
    const floorPlanImages = floorPlans.filter(fp => fp.image_url).map(fp => fp.image_url);
    const allPhotos = thumbnail ? [thumbnail, ...photos.filter(p => p !== thumbnail)] : photos;
    currentPhotos = [...allPhotos]; // Store for delete functionality
    const primaryPhoto = allPhotos[0] || 'https://via.placeholder.com/800x400?text=No+Photo';

    // Check if user is manager (can delete photos)
    const isManager = currentOptions.state?.role === 'manager';
    const isAgentView = !currentOptions.state?.customerView?.isActive;
    const canDeletePhotos = isManager && isAgentView;
    const canEdit = isManager && isAgentView;

    // Pricing
    const rentMin = property.rent_range_min || property.rent_min || 0;
    const rentMax = property.rent_range_max || property.rent_max || 0;
    const rentDisplay = rentMin && rentMax
        ? (rentMin === rentMax ? `$${rentMin.toLocaleString()}` : `$${rentMin.toLocaleString()} - $${rentMax.toLocaleString()}`)
        : 'Contact for pricing';

    // Beds/Baths
    const bedsMin = property.beds_min || 0;
    const bedsMax = property.beds_max || bedsMin;
    const bathsMin = property.baths_min || 0;
    const bathsMax = property.baths_max || bathsMin;
    const sqftMin = property.sqft_min || 0;
    const sqftMax = property.sqft_max || sqftMin;

    // Contact
    const phone = property.contact_phone || property.phone || '';
    const email = property.contact_email || '';
    const contactName = property.contact_name || '';
    const website = property.website || property.leasing_link || '';
    const officeHours = property.office_hours || '';

    // Amenities - combine both arrays
    const amenities = [...(property.amenities || []), ...(property.amenities_tags || [])];
    const uniqueAmenities = [...new Set(amenities)];

    // Extra enrichment data
    const description = property.description || '';
    const petPolicy = property.pet_policy || '';
    const googleRating = property.google_rating || 0;
    const googleReviewsCount = property.google_reviews_count || 0;
    const managementCompany = property.management_company || '';
    const neighborhood = property.neighborhood || (property.neighborhoods || [])[0] || '';
    const isPumi = property.is_pumi || false;

    // 2nd Chance Housing criteria
    const secondChance = {
        brokenLease: property.accepts_broken_lease_under_1 || property.accepts_broken_lease_1_year || property.accepts_broken_lease_2_year || property.accepts_broken_lease_3_plus,
        eviction: property.accepts_eviction_under_1 || property.accepts_eviction_1_year || property.accepts_eviction_2_year || property.accepts_eviction_3_plus,
        criminal: property.accepts_misdemeanor || property.accepts_felony,
        badCredit: property.accepts_bad_credit,
        section8: property.accepts_section_8,
        sameDayMoveIn: property.same_day_move_in
    };

    // Commission
    const commission = property.commission_pct || Math.max(property.escort_pct || 0, property.send_pct || 0);

    // Data completeness score
    const completenessFields = [name, address, phone, email, website, allPhotos.length > 0, uniqueAmenities.length > 0, rentMin > 0];
    const completeness = Math.round((completenessFields.filter(Boolean).length / completenessFields.length) * 100);

    content.innerHTML = buildShowcaseHTML(property, {
        name, fullAddress, primaryPhoto, allPhotos, rentDisplay,
        bedsMin, bedsMax, bathsMin, bathsMax, sqftMin, sqftMax,
        phone, email, contactName, website, officeHours, amenities: uniqueAmenities, commission,
        units, floorPlans, floorPlanImages, canDeletePhotos, canEdit, completeness,
        description, petPolicy, googleRating, googleReviewsCount, managementCompany, neighborhood, isPumi, secondChance
    });

    // Add photo gallery click handlers
    setupPhotoGallery(allPhotos, canDeletePhotos);

    // Setup quick action handlers
    setupQuickActions(property);
}

/**
 * Build the showcase HTML
 */
function buildShowcaseHTML(property, data) {
    // Units section comes FIRST (primary focus), then details
    return buildHeroSection(data) + buildUnitsSection(data) + buildDetailsSection(property, data);
}

function buildHeroSection(data) {
    const photoThumbs = data.allPhotos.slice(0, 6).map((photo, i) => `
        <div class="showcase-thumb ${i === 0 ? 'active' : ''}" data-photo-index="${i}">
            <img src="${photo}" alt="Photo ${i + 1}" loading="lazy" onerror="this.src='https://via.placeholder.com/100x70?text=Error'">
            ${data.canDeletePhotos ? `<button class="photo-delete-btn" data-photo-url="${encodeURIComponent(photo)}" data-photo-index="${i}" title="Delete photo">×</button>` : ''}
        </div>
    `).join('');

    // Completeness indicator color
    const completenessColor = data.completeness >= 80 ? '#22c55e' : data.completeness >= 50 ? '#f59e0b' : '#ef4444';

    // Format beds/baths display - handle 0 values gracefully
    const hasBeds = data.bedsMin > 0 || data.bedsMax > 0;
    const hasBaths = data.bathsMin > 0 || data.bathsMax > 0;
    const bedsDisplay = hasBeds
        ? (data.bedsMax !== data.bedsMin ? `${data.bedsMin}-${data.bedsMax}` : `${data.bedsMin}`)
        : null;
    const bathsDisplay = hasBaths
        ? (data.bathsMax !== data.bathsMin ? `${data.bathsMin}-${data.bathsMax}` : `${data.bathsMin}`)
        : null;

    // Rent display - only show if we have actual data
    const hasRentData = data.rentDisplay && data.rentDisplay !== 'Contact for pricing';

    return `
        <div class="showcase-hero">
            <div class="showcase-main-photo">
                <img id="showcaseMainPhoto" src="${data.primaryPhoto}" alt="${data.name}"
                     loading="eager" decoding="async" fetchpriority="high"
                     style="image-rendering: auto; -webkit-backface-visibility: hidden; backface-visibility: hidden;"
                     onerror="this.src='https://via.placeholder.com/800x400?text=No+Photo'">
                ${data.allPhotos.length > 1 ? `<span class="photo-nav photo-prev" title="Previous (←)">❮</span><span class="photo-nav photo-next" title="Next (→)">❯</span>` : ''}
                ${data.canDeletePhotos && data.allPhotos.length > 0 ? `<button class="photo-delete-btn main-photo-delete" data-photo-url="${encodeURIComponent(data.primaryPhoto)}" data-photo-index="0" title="Delete this photo">×</button>` : ''}
                <div class="showcase-photo-count">
                    <span class="photo-counter-current">1</span> / ${data.allPhotos.length || 1}
                </div>
            </div>
            ${data.allPhotos.length > 1 ? `
                <div class="showcase-thumbs-wrapper">
                    <div class="showcase-thumbs">${photoThumbs}</div>
                    ${data.allPhotos.length > 6 ? `<span class="more-photos">+${data.allPhotos.length - 6} more</span>` : ''}
                </div>
            ` : ''}
        </div>
        <div class="showcase-header-info">
            <div class="showcase-title-row">
                <h2 class="showcase-name">${data.name}</h2>
                <div class="showcase-badges">
                    ${data.commission > 0 ? `<span class="showcase-commission">💰 ${data.commission}%</span>` : ''}
                    ${data.canEdit ? `<span class="showcase-completeness" style="background: ${completenessColor}20; color: ${completenessColor}; border: 1px solid ${completenessColor};">${data.completeness}% Complete</span>` : ''}
                </div>
            </div>
            <p class="showcase-address">📍 ${data.fullAddress}</p>

            <div class="showcase-quick-stats">
                ${hasRentData ? `<div class="stat-pill rent"><span class="stat-icon">💵</span><span class="stat-value">${data.rentDisplay}</span><span class="stat-label">/mo</span></div>` : ''}
                ${bedsDisplay !== null ? `<div class="stat-pill beds"><span class="stat-icon">🛏</span><span class="stat-value">${bedsDisplay}</span><span class="stat-label">Beds</span></div>` : ''}
                ${bathsDisplay !== null ? `<div class="stat-pill baths"><span class="stat-icon">🚿</span><span class="stat-value">${bathsDisplay}</span><span class="stat-label">Baths</span></div>` : ''}
                ${data.sqftMin ? `<div class="stat-pill sqft"><span class="stat-icon">📐</span><span class="stat-value">${data.sqftMin.toLocaleString()}${data.sqftMax !== data.sqftMin ? `-${data.sqftMax.toLocaleString()}` : ''}</span><span class="stat-label">sqft</span></div>` : ''}
            </div>

            <div class="showcase-quick-actions">
                ${data.phone ? `<a href="tel:${data.phone}" class="quick-action-btn call"><span>📞</span> Call</a>` : ''}
                ${data.email ? `<a href="mailto:${data.email}" class="quick-action-btn email"><span>✉️</span> Email</a>` : ''}
                ${data.website ? `<a href="${data.website}" target="_blank" class="quick-action-btn website"><span>🌐</span> Website</a>` : ''}
                ${data.canEdit ? `<button class="quick-action-btn edit" data-action="edit"><span>✏️</span> Edit</button>` : ''}
            </div>
        </div>
    `;
}

function buildDetailsSection(property, data) {
    const contactCards = [];
    if (data.phone) contactCards.push(`<a href="tel:${data.phone}" class="contact-card"><span class="contact-icon">📞</span><span>${data.phone}</span></a>`);
    if (data.email) contactCards.push(`<a href="mailto:${data.email}" class="contact-card"><span class="contact-icon">✉️</span><span>${data.email}</span></a>`);
    if (data.website) contactCards.push(`<a href="${data.website}" target="_blank" class="contact-card"><span class="contact-icon">🌐</span><span>Visit Website</span></a>`);
    if (data.officeHours) contactCards.push(`<div class="contact-card"><span class="contact-icon">🕐</span><span>${data.officeHours}</span></div>`);

    const amenityTags = data.amenities.slice(0, 16).map(a => `<span class="amenity-tag">${a}</span>`).join('');
    const hasSpecials = property.activeSpecials && property.activeSpecials.length > 0;

    // Build 2nd chance housing badges
    const secondChanceBadges = [];
    if (data.secondChance) {
        if (data.secondChance.brokenLease) secondChanceBadges.push(`<span class="second-chance-badge">✓ Broken Lease</span>`);
        if (data.secondChance.eviction) secondChanceBadges.push(`<span class="second-chance-badge">✓ Prior Eviction</span>`);
        if (data.secondChance.criminal) secondChanceBadges.push(`<span class="second-chance-badge">✓ Criminal History</span>`);
        if (data.secondChance.badCredit) secondChanceBadges.push(`<span class="second-chance-badge">✓ Bad Credit</span>`);
        if (data.secondChance.section8) secondChanceBadges.push(`<span class="second-chance-badge section8">🏠 Section 8</span>`);
        if (data.secondChance.sameDayMoveIn) secondChanceBadges.push(`<span class="second-chance-badge fast">⚡ Same-Day Move-In</span>`);
    }

    // Google rating display
    const googleRatingHtml = data.googleRating > 0 ? `
        <div class="google-rating">
            <span class="rating-stars">${'⭐'.repeat(Math.round(data.googleRating))}</span>
            <span class="rating-value">${data.googleRating.toFixed(1)}</span>
            ${data.googleReviewsCount > 0 ? `<span class="rating-count">(${data.googleReviewsCount} reviews)</span>` : ''}
        </div>
    ` : '';

    return `
        <div class="showcase-details">
            ${data.description ? `
                <div class="showcase-section description-section">
                    <h4>📝 About This Property</h4>
                    <p class="property-description">${data.description}</p>
                    ${data.managementCompany ? `<p class="management-company">Managed by: <strong>${data.managementCompany}</strong></p>` : ''}
                    ${googleRatingHtml}
                </div>
            ` : ''}
            ${hasSpecials ? `
                <div class="showcase-section specials-section">
                    <h4>🔥 Current Specials</h4>
                    <div class="specials-list">
                        ${property.activeSpecials.map(s => `
                            <div class="special-card">
                                <span class="special-text">${s.description || s.special_text || s}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            ${secondChanceBadges.length > 0 ? `
                <div class="showcase-section second-chance-section">
                    <h4>🤝 2nd Chance Housing</h4>
                    <div class="second-chance-grid">${secondChanceBadges.join('')}</div>
                </div>
            ` : ''}
            <div class="showcase-section">
                <h4>✨ Amenities</h4>
                <div class="amenities-grid">${amenityTags || '<p class="no-data">No amenities listed</p>'}</div>
                ${data.amenities.length > 16 ? `<p class="more-amenities">+${data.amenities.length - 16} more</p>` : ''}
            </div>
            ${data.petPolicy ? `
                <div class="showcase-section pet-section">
                    <h4>🐾 Pet Policy</h4>
                    <p class="pet-policy-text">${data.petPolicy}</p>
                </div>
            ` : ''}
        </div>
    `;
}

function buildUnitsSection(data) {
    if (data.units.length === 0 && data.floorPlans.length === 0) {
        return `<div class="showcase-section units-section featured"><h4>🏠 Available Units</h4><p class="no-data">No units currently available</p></div>`;
    }

    const items = data.units.length > 0 ? data.units : data.floorPlans;
    const unitCards = items.slice(0, 8).map((item, index) => {
        const unitNum = item.unit_number || item.name || 'Unit';
        const beds = item.beds ?? item.bedrooms;
        const baths = item.baths ?? item.bathrooms;
        const sqft = item.sqft || item.square_feet;
        const rent = item.rent || item.price || 0;
        const available = item.available_date || item.move_in_date;
        const unitId = item.id || index;

        // Build specs - only show what we have
        const specs = [];
        if (beds !== undefined && beds !== null) specs.push(`<span class="unit-spec">🛏 ${beds} bd</span>`);
        if (baths !== undefined && baths !== null) specs.push(`<span class="unit-spec">🚿 ${baths} ba</span>`);
        if (sqft) specs.push(`<span class="unit-spec">📐 ${sqft.toLocaleString()} sqft</span>`);

        return `
            <div class="unit-card" data-unit-id="${unitId}">
                <div class="unit-header">
                    <strong class="unit-name">${unitNum}</strong>
                    ${rent > 0 ? `<span class="unit-rent">$${rent.toLocaleString()}/mo</span>` : ''}
                </div>
                <div class="unit-specs">${specs.join('')}</div>
                ${available ? `<div class="unit-available">📅 Available ${formatDate(available)}</div>` : ''}
                ${data.canEdit ? `<button class="unit-showcase-btn" data-action="add-unit-to-showcase" data-unit-id="${unitId}" title="Add this unit to your showcase">⭐ Add to Showcase</button>` : ''}
            </div>
        `;
    }).join('');

    return `
        <div class="showcase-section units-section featured">
            <h4>🏠 Available Units <span class="unit-count">(${items.length})</span></h4>
            <div class="units-grid">${unitCards}</div>
            ${items.length > 8 ? `<p class="more-units">+${items.length - 8} more units available</p>` : ''}
        </div>
    `;
}

function setupPhotoGallery(photos, canDeletePhotos = false) {
    let currentIndex = 0;
    const mainPhoto = document.getElementById('showcaseMainPhoto');
    const thumbs = document.querySelectorAll('.showcase-thumb');
    const prevBtn = document.querySelector('.photo-prev');
    const nextBtn = document.querySelector('.photo-next');
    const mainDeleteBtn = document.querySelector('.main-photo-delete');

    function showPhoto(index) {
        if (photos.length === 0) return;
        currentIndex = (index + photos.length) % photos.length;
        mainPhoto.src = photos[currentIndex];
        thumbs.forEach((t, i) => t.classList.toggle('active', i === currentIndex));

        // Update photo counter
        const counterEl = document.querySelector('.photo-counter-current');
        if (counterEl) counterEl.textContent = currentIndex + 1;

        // Update main delete button to current photo
        if (mainDeleteBtn) {
            mainDeleteBtn.dataset.photoUrl = encodeURIComponent(photos[currentIndex]);
            mainDeleteBtn.dataset.photoIndex = currentIndex;
        }
    }

    if (photos.length > 1) {
        thumbs.forEach((thumb, i) => {
            thumb.addEventListener('click', (e) => {
                // Ignore if clicking delete button
                if (e.target.classList.contains('photo-delete-btn')) return;
                showPhoto(i);
            });
        });
        if (prevBtn) prevBtn.addEventListener('click', () => showPhoto(currentIndex - 1));
        if (nextBtn) nextBtn.addEventListener('click', () => showPhoto(currentIndex + 1));
    }

    // Setup delete handlers
    if (canDeletePhotos) {
        const deleteButtons = document.querySelectorAll('.photo-delete-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const photoUrl = decodeURIComponent(btn.dataset.photoUrl);
                await handlePhotoDelete(photoUrl);
            });
        });
    }
}

/**
 * Handle photo deletion
 */
async function handlePhotoDelete(photoUrl) {
    const { SupabaseAPI, toast } = currentOptions;

    // Confirmation dialog
    const confirmed = confirm('Are you sure you want to delete this photo?\n\nThis action cannot be undone.');
    if (!confirmed) return;

    try {
        // Get current property photos
        const property = currentProperty;
        const photos = property.photos || [];
        const thumbnail = property.thumbnail;

        // Remove the photo from the array
        const updatedPhotos = photos.filter(p => p !== photoUrl);

        // If deleting thumbnail, update that too
        const updatedThumbnail = thumbnail === photoUrl ? (updatedPhotos[0] || null) : thumbnail;

        // Update in Supabase
        if (SupabaseAPI) {
            await SupabaseAPI.updateProperty(property.id, {
                photos: updatedPhotos,
                thumbnail: updatedThumbnail
            });

            // Update local property reference
            currentProperty.photos = updatedPhotos;
            currentProperty.thumbnail = updatedThumbnail;

            // Invalidate listings cache so changes reflect on table
            invalidateCache();

            // Refresh the modal content
            const units = await SupabaseAPI.getUnits({ propertyId: property.id }) || [];
            const floorPlans = await SupabaseAPI.getFloorPlans(property.id) || [];
            populateModal(currentProperty, units, floorPlans);

            toast?.('Photo deleted successfully', 'success');
        }
    } catch (error) {
        console.error('Error deleting photo:', error);
        toast?.('Failed to delete photo', 'error');
    }
}

/**
 * Setup quick action button handlers
 */
function setupQuickActions(property) {
    const editBtn = document.querySelector('.quick-action-btn.edit');
    if (editBtn) {
        editBtn.addEventListener('click', async () => {
            closePropertyShowcase();
            // Small delay to let the modal close
            setTimeout(async () => {
                try {
                    const { openListingEditModal } = await import('../modals/listing-modals.js');
                    await openListingEditModal(property, currentOptions);
                } catch (error) {
                    console.error('Error opening edit modal:', error);
                }
            }, 200);
        });
    }
}
