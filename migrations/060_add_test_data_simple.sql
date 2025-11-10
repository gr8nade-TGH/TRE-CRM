-- Migration 060: Add comprehensive test data (simplified for actual schema)
-- Purpose: Populate database with diverse test data for Smart Match testing
-- Created: 2025-01-10

-- ============================================================================
-- PART 1: ADD 15 NEW PROPERTIES
-- ============================================================================

INSERT INTO properties (
    id, name, address, city, state, zip_code, market, 
    beds_min, beds_max, baths_min, baths_max, 
    rent_min, rent_max, sqft_min, sqft_max,
    commission_pct, is_pumi, specials_text, bonus_text,
    amenities, is_available, is_test_data,
    created_at, updated_at
) VALUES

-- Downtown High-Rise Luxury
('prop_downtown_luxury_1', 'Skyline Tower Downtown', '500 Congress Ave', 'Austin', 'TX', '78701', 'Austin',
 0, 3, 1, 3, 1800, 4500, 650, 2200,
 100, true, '2 months free on 14-month lease', 'Rooftop lounge, concierge service',
 ARRAY['gym', 'pool', 'parking', 'pet_friendly'], true, true, NOW(), NOW()),

-- Domain Area Modern
('prop_domain_modern_1', 'Domain Heights', '11410 Century Oaks Terrace', 'Austin', 'TX', '78758', 'Austin',
 0, 2, 1, 2, 1400, 3200, 550, 1400,
 75, false, '1 month free + $500 gift card', 'Walking distance to Domain shops',
 ARRAY['gym', 'pool', 'parking', 'pet_friendly'], true, true, NOW(), NOW()),

-- South Austin Budget-Friendly
('prop_south_budget_1', 'South Lamar Flats', '1200 S Lamar Blvd', 'Austin', 'TX', '78704', 'Austin',
 0, 2, 1, 2, 900, 1800, 500, 1100,
 50, false, '$99 move-in special', 'Pet park, BBQ area',
 ARRAY['pool', 'parking', 'pet_friendly'], true, true, NOW(), NOW()),

-- East Austin Hip & Trendy
('prop_east_hip_1', 'East 6th Lofts', '1500 E 6th St', 'Austin', 'TX', '78702', 'Austin',
 0, 2, 1, 2, 1300, 2400, 600, 1200,
 85, true, '6 weeks free on 12-month lease', 'Bike storage, coffee bar',
 ARRAY['gym', 'parking', 'pet_friendly'], true, true, NOW(), NOW()),

-- North Austin Family-Friendly
('prop_north_family_1', 'Parmer Crossing', '12500 N Lamar Blvd', 'Austin', 'TX', '78753', 'Austin',
 1, 3, 1, 2, 1100, 2200, 700, 1500,
 60, false, '1 month free rent', 'Playground, dog park, clubhouse',
 ARRAY['gym', 'pool', 'parking', 'pet_friendly'], true, true, NOW(), NOW()),

-- West Lake Hills Luxury
('prop_westlake_luxury_1', 'Westlake Estates', '3600 Bee Cave Rd', 'Austin', 'TX', '78746', 'Austin',
 1, 3, 1, 3, 2500, 5000, 1000, 2500,
 125, true, 'No deposit with approved credit', 'Lake views, wine storage',
 ARRAY['gym', 'pool', 'parking', 'pet_friendly'], true, true, NOW(), NOW()),

-- Mueller Mixed-Use
('prop_mueller_mixed_1', 'Mueller Station', '1801 Aldrich St', 'Austin', 'TX', '78723', 'Austin',
 0, 2, 1, 2, 1500, 3000, 600, 1300,
 80, false, '8 weeks free on 13-month lease', 'Retail on ground floor, bike share',
 ARRAY['gym', 'pool', 'parking', 'pet_friendly'], true, true, NOW(), NOW()),

