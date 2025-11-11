/**
 * Smart Match Algorithm Test Suite
 *
 * Run this file in the browser console or Node.js to verify scoring algorithm works correctly.
 *
 * Test Cases:
 * 1. Perfect Match: 160 points (110 base + 30 commission + 20 PUMI)
 * 2. Good Match: 120 points (110 base + 10 commission)
 * 3. Partial Match: 130 points (80 base + 30 commission + 20 PUMI)
 * 4. One Unit Per Property Rule: Verify only highest-scoring unit per property is returned
 */

import { calculateMatchScore, getSmartMatches } from './smart-match.js';

// Test Lead: 2 bed, 2 bath, $1200-1500, North Austin, move-in 2025-11-01
const testLead = {
    id: 'lead-test-1',
    name: 'Test Lead',
    bedrooms: '2',
    bathrooms: '2',
    price_range: '1200-1500',
    area_of_town: 'North Austin',
    move_in_date: '2025-11-01'
};

// Test Case 1: Perfect Match
// Expected: 120 (base) + 30 (commission) + 20 (PUMI) = 170 points
const perfectMatchUnit = {
    id: 'unit-1',
    unit_number: '101',
    rent: 1300,
    available_from: '2025-10-15'
};

const perfectMatchFloorPlan = {
    id: 'fp-1',
    name: '2x2 Classic',
    beds: 2,
    baths: 2.0,
    sqft: 1000,
    starting_at: 1300,
    market_rent: 1400
};

const perfectMatchProperty = {
    id: 'prop-1',
    name: 'Perfect Property',
    city: 'North Austin',
    commission_pct: 4.5,
    is_pumi: true
};

console.log('🧪 Test Case 1: Perfect Match');
const score1 = calculateMatchScore(testLead, perfectMatchUnit, perfectMatchFloorPlan, perfectMatchProperty);
console.log('Score Breakdown:', score1);
console.log('Expected: 160 points (30 beds + 20 baths + 25 price + 25 location + 10 move-in + 30 commission + 20 PUMI)');
console.log('Actual:', score1.totalScore);
console.log('✅ PASS:', score1.totalScore === 160 ? 'YES' : 'NO');
console.log('---');

// Test Case 2: Good Match, Lower Commission
// Expected: 120 (base) + 10 (commission) = 130 points
const goodMatchUnit = {
    id: 'unit-2',
    unit_number: '202',
    rent: 1350,
    available_from: '2025-10-15'
};

const goodMatchFloorPlan = {
    id: 'fp-2',
    name: '2x2 Deluxe',
    beds: 2,
    baths: 2.0,
    sqft: 1100,
    starting_at: 1350,
    market_rent: 1450
};

const goodMatchProperty = {
    id: 'prop-2',
    name: 'Good Property',
    city: 'North Austin',
    commission_pct: 2.5,
    is_pumi: false
};

console.log('🧪 Test Case 2: Good Match, Lower Commission');
const score2 = calculateMatchScore(testLead, goodMatchUnit, goodMatchFloorPlan, goodMatchProperty);
console.log('Score Breakdown:', score2);
console.log('Expected: 120 points (30 beds + 20 baths + 25 price + 25 location + 10 move-in + 10 commission)');
console.log('Actual:', score2.totalScore);
console.log('✅ PASS:', score2.totalScore === 120 ? 'YES' : 'NO');
console.log('---');

// Test Case 3: Partial Match, High Commission
// Expected: 15 (beds ±1) + 20 (baths) + 25 (price) + 10 (location) + 30 (commission) + 20 (PUMI) = 120 points
const partialMatchUnit = {
    id: 'unit-3',
    unit_number: '303',
    rent: 1400,
    available_from: '2025-10-20'
};

const partialMatchFloorPlan = {
    id: 'fp-3',
    name: '3x2 Premium',
    beds: 3, // ±1 from lead preference (2)
    baths: 2.0,
    sqft: 1300,
    starting_at: 1400,
    market_rent: 1500
};

const partialMatchProperty = {
    id: 'prop-3',
    name: 'Partial Property',
    city: 'South Austin', // Different area, but same market
    commission_pct: 4.5,
    is_pumi: true
};

console.log('🧪 Test Case 3: Partial Match, High Commission');
const score3 = calculateMatchScore(testLead, partialMatchUnit, partialMatchFloorPlan, partialMatchProperty);
console.log('Score Breakdown:', score3);
console.log('Expected: 130 points (15 beds + 20 baths + 25 price + 10 location + 10 move-in + 30 commission + 20 PUMI)');
console.log('Actual:', score3.totalScore);
console.log('✅ PASS:', score3.totalScore === 130 ? 'YES' : 'NO');
console.log('---');

