/**
 * Super simple test endpoint - no dependencies
 */

async function handler(req, res) {
	try {
		return res.status(200).json({
			success: true,
			message: 'Simple test endpoint works!',
			timestamp: new Date().toISOString(),
			nodeVersion: process.version,
			platform: process.platform,
			env: process.env.VERCEL ? 'Vercel' : 'Local'
		});
	} catch (error) {
		return res.status(500).json({
			error: error.message,
			stack: error.stack
		});
	}
}

module.exports = handler;