-- Riverside Affordable
('prop_riverside_affordable_1', 'Riverside Commons', '2200 S Pleasant Valley Rd', 'Austin', 'TX', '78741', 'Austin',
 0, 2, 1, 2, 850, 1600, 450, 1000,
 45, false, 'Half off first month', 'Hike & bike trail access',
 ARRAY['pool', 'parking', 'pet_friendly'], true, true, NOW(), NOW()),

-- Arboretum Upscale
('prop_arboretum_upscale_1', 'Arboretum Place', '10000 Research Blvd', 'Austin', 'TX', '78759', 'Austin',
 0, 2, 1, 2, 1700, 3500, 700, 1500,
 90, true, '2 months free on 15-month lease', 'Shopping center access, valet',
 ARRAY['gym', 'pool', 'parking', 'pet_friendly'], true, true, NOW(), NOW()),

-- Cedar Park Suburban
('prop_cedar_park_1', 'Cedar Park Village', '601 E Whitestone Blvd', 'Cedar Park', 'TX', '78613', 'Austin',
 1, 3, 1, 2, 1200, 2400, 800, 1600,
 65, false, '1 month free + waived fees', 'Family-friendly, great schools',
 ARRAY['gym', 'pool', 'parking', 'pet_friendly'], true, true, NOW(), NOW()),

-- Round Rock Tech Corridor
('prop_round_rock_tech_1', 'Tech Ridge Apartments', '2500 N IH-35', 'Round Rock', 'TX', '78664', 'Austin',
 0, 2, 1, 2, 1300, 2600, 600, 1300,
 70, false, '6 weeks free', 'Near tech companies, coworking space',
 ARRAY['gym', 'pool', 'parking', 'pet_friendly'], true, true, NOW(), NOW()),

-- Pflugerville Budget
('prop_pflugerville_budget_1', 'Pflugerville Pointe', '1500 Grand Avenue Pkwy', 'Pflugerville', 'TX', '78660', 'Austin',
 1, 3, 1, 2, 950, 1700, 650, 1400,
 55, false, '$500 off first month', 'Community events, BBQ area',
 ARRAY['pool', 'parking', 'pet_friendly'], true, true, NOW(), NOW()),

-- Lakeway Resort-Style
('prop_lakeway_resort_1', 'Lakeway Resort Living', '1 Lakeway Dr', 'Lakeway', 'TX', '78734', 'Austin',
 1, 3, 1, 3, 2000, 4200, 900, 2200,
 110, true, 'First month free on 12-month lease', 'Lake access, boat storage, spa',
 ARRAY['gym', 'pool', 'parking', 'pet_friendly'], true, true, NOW(), NOW()),

-- Georgetown Historic
('prop_georgetown_historic_1', 'Georgetown Square', '100 W 8th St', 'Georgetown', 'TX', '78626', 'Austin',
 0, 2, 1, 2, 1000, 1900, 550, 1100,
 50, false, 'Half off deposit', 'Historic downtown, walkable',
 ARRAY['parking'], true, true, NOW(), NOW()),

-- Leander Family Homes
('prop_leander_family_1', 'Leander Family Residences', '500 Crystal Falls Pkwy', 'Leander', 'TX', '78641', 'Austin',
 2, 4, 2, 3, 1400, 2800, 1100, 2000,
 75, false, '1 month free on 14-month lease', 'Attached garages, yards, top schools',
 ARRAY['gym', 'pool', 'parking', 'pet_friendly'], true, true, NOW(), NOW());


-- ============================================================================
-- PART 2: ADD FLOOR PLANS FOR NEW PROPERTIES
-- ============================================================================

INSERT INTO floor_plans (id, property_id, name, bedrooms, bathrooms, sqft, description, created_at, updated_at) VALUES

-- Skyline Tower Downtown floor plans
('fp_skyline_studio', 'prop_downtown_luxury_1', 'Studio Loft', 0, 1, 650, 'Modern studio with floor-to-ceiling windows', NOW(), NOW()),
('fp_skyline_1br', 'prop_downtown_luxury_1', 'One Bedroom', 1, 1, 850, 'Spacious 1BR with city views', NOW(), NOW()),
('fp_skyline_2br', 'prop_downtown_luxury_1', 'Two Bedroom', 2, 2, 1400, 'Corner 2BR with balcony', NOW(), NOW()),
('fp_skyline_3br', 'prop_downtown_luxury_1', 'Three Bedroom Penthouse', 3, 3, 2200, 'Luxury penthouse with terrace', NOW(), NOW()),

