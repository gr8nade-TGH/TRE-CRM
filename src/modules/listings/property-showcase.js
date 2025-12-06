/**
 * Property Showcase Modal
 * A fancy popup to showcase property details when clicking property name
 */

import { formatDate } from '../../utils/helpers.js';

let currentProperty = null;
let modalElement = null;

/**
 * Open the property showcase modal
 */
export async function openPropertyShowcase(property, options = {}) {
    const { SupabaseAPI, toast } = options;
    currentProperty = property;

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
        <div class="modal-card showcase-modal" style="max-width: 1000px; width: 95%; max-height: 90vh;">
            <div class="modal-header showcase-header">
                <h3 id="showcasePropertyTitle">🏢 Property Details</h3>
                <button class="icon-btn close-showcase" aria-label="Close">×</button>
            </div>
            <div class="modal-body showcase-body" style="padding: 0; overflow-y: auto; max-height: calc(90vh - 60px);">
                <div id="showcaseContent"></div>
            </div>
        </div>
    `;

    document.body.appendChild(modalElement);

    // Close handlers
    modalElement.querySelector('.close-showcase').addEventListener('click', closePropertyShowcase);
    modalElement.addEventListener('click', (e) => {
        if (e.target === modalElement) closePropertyShowcase();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modalElement.classList.contains('hidden')) {
            closePropertyShowcase();
        }
    });
}

/**
 * Populate the modal with property data
 */
function populateModal(property, units, floorPlans) {
    const content = document.getElementById('showcaseContent');
    const name = property.community_name || property.name || 'Unknown Property';
    const address = property.street_address || property.address || '';
    const city = property.city || '';
    const state = property.state || 'TX';
    const zip = property.zip_code || '';
    const fullAddress = [address, city, state, zip].filter(Boolean).join(', ');

    // Photos
    const photos = property.photos || [];
    const thumbnail = property.thumbnail;
    const allPhotos = thumbnail ? [thumbnail, ...photos.filter(p => p !== thumbnail)] : photos;
    const primaryPhoto = allPhotos[0] || 'https://via.placeholder.com/800x400?text=No+Photo';

    // Pricing
    const rentMin = property.rent_range_min || property.rent_min || 0;
    const rentMax = property.rent_range_max || property.rent_max || 0;
    const rentDisplay = rentMin === rentMax ? `$${rentMin.toLocaleString()}` : `$${rentMin.toLocaleString()} - $${rentMax.toLocaleString()}`;

    // Beds/Baths
    const bedsMin = property.beds_min || 0;
    const bedsMax = property.beds_max || bedsMin;
    const bathsMin = property.baths_min || 0;
    const bathsMax = property.baths_max || bathsMin;

    // Contact
    const phone = property.contact_phone || property.phone || '';
    const email = property.contact_email || '';
    const contactName = property.contact_name || '';
    const website = property.website || property.leasing_link || '';

    // Amenities
    const amenities = property.amenities || [];

    // Commission
    const commission = property.commission_pct || Math.max(property.escort_pct || 0, property.send_pct || 0);

    // Update title
    document.getElementById('showcasePropertyTitle').innerHTML = `🏢 ${name}`;

    content.innerHTML = buildShowcaseHTML(property, {
        name, fullAddress, primaryPhoto, allPhotos, rentDisplay,
        bedsMin, bedsMax, bathsMin, bathsMax, phone, email, contactName,
        website, amenities, commission, units, floorPlans
    });

    // Add photo gallery click handlers
    setupPhotoGallery(allPhotos);
}

/**
 * Build the showcase HTML
 */
function buildShowcaseHTML(property, data) {
    return buildHeroSection(data) + buildDetailsSection(property, data) + buildUnitsSection(data);
}

function buildHeroSection(data) {
    const photoThumbs = data.allPhotos.slice(0, 5).map((photo, i) => `
        <div class="showcase-thumb ${i === 0 ? 'active' : ''}" data-photo-index="${i}">
            <img src="${photo}" alt="Photo ${i + 1}" onerror="this.src='https://via.placeholder.com/100x70?text=Error'">
        </div>
    `).join('');

    return `
        <div class="showcase-hero">
            <div class="showcase-main-photo">
                <img id="showcaseMainPhoto" src="${data.primaryPhoto}" alt="${data.name}"
                     onerror="this.src='https://via.placeholder.com/800x400?text=No+Photo'">
                ${data.allPhotos.length > 1 ? `<span class="photo-nav photo-prev">❮</span><span class="photo-nav photo-next">❯</span>` : ''}
                <div class="showcase-photo-count">${data.allPhotos.length} photos</div>
            </div>
            ${data.allPhotos.length > 1 ? `<div class="showcase-thumbs">${photoThumbs}</div>` : ''}
        </div>
        <div class="showcase-header-info">
            <div class="showcase-title-row">
                <h2 class="showcase-name">${data.name}</h2>
                ${data.commission > 0 ? `<span class="showcase-commission">💰 ${data.commission}% Commission</span>` : ''}
            </div>
            <p class="showcase-address">📍 ${data.fullAddress}</p>
            <div class="showcase-quick-stats">
                <div class="stat-pill rent"><span class="stat-icon">💵</span>${data.rentDisplay}/mo</div>
                <div class="stat-pill beds"><span class="stat-icon">🛏</span>${data.bedsMin}-${data.bedsMax} Beds</div>
                <div class="stat-pill baths"><span class="stat-icon">🚿</span>${data.bathsMin}-${data.bathsMax} Baths</div>
            </div>
        </div>
    `;
}

function buildDetailsSection(property, data) {
    const contactCards = [];
    if (data.phone) contactCards.push(`<a href="tel:${data.phone}" class="contact-card"><span class="contact-icon">📞</span><span>${data.phone}</span></a>`);
    if (data.email) contactCards.push(`<a href="mailto:${data.email}" class="contact-card"><span class="contact-icon">✉️</span><span>${data.email}</span></a>`);
    if (data.website) contactCards.push(`<a href="${data.website}" target="_blank" class="contact-card"><span class="contact-icon">🌐</span><span>Visit Website</span></a>`);

    const amenityTags = data.amenities.slice(0, 12).map(a => `<span class="amenity-tag">${a}</span>`).join('');
    const hasSpecials = property.activeSpecials && property.activeSpecials.length > 0;

    return `
        <div class="showcase-details">
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
            <div class="showcase-grid">
                <div class="showcase-section">
                    <h4>📞 Contact Information</h4>
                    ${data.contactName ? `<p class="contact-name"><strong>${data.contactName}</strong></p>` : ''}
                    <div class="contact-cards">${contactCards.join('') || '<p class="no-data">No contact info available</p>'}</div>
                </div>
                <div class="showcase-section">
                    <h4>✨ Amenities</h4>
                    <div class="amenities-grid">${amenityTags || '<p class="no-data">No amenities listed</p>'}</div>
                    ${data.amenities.length > 12 ? `<p class="more-amenities">+${data.amenities.length - 12} more</p>` : ''}
                </div>
            </div>
        </div>
    `;
}

function buildUnitsSection(data) {
    if (data.units.length === 0 && data.floorPlans.length === 0) {
        return `<div class="showcase-section units-section"><h4>🏠 Available Units</h4><p class="no-data">No units currently available</p></div>`;
    }

    const items = data.units.length > 0 ? data.units : data.floorPlans;
    const unitCards = items.slice(0, 6).map(item => {
        const unitNum = item.unit_number || item.name || 'Unit';
        const beds = item.beds ?? item.bedrooms ?? '-';
        const baths = item.baths ?? item.bathrooms ?? '-';
        const sqft = item.sqft || item.square_feet || '-';
        const rent = item.rent || item.price || 0;
        const available = item.available_date || item.move_in_date;

        return `
            <div class="unit-card">
                <div class="unit-header"><strong>${unitNum}</strong></div>
                <div class="unit-specs">
                    <span>🛏 ${beds} bd</span>
                    <span>🚿 ${baths} ba</span>
                    <span>📐 ${sqft} sqft</span>
                </div>
                <div class="unit-rent">$${rent.toLocaleString()}/mo</div>
                ${available ? `<div class="unit-available">Available: ${formatDate(available)}</div>` : ''}
            </div>
        `;
    }).join('');

    return `
        <div class="showcase-section units-section">
            <h4>🏠 Available Units (${items.length})</h4>
            <div class="units-grid">${unitCards}</div>
            ${items.length > 6 ? `<p class="more-units">+${items.length - 6} more units</p>` : ''}
        </div>
    `;
}

function setupPhotoGallery(photos) {
    if (photos.length <= 1) return;

    let currentIndex = 0;
    const mainPhoto = document.getElementById('showcaseMainPhoto');
    const thumbs = document.querySelectorAll('.showcase-thumb');
    const prevBtn = document.querySelector('.photo-prev');
    const nextBtn = document.querySelector('.photo-next');

    function showPhoto(index) {
        currentIndex = (index + photos.length) % photos.length;
        mainPhoto.src = photos[currentIndex];
        thumbs.forEach((t, i) => t.classList.toggle('active', i === currentIndex));
    }

    thumbs.forEach((thumb, i) => thumb.addEventListener('click', () => showPhoto(i)));
    if (prevBtn) prevBtn.addEventListener('click', () => showPhoto(currentIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => showPhoto(currentIndex + 1));
}