// Test Case 4: One Unit Per Property Rule
console.log('🧪 Test Case 4: One Unit Per Property Rule');

const unitsWithDetails = [
    // Property A: 3 units with scores 95, 88, 82
    {
        unit: { id: 'unit-a1', unit_number: 'A101', rent: 1300, available_from: '2025-10-15' },
        floorPlan: { id: 'fp-a', name: '2x2', beds: 2, baths: 2.0, sqft: 1000, starting_at: 1300, market_rent: 1400 },
        property: { id: 'prop-a', name: 'Property A', city: 'North Austin', commission_pct: 3.5, is_pumi: false }
    },
    {
        unit: { id: 'unit-a2', unit_number: 'A102', rent: 1350, available_from: '2025-10-15' },
        floorPlan: { id: 'fp-a', name: '2x2', beds: 2, baths: 2.0, sqft: 1000, starting_at: 1300, market_rent: 1400 },
        property: { id: 'prop-a', name: 'Property A', city: 'North Austin', commission_pct: 3.5, is_pumi: false }
    },
    {
        unit: { id: 'unit-a3', unit_number: 'A103', rent: 1400, available_from: '2025-10-15' },
        floorPlan: { id: 'fp-a', name: '2x2', beds: 2, baths: 2.0, sqft: 1000, starting_at: 1300, market_rent: 1400 },
        property: { id: 'prop-a', name: 'Property A', city: 'North Austin', commission_pct: 3.5, is_pumi: false }
    },
    // Property B: 2 units with scores 90, 75
    {
        unit: { id: 'unit-b1', unit_number: 'B101', rent: 1320, available_from: '2025-10-15' },
        floorPlan: { id: 'fp-b', name: '2x2', beds: 2, baths: 2.0, sqft: 1050, starting_at: 1320, market_rent: 1420 },
        property: { id: 'prop-b', name: 'Property B', city: 'North Austin', commission_pct: 3.0, is_pumi: false }
    },
    {
        unit: { id: 'unit-b2', unit_number: 'B102', rent: 1500, available_from: '2025-10-15' },
        floorPlan: { id: 'fp-b', name: '2x2', beds: 2, baths: 2.0, sqft: 1050, starting_at: 1320, market_rent: 1420 },
        property: { id: 'prop-b', name: 'Property B', city: 'North Austin', commission_pct: 3.0, is_pumi: false }
    },
    // Property C: 1 unit with score 85
    {
        unit: { id: 'unit-c1', unit_number: 'C101', rent: 1330, available_from: '2025-10-15' },
        floorPlan: { id: 'fp-c', name: '2x2', beds: 2, baths: 2.0, sqft: 1020, starting_at: 1330, market_rent: 1430 },
        property: { id: 'prop-c', name: 'Property C', city: 'North Austin', commission_pct: 2.5, is_pumi: false }
    }
];

const matches = getSmartMatches(testLead, unitsWithDetails, 10);

console.log('Total units tested:', unitsWithDetails.length);
console.log('Total properties returned:', matches.length);
console.log('Expected: 3 properties (one unit per property)');
console.log('✅ PASS:', matches.length === 3 ? 'YES' : 'NO');

// Verify each property appears only once
const propertyIds = matches.map(m => m.property.id);
const uniquePropertyIds = new Set(propertyIds);
console.log('Unique properties:', uniquePropertyIds.size);
console.log('✅ PASS (unique properties):', uniquePropertyIds.size === matches.length ? 'YES' : 'NO');

// Verify results are sorted by score (highest first)
const scores = matches.map(m => m.matchScore.totalScore);
const sortedScores = [...scores].sort((a, b) => b - a);
const isSorted = JSON.stringify(scores) === JSON.stringify(sortedScores);
console.log('Scores:', scores);
console.log('✅ PASS (sorted by score):', isSorted ? 'YES' : 'NO');

console.log('---');
console.log('🎉 All tests complete!');

// Export for manual testing
export const testData = {
    testLead,
    perfectMatchUnit,
    perfectMatchFloorPlan,
    perfectMatchProperty,
    goodMatchUnit,
    goodMatchFloorPlan,
    goodMatchProperty,
    partialMatchUnit,
    partialMatchFloorPlan,
    partialMatchProperty,
    unitsWithDetails
};