-- Domain Heights floor plans
('fp_domain_studio', 'prop_domain_modern_1', 'Studio', 0, 1, 550, 'Efficient studio layout', NOW(), NOW()),
('fp_domain_1br', 'prop_domain_modern_1', 'One Bedroom', 1, 1, 750, 'Open concept 1BR', NOW(), NOW()),
('fp_domain_2br', 'prop_domain_modern_1', 'Two Bedroom', 2, 2, 1200, 'Split 2BR floor plan', NOW(), NOW()),

-- South Lamar Flats floor plans
('fp_southlamar_studio', 'prop_south_budget_1', 'Studio', 0, 1, 500, 'Cozy studio apartment', NOW(), NOW()),
('fp_southlamar_1br', 'prop_south_budget_1', 'One Bedroom', 1, 1, 700, 'Affordable 1BR', NOW(), NOW()),
('fp_southlamar_2br', 'prop_south_budget_1', 'Two Bedroom', 2, 2, 1100, 'Spacious 2BR', NOW(), NOW()),

-- East 6th Lofts floor plans
('fp_east6th_studio', 'prop_east_hip_1', 'Studio Loft', 0, 1, 600, 'Industrial-style studio', NOW(), NOW()),
('fp_east6th_1br', 'prop_east_hip_1', 'One Bedroom Loft', 1, 1, 800, 'Loft-style 1BR with exposed brick', NOW(), NOW()),
('fp_east6th_2br', 'prop_east_hip_1', 'Two Bedroom Loft', 2, 2, 1200, 'Spacious loft with high ceilings', NOW(), NOW()),

-- Parmer Crossing floor plans
('fp_parmer_1br', 'prop_north_family_1', 'One Bedroom', 1, 1, 700, 'Comfortable 1BR', NOW(), NOW()),
('fp_parmer_2br', 'prop_north_family_1', 'Two Bedroom', 2, 2, 1000, 'Family-friendly 2BR', NOW(), NOW()),
('fp_parmer_3br', 'prop_north_family_1', 'Three Bedroom', 3, 2, 1500, 'Large 3BR with extra storage', NOW(), NOW()),

-- Westlake Estates floor plans
('fp_westlake_1br', 'prop_westlake_luxury_1', 'One Bedroom', 1, 1, 1000, 'Luxury 1BR with lake views', NOW(), NOW()),
('fp_westlake_2br', 'prop_westlake_luxury_1', 'Two Bedroom', 2, 2, 1600, 'Premium 2BR with study', NOW(), NOW()),
('fp_westlake_3br', 'prop_westlake_luxury_1', 'Three Bedroom', 3, 3, 2500, 'Executive 3BR with wine room', NOW(), NOW()),

-- Mueller Station floor plans
('fp_mueller_studio', 'prop_mueller_mixed_1', 'Studio', 0, 1, 600, 'Urban studio', NOW(), NOW()),
('fp_mueller_1br', 'prop_mueller_mixed_1', 'One Bedroom', 1, 1, 800, 'Modern 1BR', NOW(), NOW()),
('fp_mueller_2br', 'prop_mueller_mixed_1', 'Two Bedroom', 2, 2, 1300, 'Spacious 2BR with balcony', NOW(), NOW()),

-- Riverside Commons floor plans
('fp_riverside_studio', 'prop_riverside_affordable_1', 'Studio', 0, 1, 450, 'Budget-friendly studio', NOW(), NOW()),
('fp_riverside_1br', 'prop_riverside_affordable_1', 'One Bedroom', 1, 1, 650, 'Affordable 1BR', NOW(), NOW()),
('fp_riverside_2br', 'prop_riverside_affordable_1', 'Two Bedroom', 2, 2, 1000, 'Value 2BR', NOW(), NOW()),

