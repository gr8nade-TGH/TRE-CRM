/**
 * Smart Match Email Utilities
 * Generates HTML and text content for Smart Match emails
 */

/**
 * Generate HTML for a single property card in Smart Match email
 * @param {Object} property - Property object with unit, floorPlan, property data
 * @param {number} index - Property index (for numbering)
 * @returns {string} HTML string for property card
 */
export function generatePropertyCardHTML(property, index) {
    const { unit, floorPlan, property: propertyData } = property;
    
    // Calculate rent (use unit.rent if available, otherwise floor_plan.starting_at)
    const rent = unit.rent || floorPlan.starting_at;
    const marketRent = unit.market_rent || floorPlan.market_rent;
    
    // Build specials text
    let specialHTML = '';
    if (floorPlan.has_concession && floorPlan.concession_description) {
        specialHTML = `
            <div class="property-special">
                <strong>🎉 Special Offer:</strong> ${floorPlan.concession_description}
            </div>
        `;
    }
    
    // Build image URL (use property image or placeholder)
    const imageUrl = propertyData.image_url || floorPlan.image_url || 
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop';
    
    // Build location string
    const location = `${propertyData.city || 'San Antonio'}, ${propertyData.state || 'TX'}`;
    
    // Build amenities/features (if available)
    let amenitiesHTML = '';
    if (propertyData.amenities && propertyData.amenities.length > 0) {
        const topAmenities = propertyData.amenities.slice(0, 3).join(' • ');
        amenitiesHTML = `
            <div style="color: #6b7280; font-size: 13px; margin-top: 8px;">
                ${topAmenities}
            </div>
        `;
    }
    
    return `
        <div class="property-card">
            <img src="${imageUrl}" alt="${propertyData.name || propertyData.community_name}" class="property-image">
            <div class="property-body">
                <div class="property-header">
                    <h3 class="property-name">${propertyData.name || propertyData.community_name}</h3>
                    <div style="text-align: right;">
                        <div class="property-price">$${rent.toLocaleString()}</div>
                        <div class="property-price-label">/month</div>
                    </div>
                </div>
                
                <div class="property-specs">
                    <div class="spec-item">
                        <span class="spec-icon">🛏️</span>
                        <span>${floorPlan.beds} bed</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-icon">🚿</span>
                        <span>${floorPlan.baths} bath</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-icon">📐</span>
                        <span>${floorPlan.sqft ? floorPlan.sqft.toLocaleString() : '—'} sqft</span>
                    </div>
                </div>
                
                <div class="property-location">${location}</div>
                
                ${amenitiesHTML}
                ${specialHTML}
                
                <div style="margin-top: 12px; font-size: 13px; color: #6b7280;">
                    <strong>Unit:</strong> ${unit.unit_number} • 
                    <strong>Available:</strong> ${formatAvailableDate(unit.available_from)}
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate plain text for a single property card
 * @param {Object} property - Property object with unit, floorPlan, property data
 * @param {number} index - Property index (for numbering)
 * @returns {string} Plain text string for property card
 */
export function generatePropertyCardText(property, index) {
    const { unit, floorPlan, property: propertyData } = property;
    
    const rent = unit.rent || floorPlan.starting_at;
    const location = `${propertyData.city || 'San Antonio'}, ${propertyData.state || 'TX'}`;
    
    let text = `
${index + 1}. ${propertyData.name || propertyData.community_name}
   $${rent.toLocaleString()}/month
   ${floorPlan.beds} bed • ${floorPlan.baths} bath • ${floorPlan.sqft ? floorPlan.sqft.toLocaleString() : '—'} sqft
   📍 ${location}
   Unit ${unit.unit_number} • Available ${formatAvailableDate(unit.available_from)}
`;
    
    if (floorPlan.has_concession && floorPlan.concession_description) {
        text += `   🎉 Special: ${floorPlan.concession_description}\n`;
    }
    
    return text;
}

/**
 * Generate complete Smart Match email content
 * @param {Object} lead - Lead object with name, email, preferences
 * @param {Array} properties - Array of matched property objects (4-6 properties)
 * @param {Object} agent - Agent object with name, email, phone
 * @returns {Object} Object with { htmlContent, textContent, subject }
 */
export function generateSmartMatchEmail(lead, properties, agent) {
    // Generate property cards HTML
    const propertyCardsHTML = properties
        .map((property, index) => generatePropertyCardHTML(property, index))
        .join('\n');
    
    // Generate property cards text
    const propertyCardsText = properties
        .map((property, index) => generatePropertyCardText(property, index))
        .join('\n');
    
    // Template variables
    const variables = {
        leadName: lead.name || 'there',
        propertyCount: properties.length,
        agentName: agent.name || 'Your Agent',
        agentEmail: agent.email || 'agent@texasrelocationexperts.com',
        agentPhone: agent.phone || '(555) 123-4567',
        propertyCards: propertyCardsHTML,
        propertyCardsText: propertyCardsText
    };
    
    return {
        variables,
        subject: `🏠 ${lead.name}, We Found Your Perfect Match!`,
        templateId: 'smart_match_email'
    };
}

/**
 * Format available date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
function formatAvailableDate(dateString) {
    if (!dateString) return 'Now';
    
    const date = new Date(dateString);
    const now = new Date();
    
    // If date is in the past or today, return "Now"
    if (date <= now) return 'Now';
    
    // Format as "Nov 15" or "Dec 1"
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Validate Smart Match email data before sending
 * @param {Object} lead - Lead object
 * @param {Array} properties - Array of matched properties
 * @param {Object} agent - Agent object
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateSmartMatchEmailData(lead, properties, agent) {
    const errors = [];
    
    if (!lead || !lead.email) {
        errors.push('Lead email is required');
    }
    
    if (!lead.name) {
        errors.push('Lead name is required');
    }
    
    if (!properties || properties.length === 0) {
        errors.push('At least one property is required');
    }
    
    if (properties && properties.length > 6) {
        errors.push('Maximum 6 properties allowed per email');
    }
    
    if (!agent || !agent.email) {
        errors.push('Agent email is required');
    }
    
    if (!agent || !agent.name) {
        errors.push('Agent name is required');
    }
    
    // Validate each property has required fields
    if (properties) {
        properties.forEach((property, index) => {
            if (!property.unit || !property.floorPlan || !property.property) {
                errors.push(`Property ${index + 1} is missing required data (unit, floorPlan, or property)`);
            }
        });
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

