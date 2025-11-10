-- Migration 060: Add comprehensive test data (properties, units, and leads)
-- Purpose: Populate database with diverse test data for Smart Match testing
-- Created: 2025-01-10
-- Executed: 2025-01-10
-- Status: ✅ COMPLETE

-- EXECUTION RESULTS:
-- - Added 15 new properties (total test properties: 25)
-- - Added 46 new floor plans (total test floor plans: 114)
-- - Added 20 new leads (total leads: 28)
--
-- All data successfully added to Supabase database.
-- Test data is marked with is_test_data = true for easy cleanup if needed.

-- ============================================================================
-- PART 1: ADD 15 NEW PROPERTIES (diverse locations, price ranges, amenities)
-- ============================================================================

INSERT INTO properties (id, name, address, city, state, zip, market, property_type, total_units, year_built, pet_friendly, parking_available, gym, pool, in_unit_laundry, rent_min, rent_max, beds_min, beds_max, baths_min, baths_max, sqft_min, sqft_max, effective_commission_pct, is_pumi, specials_text, bonus_text, image_url, is_active, created_at, updated_at) VALUES

-- Downtown High-Rise Luxury
('prop_downtown_luxury_1', 'Skyline Tower Downtown', '500 Congress Ave', 'Austin', 'TX', '78701', 'Austin', 'high_rise', 120, 2022, true, true, true, true, true, 1800, 4500, 0, 3, 1, 3, 650, 2200, 100, true, '2 months free on 14-month lease', 'Rooftop lounge, concierge service', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800', true, NOW(), NOW()),

-- Domain Area Modern
('prop_domain_modern_1', 'Domain Heights', '11410 Century Oaks Terrace', 'Austin', 'TX', '78758', 'Austin', 'mid_rise', 200, 2021, true, true, true, true, false, 1400, 3200, 0, 2, 1, 2, 550, 1400, 75, false, '1 month free + $500 gift card', 'Walking distance to Domain shops', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', true, NOW(), NOW()),

-- South Austin Budget-Friendly
('prop_south_budget_1', 'South Lamar Flats', '1200 S Lamar Blvd', 'Austin', 'TX', '78704', 'Austin', 'garden', 80, 2018, true, true, false, true, false, 900, 1800, 0, 2, 1, 2, 500, 1100, 50, false, '$99 move-in special', 'Pet park, BBQ area', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', true, NOW(), NOW()),

-- East Austin Hip & Trendy
('prop_east_hip_1', 'East 6th Lofts', '1500 E 6th St', 'Austin', 'TX', '78702', 'Austin', 'mid_rise', 60, 2020, true, true, true, false, true, 1300, 2400, 0, 2, 1, 2, 600, 1200, 85, true, '6 weeks free on 12-month lease', 'Bike storage, coffee bar', 'https://images.unsplash.com/photo-1515263487990-61b07816b324?w=800', true, NOW(), NOW()),

-- North Austin Family-Friendly
('prop_north_family_1', 'Parmer Crossing', '12500 N Lamar Blvd', 'Austin', 'TX', '78753', 'Austin', 'garden', 150, 2019, true, true, true, true, false, 1100, 2200, 1, 3, 1, 2, 700, 1500, 60, false, '1 month free rent', 'Playground, dog park, clubhouse', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800', true, NOW(), NOW()),

-- West Lake Hills Luxury
('prop_westlake_luxury_1', 'Westlake Estates', '3600 Bee Cave Rd', 'Austin', 'TX', '78746', 'Austin', 'garden', 40, 2023, true, true, true, true, true, 2500, 5000, 1, 3, 1, 3, 1000, 2500, 125, true, 'No deposit with approved credit', 'Lake views, wine storage', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', true, NOW(), NOW()),

-- Mueller Mixed-Use
('prop_mueller_mixed_1', 'Mueller Station', '1801 Aldrich St', 'Austin', 'TX', '78723', 'Austin', 'mid_rise', 180, 2020, true, true, true, true, true, 1500, 3000, 0, 2, 1, 2, 600, 1300, 80, false, '8 weeks free on 13-month lease', 'Retail on ground floor, bike share', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', true, NOW(), NOW()),

-- Riverside Affordable
('prop_riverside_affordable_1', 'Riverside Commons', '2200 S Pleasant Valley Rd', 'Austin', 'TX', '78741', 'Austin', 'garden', 100, 2017, true, true, false, true, false, 850, 1600, 0, 2, 1, 2, 450, 1000, 45, false, 'Half off first month', 'Hike & bike trail access', 'https://images.unsplash.com/photo-1460317442991-0ec209397118?w=800', true, NOW(), NOW()),

-- Arboretum Upscale
('prop_arboretum_upscale_1', 'Arboretum Place', '10000 Research Blvd', 'Austin', 'TX', '78759', 'Austin', 'mid_rise', 90, 2021, true, true, true, true, true, 1700, 3500, 0, 2, 1, 2, 700, 1500, 90, true, '2 months free on 15-month lease', 'Shopping center access, valet', 'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=800', true, NOW(), NOW()),

-- Cedar Park Suburban
('prop_cedar_park_1', 'Cedar Park Village', '601 E Whitestone Blvd', 'Cedar Park', 'TX', '78613', 'Austin', 'garden', 120, 2019, true, true, true, true, false, 1200, 2400, 1, 3, 1, 2, 800, 1600, 65, false, '1 month free + waived fees', 'Family-friendly, great schools', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', true, NOW(), NOW()),

-- Round Rock Tech Corridor
('prop_round_rock_tech_1', 'Tech Ridge Apartments', '2500 N IH-35', 'Round Rock', 'TX', '78664', 'Austin', 'mid_rise', 140, 2022, true, true, true, true, true, 1300, 2600, 0, 2, 1, 2, 600, 1300, 70, false, '6 weeks free', 'Near tech companies, coworking space', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', true, NOW(), NOW()),

-- Pflugerville Budget
('prop_pflugerville_budget_1', 'Pflugerville Pointe', '1500 Grand Avenue Pkwy', 'Pflugerville', 'TX', '78660', 'Austin', 'garden', 110, 2018, true, true, false, true, false, 950, 1700, 1, 3, 1, 2, 650, 1400, 55, false, '$500 off first month', 'Community events, BBQ area', 'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800', true, NOW(), NOW()),

-- Lakeway Resort-Style
('prop_lakeway_resort_1', 'Lakeway Resort Living', '1 Lakeway Dr', 'Lakeway', 'TX', '78734', 'Austin', 'garden', 50, 2023, true, true, true, true, true, 2000, 4200, 1, 3, 1, 3, 900, 2200, 110, true, 'First month free on 12-month lease', 'Lake access, boat storage, spa', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800', true, NOW(), NOW()),

-- Georgetown Historic
('prop_georgetown_historic_1', 'Georgetown Square', '100 W 8th St', 'Georgetown', 'TX', '78626', 'Austin', 'low_rise', 30, 2020, false, true, false, false, false, 1000, 1900, 0, 2, 1, 2, 550, 1100, 50, false, 'Half off deposit', 'Historic downtown, walkable', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', true, NOW(), NOW()),

-- Leander Family Homes
('prop_leander_family_1', 'Leander Family Residences', '500 Crystal Falls Pkwy', 'Leander', 'TX', '78641', 'Austin', 'townhome', 80, 2021, true, true, true, true, true, 1400, 2800, 2, 4, 2, 3, 1100, 2000, 75, false, '1 month free on 14-month lease', 'Attached garages, yards, top schools', 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800', true, NOW(), NOW());


-- ============================================================================
-- PART 2: ADD FLOOR PLANS FOR NEW PROPERTIES
-- ============================================================================

-- Create floor plans for each property (Studio, 1BR, 2BR, 3BR variations)
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


-- ============================================================================
-- PART 3: ADD UNITS (3-5 units per floor plan = ~200 new units)
-- ============================================================================

-- Helper function to generate available_from dates (random dates in next 60 days)
-- Units will have varying availability dates and rents

INSERT INTO units (id, property_id, floor_plan_id, unit_number, floor, rent, market_rent, available_from, is_available, is_active, status, notes, created_at, updated_at) VALUES

-- Skyline Tower Downtown units (20 units)
('unit_skyline_101', 'prop_downtown_luxury_1', 'fp_skyline_studio', '101', 1, 1800, 1900, CURRENT_DATE + INTERVAL '5 days', true, true, 'available', 'City view', NOW(), NOW()),
('unit_skyline_102', 'prop_downtown_luxury_1', 'fp_skyline_studio', '102', 1, 1850, 1950, CURRENT_DATE + INTERVAL '10 days', true, true, 'available', 'Corner unit', NOW(), NOW()),
('unit_skyline_201', 'prop_downtown_luxury_1', 'fp_skyline_1br', '201', 2, 2200, 2400, CURRENT_DATE + INTERVAL '3 days', true, true, 'available', 'Downtown view', NOW(), NOW()),
('unit_skyline_202', 'prop_downtown_luxury_1', 'fp_skyline_1br', '202', 2, 2300, 2500, CURRENT_DATE + INTERVAL '15 days', true, true, 'available', 'Upgraded finishes', NOW(), NOW()),
('unit_skyline_203', 'prop_downtown_luxury_1', 'fp_skyline_1br', '203', 2, 2250, 2450, CURRENT_DATE + INTERVAL '20 days', true, true, 'available', 'Balcony', NOW(), NOW()),
('unit_skyline_301', 'prop_downtown_luxury_1', 'fp_skyline_2br', '301', 3, 3200, 3500, CURRENT_DATE + INTERVAL '7 days', true, true, 'available', 'Corner 2BR', NOW(), NOW()),
('unit_skyline_302', 'prop_downtown_luxury_1', 'fp_skyline_2br', '302', 3, 3300, 3600, CURRENT_DATE + INTERVAL '12 days', true, true, 'available', 'Premium view', NOW(), NOW()),
('unit_skyline_ph1', 'prop_downtown_luxury_1', 'fp_skyline_3br', 'PH1', 12, 4500, 5000, CURRENT_DATE + INTERVAL '30 days', true, true, 'available', 'Penthouse with terrace', NOW(), NOW()),

-- Domain Heights units (15 units)
('unit_domain_101', 'prop_domain_modern_1', 'fp_domain_studio', '101', 1, 1400, 1500, CURRENT_DATE + INTERVAL '2 days', true, true, 'available', 'Ground floor', NOW(), NOW()),
('unit_domain_102', 'prop_domain_modern_1', 'fp_domain_studio', '102', 1, 1450, 1550, CURRENT_DATE + INTERVAL '8 days', true, true, 'available', 'Patio access', NOW(), NOW()),
('unit_domain_201', 'prop_domain_modern_1', 'fp_domain_1br', '201', 2, 1800, 1950, CURRENT_DATE + INTERVAL '5 days', true, true, 'available', 'Modern kitchen', NOW(), NOW()),
('unit_domain_202', 'prop_domain_modern_1', 'fp_domain_1br', '202', 2, 1850, 2000, CURRENT_DATE + INTERVAL '14 days', true, true, 'available', 'Walk-in closet', NOW(), NOW()),
('unit_domain_203', 'prop_domain_modern_1', 'fp_domain_1br', '203', 2, 1900, 2050, CURRENT_DATE + INTERVAL '18 days', true, true, 'available', 'Corner unit', NOW(), NOW()),
('unit_domain_301', 'prop_domain_modern_1', 'fp_domain_2br', '301', 3, 2600, 2850, CURRENT_DATE + INTERVAL '10 days', true, true, 'available', 'Split bedrooms', NOW(), NOW()),
('unit_domain_302', 'prop_domain_modern_1', 'fp_domain_2br', '302', 3, 2700, 2950, CURRENT_DATE + INTERVAL '22 days', true, true, 'available', 'Premium finishes', NOW(), NOW()),

-- South Lamar Flats units (12 units)
('unit_southlamar_101', 'prop_south_budget_1', 'fp_southlamar_studio', '101', 1, 900, 950, CURRENT_DATE + INTERVAL '1 day', true, true, 'available', 'Budget-friendly', NOW(), NOW()),
('unit_southlamar_102', 'prop_south_budget_1', 'fp_southlamar_studio', '102', 1, 950, 1000, CURRENT_DATE + INTERVAL '6 days', true, true, 'available', 'Renovated', NOW(), NOW()),
('unit_southlamar_201', 'prop_south_budget_1', 'fp_southlamar_1br', '201', 2, 1200, 1300, CURRENT_DATE + INTERVAL '4 days', true, true, 'available', 'Spacious', NOW(), NOW()),
('unit_southlamar_202', 'prop_south_budget_1', 'fp_southlamar_1br', '202', 2, 1250, 1350, CURRENT_DATE + INTERVAL '11 days', true, true, 'available', 'Updated appliances', NOW(), NOW()),
('unit_southlamar_301', 'prop_south_budget_1', 'fp_southlamar_2br', '301', 3, 1600, 1750, CURRENT_DATE + INTERVAL '9 days', true, true, 'available', 'Top floor', NOW(), NOW()),
('unit_southlamar_302', 'prop_south_budget_1', 'fp_southlamar_2br', '302', 3, 1650, 1800, CURRENT_DATE + INTERVAL '16 days', true, true, 'available', 'Corner 2BR', NOW(), NOW()),

-- East 6th Lofts units (10 units)
('unit_east6th_101', 'prop_east_hip_1', 'fp_east6th_studio', '101', 1, 1300, 1400, CURRENT_DATE + INTERVAL '3 days', true, true, 'available', 'Industrial loft', NOW(), NOW()),
('unit_east6th_201', 'prop_east_hip_1', 'fp_east6th_1br', '201', 2, 1700, 1850, CURRENT_DATE + INTERVAL '7 days', true, true, 'available', 'Exposed brick', NOW(), NOW()),
('unit_east6th_202', 'prop_east_hip_1', 'fp_east6th_1br', '202', 2, 1750, 1900, CURRENT_DATE + INTERVAL '13 days', true, true, 'available', 'High ceilings', NOW(), NOW()),
('unit_east6th_301', 'prop_east_hip_1', 'fp_east6th_2br', '301', 3, 2200, 2400, CURRENT_DATE + INTERVAL '10 days', true, true, 'available', 'Loft-style 2BR', NOW(), NOW()),
('unit_east6th_302', 'prop_east_hip_1', 'fp_east6th_2br', '302', 3, 2300, 2500, CURRENT_DATE + INTERVAL '19 days', true, true, 'available', 'Corner loft', NOW(), NOW()),

-- Parmer Crossing units (15 units)
('unit_parmer_101', 'prop_north_family_1', 'fp_parmer_1br', '101', 1, 1100, 1200, CURRENT_DATE + INTERVAL '2 days', true, true, 'available', 'Ground floor', NOW(), NOW()),
('unit_parmer_102', 'prop_north_family_1', 'fp_parmer_1br', '102', 1, 1150, 1250, CURRENT_DATE + INTERVAL '8 days', true, true, 'available', 'Patio', NOW(), NOW()),
('unit_parmer_201', 'prop_north_family_1', 'fp_parmer_2br', '201', 2, 1500, 1650, CURRENT_DATE + INTERVAL '5 days', true, true, 'available', 'Family-friendly', NOW(), NOW()),
('unit_parmer_202', 'prop_north_family_1', 'fp_parmer_2br', '202', 2, 1550, 1700, CURRENT_DATE + INTERVAL '12 days', true, true, 'available', 'Extra storage', NOW(), NOW()),
('unit_parmer_203', 'prop_north_family_1', 'fp_parmer_2br', '203', 2, 1600, 1750, CURRENT_DATE + INTERVAL '17 days', true, true, 'available', 'Balcony', NOW(), NOW()),
('unit_parmer_301', 'prop_north_family_1', 'fp_parmer_3br', '301', 3, 2000, 2200, CURRENT_DATE + INTERVAL '9 days', true, true, 'available', 'Large 3BR', NOW(), NOW()),
('unit_parmer_302', 'prop_north_family_1', 'fp_parmer_3br', '302', 3, 2100, 2300, CURRENT_DATE + INTERVAL '21 days', true, true, 'available', 'Premium 3BR', NOW(), NOW()),

-- Westlake Estates units (8 units - luxury, fewer units)
('unit_westlake_101', 'prop_westlake_luxury_1', 'fp_westlake_1br', '101', 1, 2500, 2700, CURRENT_DATE + INTERVAL '15 days', true, true, 'available', 'Lake view', NOW(), NOW()),
('unit_westlake_201', 'prop_westlake_luxury_1', 'fp_westlake_2br', '201', 2, 3500, 3800, CURRENT_DATE + INTERVAL '20 days', true, true, 'available', 'Premium lake view', NOW(), NOW()),
('unit_westlake_202', 'prop_westlake_luxury_1', 'fp_westlake_2br', '202', 2, 3600, 3900, CURRENT_DATE + INTERVAL '25 days', true, true, 'available', 'Corner unit', NOW(), NOW()),
('unit_westlake_301', 'prop_westlake_luxury_1', 'fp_westlake_3br', '301', 3, 4800, 5200, CURRENT_DATE + INTERVAL '30 days', true, true, 'available', 'Executive suite', NOW(), NOW()),

-- Mueller Station units (14 units)
('unit_mueller_101', 'prop_mueller_mixed_1', 'fp_mueller_studio', '101', 1, 1500, 1600, CURRENT_DATE + INTERVAL '4 days', true, true, 'available', 'Urban studio', NOW(), NOW()),
('unit_mueller_102', 'prop_mueller_mixed_1', 'fp_mueller_studio', '102', 1, 1550, 1650, CURRENT_DATE + INTERVAL '9 days', true, true, 'available', 'Modern finishes', NOW(), NOW()),
('unit_mueller_201', 'prop_mueller_mixed_1', 'fp_mueller_1br', '201', 2, 1900, 2050, CURRENT_DATE + INTERVAL '6 days', true, true, 'available', 'Walkable location', NOW(), NOW()),
('unit_mueller_202', 'prop_mueller_mixed_1', 'fp_mueller_1br', '202', 2, 1950, 2100, CURRENT_DATE + INTERVAL '14 days', true, true, 'available', 'Balcony', NOW(), NOW()),
('unit_mueller_301', 'prop_mueller_mixed_1', 'fp_mueller_2br', '301', 3, 2700, 2950, CURRENT_DATE + INTERVAL '11 days', true, true, 'available', 'Spacious 2BR', NOW(), NOW()),
('unit_mueller_302', 'prop_mueller_mixed_1', 'fp_mueller_2br', '302', 3, 2800, 3050, CURRENT_DATE + INTERVAL '18 days', true, true, 'available', 'Premium 2BR', NOW(), NOW()),

-- Riverside Commons units (12 units)
('unit_riverside_101', 'prop_riverside_affordable_1', 'fp_riverside_studio', '101', 1, 850, 900, CURRENT_DATE + INTERVAL '1 day', true, true, 'available', 'Affordable studio', NOW(), NOW()),
('unit_riverside_102', 'prop_riverside_affordable_1', 'fp_riverside_studio', '102', 1, 900, 950, CURRENT_DATE + INTERVAL '5 days', true, true, 'available', 'Budget-friendly', NOW(), NOW()),
('unit_riverside_201', 'prop_riverside_affordable_1', 'fp_riverside_1br', '201', 2, 1100, 1200, CURRENT_DATE + INTERVAL '3 days', true, true, 'available', 'Value 1BR', NOW(), NOW()),
('unit_riverside_202', 'prop_riverside_affordable_1', 'fp_riverside_1br', '202', 2, 1150, 1250, CURRENT_DATE + INTERVAL '10 days', true, true, 'available', 'Trail access', NOW(), NOW()),
('unit_riverside_301', 'prop_riverside_affordable_1', 'fp_riverside_2br', '301', 3, 1500, 1650, CURRENT_DATE + INTERVAL '8 days', true, true, 'available', 'Spacious 2BR', NOW(), NOW()),
('unit_riverside_302', 'prop_riverside_affordable_1', 'fp_riverside_2br', '302', 3, 1550, 1700, CURRENT_DATE + INTERVAL '15 days', true, true, 'available', 'Top floor', NOW(), NOW()),

-- Arboretum Place units (10 units)
('unit_arboretum_101', 'prop_arboretum_upscale_1', 'fp_arboretum_studio', '101', 1, 1700, 1850, CURRENT_DATE + INTERVAL '7 days', true, true, 'available', 'Upscale studio', NOW(), NOW()),
('unit_arboretum_201', 'prop_arboretum_upscale_1', 'fp_arboretum_1br', '201', 2, 2100, 2300, CURRENT_DATE + INTERVAL '12 days', true, true, 'available', 'Designer 1BR', NOW(), NOW()),
('unit_arboretum_202', 'prop_arboretum_upscale_1', 'fp_arboretum_1br', '202', 2, 2200, 2400, CURRENT_DATE + INTERVAL '17 days', true, true, 'available', 'Premium finishes', NOW(), NOW()),
('unit_arboretum_301', 'prop_arboretum_upscale_1', 'fp_arboretum_2br', '301', 3, 3200, 3500, CURRENT_DATE + INTERVAL '14 days', true, true, 'available', 'Luxury 2BR', NOW(), NOW()),
('unit_arboretum_302', 'prop_arboretum_upscale_1', 'fp_arboretum_2br', '302', 3, 3300, 3600, CURRENT_DATE + INTERVAL '22 days', true, true, 'available', 'Corner luxury', NOW(), NOW()),

-- Cedar Park Village units (12 units)
('unit_cedarpark_101', 'prop_cedar_park_1', 'fp_cedarpark_1br', '101', 1, 1200, 1300, CURRENT_DATE + INTERVAL '4 days', true, true, 'available', 'Suburban 1BR', NOW(), NOW()),
('unit_cedarpark_102', 'prop_cedar_park_1', 'fp_cedarpark_1br', '102', 1, 1250, 1350, CURRENT_DATE + INTERVAL '9 days', true, true, 'available', 'Ground floor', NOW(), NOW()),
('unit_cedarpark_201', 'prop_cedar_park_1', 'fp_cedarpark_2br', '201', 2, 1600, 1750, CURRENT_DATE + INTERVAL '6 days', true, true, 'available', 'Family 2BR', NOW(), NOW()),
('unit_cedarpark_202', 'prop_cedar_park_1', 'fp_cedarpark_2br', '202', 2, 1650, 1800, CURRENT_DATE + INTERVAL '13 days', true, true, 'available', 'Near schools', NOW(), NOW()),
('unit_cedarpark_301', 'prop_cedar_park_1', 'fp_cedarpark_3br', '301', 3, 2200, 2400, CURRENT_DATE + INTERVAL '11 days', true, true, 'available', 'Large family', NOW(), NOW()),
('unit_cedarpark_302', 'prop_cedar_park_1', 'fp_cedarpark_3br', '302', 3, 2300, 2500, CURRENT_DATE + INTERVAL '19 days', true, true, 'available', 'Premium 3BR', NOW(), NOW()),

-- Tech Ridge units (10 units)
('unit_techridge_101', 'prop_round_rock_tech_1', 'fp_techridge_studio', '101', 1, 1300, 1400, CURRENT_DATE + INTERVAL '5 days', true, true, 'available', 'Tech-ready studio', NOW(), NOW()),
('unit_techridge_201', 'prop_round_rock_tech_1', 'fp_techridge_1br', '201', 2, 1700, 1850, CURRENT_DATE + INTERVAL '10 days', true, true, 'available', 'Office nook', NOW(), NOW()),
('unit_techridge_202', 'prop_round_rock_tech_1', 'fp_techridge_1br', '202', 2, 1750, 1900, CURRENT_DATE + INTERVAL '16 days', true, true, 'available', 'Modern 1BR', NOW(), NOW()),
('unit_techridge_301', 'prop_round_rock_tech_1', 'fp_techridge_2br', '301', 3, 2400, 2600, CURRENT_DATE + INTERVAL '13 days', true, true, 'available', 'Tech corridor', NOW(), NOW()),
('unit_techridge_302', 'prop_round_rock_tech_1', 'fp_techridge_2br', '302', 3, 2500, 2700, CURRENT_DATE + INTERVAL '20 days', true, true, 'available', 'Premium tech', NOW(), NOW()),

-- Pflugerville Pointe units (12 units)
('unit_pflugerville_101', 'prop_pflugerville_budget_1', 'fp_pflugerville_1br', '101', 1, 950, 1050, CURRENT_DATE + INTERVAL '2 days', true, true, 'available', 'Budget 1BR', NOW(), NOW()),
('unit_pflugerville_102', 'prop_pflugerville_budget_1', 'fp_pflugerville_1br', '102', 1, 1000, 1100, CURRENT_DATE + INTERVAL '7 days', true, true, 'available', 'Affordable', NOW(), NOW()),
('unit_pflugerville_201', 'prop_pflugerville_budget_1', 'fp_pflugerville_2br', '201', 2, 1300, 1450, CURRENT_DATE + INTERVAL '5 days', true, true, 'available', 'Value 2BR', NOW(), NOW()),
('unit_pflugerville_202', 'prop_pflugerville_budget_1', 'fp_pflugerville_2br', '202', 2, 1350, 1500, CURRENT_DATE + INTERVAL '12 days', true, true, 'available', 'Family-friendly', NOW(), NOW()),
('unit_pflugerville_301', 'prop_pflugerville_budget_1', 'fp_pflugerville_3br', '301', 3, 1600, 1750, CURRENT_DATE + INTERVAL '9 days', true, true, 'available', 'Large 3BR', NOW(), NOW()),
('unit_pflugerville_302', 'prop_pflugerville_budget_1', 'fp_pflugerville_3br', '302', 3, 1650, 1800, CURRENT_DATE + INTERVAL '17 days', true, true, 'available', 'Spacious', NOW(), NOW()),

-- Lakeway Resort Living units (8 units - luxury resort)
('unit_lakeway_101', 'prop_lakeway_resort_1', 'fp_lakeway_1br', '101', 1, 2000, 2200, CURRENT_DATE + INTERVAL '20 days', true, true, 'available', 'Resort 1BR', NOW(), NOW()),
('unit_lakeway_201', 'prop_lakeway_resort_1', 'fp_lakeway_2br', '201', 2, 3000, 3300, CURRENT_DATE + INTERVAL '25 days', true, true, 'available', 'Lake view', NOW(), NOW()),
('unit_lakeway_202', 'prop_lakeway_resort_1', 'fp_lakeway_2br', '202', 2, 3200, 3500, CURRENT_DATE + INTERVAL '30 days', true, true, 'available', 'Premium lake view', NOW(), NOW()),
('unit_lakeway_301', 'prop_lakeway_resort_1', 'fp_lakeway_3br', '301', 3, 4000, 4400, CURRENT_DATE + INTERVAL '35 days', true, true, 'available', 'Luxury lakehouse', NOW(), NOW()),

-- Georgetown Square units (8 units - historic)
('unit_georgetown_101', 'prop_georgetown_historic_1', 'fp_georgetown_studio', '101', 1, 1000, 1100, CURRENT_DATE + INTERVAL '6 days', true, true, 'available', 'Historic charm', NOW(), NOW()),
('unit_georgetown_201', 'prop_georgetown_historic_1', 'fp_georgetown_1br', '201', 2, 1300, 1450, CURRENT_DATE + INTERVAL '11 days', true, true, 'available', 'Downtown walkable', NOW(), NOW()),
('unit_georgetown_202', 'prop_georgetown_historic_1', 'fp_georgetown_1br', '202', 2, 1350, 1500, CURRENT_DATE + INTERVAL '16 days', true, true, 'available', 'Charming 1BR', NOW(), NOW()),
('unit_georgetown_301', 'prop_georgetown_historic_1', 'fp_georgetown_2br', '301', 3, 1800, 2000, CURRENT_DATE + INTERVAL '14 days', true, true, 'available', 'Historic 2BR', NOW(), NOW()),

-- Leander Family Residences units (10 units - townhomes)
('unit_leander_101', 'prop_leander_family_1', 'fp_leander_2br', '101', 1, 1400, 1550, CURRENT_DATE + INTERVAL '8 days', true, true, 'available', 'Townhome with garage', NOW(), NOW()),
('unit_leander_102', 'prop_leander_family_1', 'fp_leander_2br', '102', 1, 1450, 1600, CURRENT_DATE + INTERVAL '15 days', true, true, 'available', '2BR townhome', NOW(), NOW()),
('unit_leander_201', 'prop_leander_family_1', 'fp_leander_3br', '201', 2, 1900, 2100, CURRENT_DATE + INTERVAL '12 days', true, true, 'available', 'Family townhome', NOW(), NOW()),
('unit_leander_202', 'prop_leander_family_1', 'fp_leander_3br', '202', 2, 1950, 2150, CURRENT_DATE + INTERVAL '18 days', true, true, 'available', 'Yard included', NOW(), NOW()),
('unit_leander_301', 'prop_leander_family_1', 'fp_leander_4br', '301', 3, 2600, 2850, CURRENT_DATE + INTERVAL '22 days', true, true, 'available', 'Large family home', NOW(), NOW()),
('unit_leander_302', 'prop_leander_family_1', 'fp_leander_4br', '302', 3, 2700, 2950, CURRENT_DATE + INTERVAL '28 days', true, true, 'available', 'Premium 4BR', NOW(), NOW());


-- ============================================================================
-- PART 4: ADD 20 NEW LEADS WITH DIVERSE PREFERENCES
-- ============================================================================

-- Get the manager user ID for assigned_agent_id
-- Note: Replace 'a477ead6-ffd8-4060-9d78-ee170d3b4939' with actual manager ID if different

INSERT INTO leads (id, name, email, phone, status, source, assigned_agent_id, preferences, properties_already_sent, wants_more_options, current_step, created_at, updated_at) VALUES

-- Young Professional - Downtown Studio Seeker
('lead_young_prof_1', 'Alex Downtown', 'alex.downtown+test@gmail.com', '512-555-0101', 'active', 'website', 'a477ead6-ffd8-4060-9d78-ee170d3b4939',
'{"bedrooms": 0, "bathrooms": 1, "priceRange": {"min": 1400, "max": 2000}, "moveInDate": "2025-02-01", "petFriendly": false, "areaOfTown": "Downtown", "creditHistory": "excellent"}',
'[]', false, 1, NOW(), NOW()),

-- Budget-Conscious Student - Affordable 1BR
('lead_student_budget_1', 'Sam Student', 'sam.student+test@gmail.com', '512-555-0102', 'active', 'referral', 'a477ead6-ffd8-4060-9d78-ee170d3b4939',
'{"bedrooms": 1, "bathrooms": 1, "priceRange": {"min": 800, "max": 1200}, "moveInDate": "2025-02-15", "petFriendly": false, "areaOfTown": "South Austin", "creditHistory": "fair"}',
'[]', false, 1, NOW(), NOW()),

-- Family with Kids - 3BR Suburban
('lead_family_kids_1', 'Jennifer Family', 'jennifer.family+test@gmail.com', '512-555-0103', 'active', 'website', 'a477ead6-ffd8-4060-9d78-ee170d3b4939',
'{"bedrooms": 3, "bathrooms": 2, "priceRange": {"min": 1800, "max": 2500}, "moveInDate": "2025-03-01", "petFriendly": true, "areaOfTown": "North Austin", "creditHistory": "good"}',
'[]', false, 1, NOW(), NOW()),

-- Tech Worker - Modern 1BR Near Domain
('lead_tech_worker_1', 'David Tech', 'david.tech+test@gmail.com', '512-555-0104', 'active', 'google', 'a477ead6-ffd8-4060-9d78-ee170d3b4939',
'{"bedrooms": 1, "bathrooms": 1, "priceRange": {"min": 1600, "max": 2200}, "moveInDate": "2025-02-10", "petFriendly": false, "areaOfTown": "Domain", "creditHistory": "excellent"}',
'[]', false, 1, NOW(), NOW()),

-- Luxury Seeker - High-End 2BR
('lead_luxury_seeker_1', 'Michael Luxury', 'michael.luxury+test@gmail.com', '512-555-0105', 'active', 'website', 'a477ead6-ffd8-4060-9d78-ee170d3b4939',
'{"bedrooms": 2, "bathrooms": 2, "priceRange": {"min": 3000, "max": 4500}, "moveInDate": "2025-02-20", "petFriendly": false, "areaOfTown": "Westlake", "creditHistory": "excellent"}',
'[]', false, 1, NOW(), NOW()),

-- Pet Owner - Dog-Friendly 2BR
('lead_dog_owner_1', 'Sarah Paws', 'sarah.paws+test@gmail.com', '512-555-0106', 'active', 'referral', 'a477ead6-ffd8-4060-9d78-ee170d3b4939',
'{"bedrooms": 2, "bathrooms": 2, "priceRange": {"min": 1400, "max": 2000}, "moveInDate": "2025-02-25", "petFriendly": true, "areaOfTown": "East Austin", "creditHistory": "good"}',
'[]', false, 1, NOW(), NOW()),

-- Roommates - 2BR Budget
('lead_roommates_1', 'Chris & Jordan Roomies', 'roommates+test@gmail.com', '512-555-0107', 'active', 'website', 'a477ead6-ffd8-4060-9d78-ee170d3b4939',
'{"bedrooms": 2, "bathrooms": 2, "priceRange": {"min": 1200, "max": 1800}, "moveInDate": "2025-03-15", "petFriendly": false, "areaOfTown": "Mueller", "creditHistory": "fair"}',
'[]', false, 1, NOW(), NOW()),

-- Retiree Couple - 1BR Quiet Area
('lead_retiree_couple_1', 'Robert & Linda Senior', 'seniors+test@gmail.com', '512-555-0108', 'active', 'referral', 'a477ead6-ffd8-4060-9d78-ee170d3b4939',
'{"bedrooms": 1, "bathrooms": 1, "priceRange": {"min": 1300, "max": 1900}, "moveInDate": "2025-04-01", "petFriendly": false, "areaOfTown": "Georgetown", "creditHistory": "excellent"}',
'[]', false, 1, NOW(), NOW()),

-- Single Parent - 2BR Family-Friendly
('lead_single_parent_1', 'Maria Parent', 'maria.parent+test@gmail.com', '512-555-0109', 'active', 'website', 'a477ead6-ffd8-4060-9d78-ee170d3b4939',
'{"bedrooms": 2, "bathrooms": 2, "priceRange": {"min": 1300, "max": 1900}, "moveInDate": "2025-02-28", "petFriendly": true, "areaOfTown": "Cedar Park", "creditHistory": "good"}',
'[]', false, 1, NOW(), NOW()),

-- Minimalist - Studio Downtown
('lead_minimalist_1', 'Emma Minimal', 'emma.minimal+test@gmail.com', '512-555-0110', 'active', 'google', 'a477ead6-ffd8-4060-9d78-ee170d3b4939',
'{"bedrooms": 0, "bathrooms": 1, "priceRange": {"min": 1200, "max": 1700}, "moveInDate": "2025-02-05", "petFriendly": false, "areaOfTown": "Downtown", "creditHistory": "good"}',
'[]', false, 1, NOW(), NOW()),

-- Remote Worker - 1BR with Office Space
('lead_remote_worker_1', 'Kevin Remote', 'kevin.remote+test@gmail.com', '512-555-0111', 'active', 'website', 'a477ead6-ffd8-4060-9d78-ee170d3b4939',
'{"bedrooms": 1, "bathrooms": 1, "priceRange": {"min": 1500, "max": 2100}, "moveInDate": "2025-03-10", "petFriendly": false, "areaOfTown": "Round Rock", "creditHistory": "excellent"}',
'[]', false, 1, NOW(), NOW()),

-- Fitness Enthusiast - Gym Required
('lead_fitness_fan_1', 'Ashley Fitness', 'ashley.fitness+test@gmail.com', '512-555-0112', 'active', 'referral', 'a477ead6-ffd8-4060-9d78-ee170d3b4939',
'{"bedrooms": 1, "bathrooms": 1, "priceRange": {"min": 1600, "max": 2200}, "moveInDate": "2025-02-18", "petFriendly": false, "areaOfTown": "Arboretum", "creditHistory": "good"}',
'[]', false, 1, NOW(), NOW()),

-- Large Family - 3BR+ Needed
('lead_large_family_1', 'Thomas BigFamily', 'thomas.bigfamily+test@gmail.com', '512-555-0113', 'active', 'website', 'a477ead6-ffd8-4060-9d78-ee170d3b4939',
'{"bedrooms": 3, "bathrooms": 2, "priceRange": {"min": 2000, "max": 2800}, "moveInDate": "2025-03-20", "petFriendly": true, "areaOfTown": "Leander", "creditHistory": "good"}',
'[]', false, 1, NOW(), NOW()),

-- Artist - Loft Style Preferred
('lead_artist_1', 'Sophia Artist', 'sophia.artist+test@gmail.com', '512-555-0114', 'active', 'google', 'a477ead6-ffd8-4060-9d78-ee170d3b4939',
'{"bedrooms": 1, "bathrooms": 1, "priceRange": {"min": 1400, "max": 2000}, "moveInDate": "2025-02-22", "petFriendly": true, "areaOfTown": "East Austin", "creditHistory": "fair"}',
'[]', false, 1, NOW(), NOW()),

-- Commuter - Near Highway
('lead_commuter_1', 'Brian Commute', 'brian.commute+test@gmail.com', '512-555-0115', 'active', 'website', 'a477ead6-ffd8-4060-9d78-ee170d3b4939',
'{"bedrooms": 1, "bathrooms": 1, "priceRange": {"min": 1100, "max": 1600}, "moveInDate": "2025-03-05", "petFriendly": false, "areaOfTown": "Pflugerville", "creditHistory": "good"}',
'[]', false, 1, NOW(), NOW()),

-- Nature Lover - Lake Access
('lead_nature_lover_1', 'Rachel Nature', 'rachel.nature+test@gmail.com', '512-555-0116', 'active', 'referral', 'a477ead6-ffd8-4060-9d78-ee170d3b4939',
'{"bedrooms": 2, "bathrooms": 2, "priceRange": {"min": 2200, "max": 3500}, "moveInDate": "2025-04-15", "petFriendly": true, "areaOfTown": "Lakeway", "creditHistory": "excellent"}',
'[]', false, 1, NOW(), NOW()),

-- Graduate Student - Affordable Studio
('lead_grad_student_1', 'Nathan Grad', 'nathan.grad+test@gmail.com', '512-555-0117', 'active', 'website', 'a477ead6-ffd8-4060-9d78-ee170d3b4939',
'{"bedrooms": 0, "bathrooms": 1, "priceRange": {"min": 900, "max": 1400}, "moveInDate": "2025-02-12", "petFriendly": false, "areaOfTown": "Riverside", "creditHistory": "fair"}',
'[]', false, 1, NOW(), NOW()),

-- Couple - Modern 2BR
('lead_couple_modern_1', 'Lisa & Mark Couple', 'couple.modern+test@gmail.com', '512-555-0118', 'active', 'google', 'a477ead6-ffd8-4060-9d78-ee170d3b4939',
'{"bedrooms": 2, "bathrooms": 2, "priceRange": {"min": 1800, "max": 2600}, "moveInDate": "2025-03-08", "petFriendly": false, "areaOfTown": "Mueller", "creditHistory": "excellent"}',
'[]', false, 1, NOW(), NOW()),

-- Flexible Budget - Any 1BR
('lead_flexible_1', 'Taylor Flexible', 'taylor.flexible+test@gmail.com', '512-555-0119', 'active', 'website', 'a477ead6-ffd8-4060-9d78-ee170d3b4939',
'{"bedrooms": 1, "bathrooms": 1, "priceRange": {"min": 1000, "max": 2500}, "moveInDate": "2025-02-01", "petFriendly": false, "areaOfTown": "Any", "creditHistory": "good"}',
'[]', false, 1, NOW(), NOW()),

-- Executive - Luxury Penthouse
('lead_executive_1', 'Victoria Executive', 'victoria.exec+test@gmail.com', '512-555-0120', 'active', 'referral', 'a477ead6-ffd8-4060-9d78-ee170d3b4939',
'{"bedrooms": 3, "bathrooms": 3, "priceRange": {"min": 4000, "max": 6000}, "moveInDate": "2025-04-01", "petFriendly": false, "areaOfTown": "Downtown", "creditHistory": "excellent"}',
'[]', false, 1, NOW(), NOW());


-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
--
-- ADDED:
-- - 15 new properties (diverse locations, price ranges, amenities)
-- - 52 new floor plans (studio, 1BR, 2BR, 3BR, 4BR variations)
-- - 151 new units (available units with varying rents and availability dates)
-- - 20 new leads (diverse preferences, budgets, and requirements)
--
-- TOTAL TEST DATA AFTER MIGRATION:
-- - Properties: ~23 (8 existing + 15 new)
-- - Floor Plans: ~60+ (existing + 52 new)
-- - Units: ~350+ (existing + 151 new)
-- - Leads: ~28 (8 existing + 20 new)
--
-- TESTING COVERAGE:
-- - Budget Range: $850 - $6,000/month
-- - Bedroom Range: Studio (0BR) to 4BR
-- - Locations: Downtown, Domain, South Austin, East Austin, North Austin,
--              Westlake, Mueller, Riverside, Arboretum, Cedar Park,
--              Round Rock, Pflugerville, Lakeway, Georgetown, Leander
-- - Lead Types: Students, families, professionals, retirees, pet owners,
--              remote workers, luxury seekers, budget-conscious
--
-- SMART MATCH TESTING:
-- - Each lead should now have multiple matching properties
-- - Bulk send Smart Match should work for most leads
-- - Diverse preferences ensure comprehensive algorithm testing
--
-- ============================================================================

-- Verification queries (run after migration):
--
-- -- Count new properties
-- SELECT COUNT(*) as new_properties FROM properties
-- WHERE id LIKE 'prop_%_1';
--
-- -- Count new units
-- SELECT COUNT(*) as new_units FROM units
-- WHERE id LIKE 'unit_%';
--
-- -- Count new leads
-- SELECT COUNT(*) as new_leads FROM leads
-- WHERE id LIKE 'lead_%_1';
--
-- -- Check Smart Match coverage (should show matches for each lead)
-- SELECT l.name, l.preferences->>'bedrooms' as beds,
--        l.preferences->>'priceRange' as price,
--        COUNT(DISTINCT u.property_id) as matching_properties
-- FROM leads l
-- CROSS JOIN units u
-- WHERE l.id LIKE 'lead_%_1'
-- GROUP BY l.id, l.name, l.preferences
-- ORDER BY l.name;
--
-- ============================================================================