-- Arboretum Place floor plans
('fp_arboretum_studio', 'prop_arboretum_upscale_1', 'Studio', 0, 1, 700, 'Upscale studio', NOW(), NOW()),
('fp_arboretum_1br', 'prop_arboretum_upscale_1', 'One Bedroom', 1, 1, 900, 'Designer 1BR', NOW(), NOW()),
('fp_arboretum_2br', 'prop_arboretum_upscale_1', 'Two Bedroom', 2, 2, 1500, 'Luxury 2BR with upgrades', NOW(), NOW()),

-- Cedar Park Village floor plans
('fp_cedarpark_1br', 'prop_cedar_park_1', 'One Bedroom', 1, 1, 800, 'Suburban 1BR', NOW(), NOW()),
('fp_cedarpark_2br', 'prop_cedar_park_1', 'Two Bedroom', 2, 2, 1100, 'Family 2BR', NOW(), NOW()),
('fp_cedarpark_3br', 'prop_cedar_park_1', 'Three Bedroom', 3, 2, 1600, 'Large family 3BR', NOW(), NOW()),

-- Tech Ridge floor plans
('fp_techridge_studio', 'prop_round_rock_tech_1', 'Studio', 0, 1, 600, 'Tech-friendly studio', NOW(), NOW()),
('fp_techridge_1br', 'prop_round_rock_tech_1', 'One Bedroom', 1, 1, 800, 'Modern 1BR with office nook', NOW(), NOW()),
('fp_techridge_2br', 'prop_round_rock_tech_1', 'Two Bedroom', 2, 2, 1300, 'Tech-ready 2BR', NOW(), NOW()),

-- Pflugerville Pointe floor plans
('fp_pflugerville_1br', 'prop_pflugerville_budget_1', 'One Bedroom', 1, 1, 650, 'Affordable 1BR', NOW(), NOW()),
('fp_pflugerville_2br', 'prop_pflugerville_budget_1', 'Two Bedroom', 2, 2, 1000, 'Budget 2BR', NOW(), NOW()),
('fp_pflugerville_3br', 'prop_pflugerville_budget_1', 'Three Bedroom', 3, 2, 1400, 'Value 3BR', NOW(), NOW()),

-- Lakeway Resort Living floor plans
('fp_lakeway_1br', 'prop_lakeway_resort_1', 'One Bedroom', 1, 1, 900, 'Resort-style 1BR', NOW(), NOW()),
('fp_lakeway_2br', 'prop_lakeway_resort_1', 'Two Bedroom', 2, 2, 1500, 'Lake view 2BR', NOW(), NOW()),
('fp_lakeway_3br', 'prop_lakeway_resort_1', 'Three Bedroom', 3, 3, 2200, 'Luxury lake house 3BR', NOW(), NOW()),

-- Georgetown Square floor plans
('fp_georgetown_studio', 'prop_georgetown_historic_1', 'Studio', 0, 1, 550, 'Historic studio', NOW(), NOW()),
('fp_georgetown_1br', 'prop_georgetown_historic_1', 'One Bedroom', 1, 1, 750, 'Charming 1BR', NOW(), NOW()),
('fp_georgetown_2br', 'prop_georgetown_historic_1', 'Two Bedroom', 2, 2, 1100, 'Historic 2BR', NOW(), NOW()),

-- Leander Family Residences floor plans
('fp_leander_2br', 'prop_leander_family_1', 'Two Bedroom Townhome', 2, 2, 1100, 'Townhome with garage', NOW(), NOW()),
('fp_leander_3br', 'prop_leander_family_1', 'Three Bedroom Townhome', 3, 2.5, 1500, 'Family townhome with yard', NOW(), NOW()),
('fp_leander_4br', 'prop_leander_family_1', 'Four Bedroom Townhome', 4, 3, 2000, 'Large family home', NOW(), NOW());

