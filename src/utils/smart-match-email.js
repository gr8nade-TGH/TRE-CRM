/**
 * Smart Match Email Utilities
 * Generates HTML and text content for Smart Match emails
 */

/**
 * Generate HTML for a single property card in Smart Match email
 * @param {Object} property - Property object with unit, floorPlan, property data
 * @param {number} index - Property index (for numbering)
 * @param {string} propertyMatcherUrl - URL to Property Matcher page
 * @returns {string} HTML string for property card
 */
export function generatePropertyCardHTML(property, index, propertyMatcherUrl = null) {
    const { unit, floorPlan, property: propertyData } = property;

    // Calculate rent (use unit.rent if available, otherwise floor_plan.starting_at)
    const rent = unit.rent || floorPlan.starting_at;
    const marketRent = unit.market_rent || floorPlan.market_rent;

    // Build specials badge
    let specialBadge = '';
    if (floorPlan.has_concession && floorPlan.concession_description) {
        specialBadge = `
            <div style="position: absolute; top: 12px; left: 12px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4); z-index: 1;">
                🎉 SPECIAL
            </div>
        `;
    }

    // Build specials description
    let specialHTML = '';
    if (floorPlan.has_concession && floorPlan.concession_description) {
        specialHTML = `
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; padding: 12px 14px; margin: 12px 0; border-radius: 6px;">
                <div style="font-size: 13px; font-weight: 600; color: #92400e; margin-bottom: 4px;">🎉 Special Offer</div>
                <div style="font-size: 13px; color: #78350f; line-height: 1.5;">${floorPlan.concession_description}</div>
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
        const topAmenities = propertyData.amenities.slice(0, 4);
        amenitiesHTML = `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                <div style="font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Amenities</div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${topAmenities.map(amenity => `
                        <span style="background: #f3f4f6; color: #374151; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                            ${amenity}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Calculate savings if market rent is available
    let savingsHTML = '';
    if (marketRent && marketRent > rent) {
        const savings = marketRent - rent;
        savingsHTML = `
            <div style="background: #d1fae5; color: #065f46; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; margin-top: 8px; text-align: center;">
                💰 Save $${savings.toLocaleString()}/mo vs. market rate
            </div>
        `;
    }

    return `
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: transform 0.2s ease, box-shadow 0.2s ease;">
            <div style="position: relative; height: 220px; overflow: hidden; background: #f3f4f6;">
                ${specialBadge}
                <img src="${imageUrl}" alt="${propertyData.name || propertyData.community_name}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #111827; line-height: 1.3; flex: 1;">${propertyData.name || propertyData.community_name}</h3>
                    <div style="text-align: right; margin-left: 12px;">
                        <div style="font-size: 24px; font-weight: 800; color: #059669; line-height: 1;">$${rent.toLocaleString()}</div>
                        <div style="font-size: 12px; color: #6b7280; font-weight: 500;">/month</div>
                    </div>
                </div>

                <div style="display: flex; gap: 16px; margin-bottom: 12px; padding: 12px; background: #f9fafb; border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 16px;">🛏️</span>
                        <span style="font-size: 14px; font-weight: 600; color: #374151;">${floorPlan.beds}</span>
                        <span style="font-size: 13px; color: #6b7280;">bed</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 16px;">🚿</span>
                        <span style="font-size: 14px; font-weight: 600; color: #374151;">${floorPlan.baths}</span>
                        <span style="font-size: 13px; color: #6b7280;">bath</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 16px;">📐</span>
                        <span style="font-size: 14px; font-weight: 600; color: #374151;">${floorPlan.sqft ? floorPlan.sqft.toLocaleString() : '—'}</span>
                        <span style="font-size: 13px; color: #6b7280;">sqft</span>
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                    <span style="font-size: 14px;">📍</span>
                    <span style="font-size: 14px; color: #4b5563; font-weight: 500;">${location}</span>
                </div>

                <div style="display: flex; align-items: center; gap: 12px; font-size: 13px; color: #6b7280; padding: 10px 0; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
                    <div><strong style="color: #374151;">Unit:</strong> ${unit.unit_number}</div>
                    <div style="width: 1px; height: 14px; background: #d1d5db;"></div>
                    <div><strong style="color: #374151;">Available:</strong> ${formatAvailableDate(unit.available_from)}</div>
                </div>

                ${specialHTML}
                ${savingsHTML}
                ${amenitiesHTML}

                ${propertyMatcherUrl ? `
                <div style="margin-top: 16px;">
                    <a href="${propertyMatcherUrl}" style="display: block; width: 100%; padding: 12px 20px; background: #6366f1; color: white; text-align: center; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; transition: background 0.2s ease;">
                        🏡 View Details & Schedule Tour
                    </a>
                </div>
                ` : ''}
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
 * @param {string} propertyMatcherToken - Optional Property Matcher token for "My Matches" page
 * @returns {Object} Object with { htmlContent, textContent, subject }
 */
export function generateSmartMatchEmail(lead, properties, agent, propertyMatcherToken = null) {
    // Generate Property Matcher URL if token provided
    // Use production URL for emails (not localhost)
    const baseUrl = window.location.hostname === 'localhost'
        ? 'https://tre-crm.vercel.app'  // Production URL
        : window.location.origin;

    const propertyMatcherUrl = propertyMatcherToken
        ? `${baseUrl}/matches/${propertyMatcherToken}`
        : null;

    // Generate property cards HTML (pass URL to each card)
    const propertyCardsHTML = properties
        .map((property, index) => generatePropertyCardHTML(property, index, propertyMatcherUrl))
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
        propertyCardsText: propertyCardsText,
        propertyMatcherUrl: propertyMatcherUrl || ''
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

