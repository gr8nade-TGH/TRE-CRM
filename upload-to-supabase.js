/**
 * Upload all necessary files to Supabase Storage
 * This script uploads the entire app to the 'app' bucket
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const config = require('./supabase-config.js');

// Initialize Supabase client with service role key (needed for storage uploads)
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

const BUCKET_NAME = 'app';

// Files to upload (relative to project root)
const FILES_TO_UPLOAD = [
	// Main app files
	'index.html',
	'landing.html',
	'script.js',
	'styles.css',
	'supabase-client.js',
	'auth.js',
	'auth-styles.css',
	
	// Images
	'images/fire-tre-icon.svg',
	'images/tre_logo_black_bg.png',
	
	// Source files
	'src/api/supabase-api.js',
	'src/state/app-state.js',
	'src/utils/helpers.js'
];

async function uploadFile(localPath, storagePath) {
	try {
		// Read file
		const fileBuffer = fs.readFileSync(localPath);
		
		// Determine content type
		const ext = path.extname(localPath).toLowerCase();
		const contentTypeMap = {
			'.html': 'text/html',
			'.js': 'application/javascript',
			'.css': 'text/css',
			'.svg': 'image/svg+xml',
			'.png': 'image/png',
			'.jpg': 'image/jpeg',
			'.jpeg': 'image/jpeg'
		};
		const contentType = contentTypeMap[ext] || 'application/octet-stream';
		
		console.log(`📤 Uploading ${storagePath}...`);
		
		// Upload to Supabase Storage
		const { data, error } = await supabase.storage
			.from(BUCKET_NAME)
			.upload(storagePath, fileBuffer, {
				contentType: contentType,
				cacheControl: '3600',
				upsert: true // Overwrite if exists
			});
		
		if (error) {
			console.error(`❌ Error uploading ${storagePath}:`, error.message);
			return false;
		}
		
		console.log(`✅ Uploaded ${storagePath}`);
		return true;
	} catch (err) {
		console.error(`❌ Error reading/uploading ${localPath}:`, err.message);
		return false;
	}
}

async function main() {
	console.log('🚀 Starting upload to Supabase Storage...\n');
	
	let successCount = 0;
	let failCount = 0;
	
	for (const filePath of FILES_TO_UPLOAD) {
		const localPath = path.join(__dirname, filePath);
		
		// Check if file exists
		if (!fs.existsSync(localPath)) {
			console.log(`⚠️  Skipping ${filePath} (file not found)`);
			continue;
		}
		
		// Upload with same path structure
		const success = await uploadFile(localPath, filePath);
		
		if (success) {
			successCount++;
		} else {
			failCount++;
		}
	}
	
	console.log('\n📊 Upload Summary:');
	console.log(`✅ Successful: ${successCount}`);
	console.log(`❌ Failed: ${failCount}`);
	
	if (successCount > 0) {
		console.log('\n🎉 Your app is now live at:');
		console.log(`https://${config.PROJECT_REF}.supabase.co/storage/v1/object/public/app/index.html`);
		console.log('\n📄 Landing page:');
		console.log(`https://${config.PROJECT_REF}.supabase.co/storage/v1/object/public/app/landing.html?agent=alex-agent`);
	}
}

main().catch(console.error);

