/**
 * Vercel Speed Insights Initialization
 * Tracks real user performance metrics
 */

import { injectSpeedInsights } from '@vercel/speed-insights';

/**
 * Initialize Vercel Speed Insights
 * Call this once on app load (client-side only)
 */
export function initSpeedInsights() {
	// Only run in browser (not during SSR)
	if (typeof window !== 'undefined') {
		injectSpeedInsights();
		console.log('✅ Vercel Speed Insights initialized');
	}
}

