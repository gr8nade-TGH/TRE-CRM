// Run migration 035 to fix San Antonio property community names
import pg from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Client } = pg;

// Read Supabase config
const configPath = join(__dirname, 'supabase-config.js');
const configContent = fs.readFileSync(configPath, 'utf8');

// Extract database URL from config
const urlMatch = configContent.match(/url:\s*['"]([^'"]+)['"]/);
const anonKeyMatch = configContent.match(/anonKey:\s*['"]([^'"]+)['"]/);

if (!urlMatch || !anonKeyMatch) {
    console.error('❌ Could not find Supabase URL or anon key in supabase-config.js');
    process.exit(1);
}

const supabaseUrl = urlMatch[1];
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

// Construct direct database URL
const dbUrl = `postgresql://postgres.${projectRef}:YOUR_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;

console.log('🔧 Migration 035: Fix San Antonio Property Community Names');
console.log('');
console.log('⚠️  IMPORTANT: You need to set your database password!');
console.log('');
console.log('Option 1: Run this migration manually in Supabase SQL Editor');
console.log('   1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
console.log('   2. Copy the contents of migrations/035_fix_san_antonio_community_names.sql');
console.log('   3. Paste and click "Run"');
console.log('');
console.log('Option 2: Use the automated migration runner');
console.log('   1. Set your database password in this file (line 26)');
console.log('   2. Run: node run-migration-035.js');
console.log('');

// If you want to run automatically, uncomment and set your password:
// const DB_PASSWORD = 'your_password_here';
// 
// if (DB_PASSWORD && DB_PASSWORD !== 'your_password_here') {
//     const client = new Client({
//         connectionString: dbUrl.replace('YOUR_PASSWORD', DB_PASSWORD)
//     });
// 
//     try {
//         await client.connect();
//         console.log('✅ Connected to database');
// 
//         const migrationSQL = fs.readFileSync(join(__dirname, 'migrations', '035_fix_san_antonio_community_names.sql'), 'utf8');
//         
//         console.log('🔄 Running migration...');
//         await client.query(migrationSQL);
//         
//         console.log('✅ Migration completed successfully!');
//         
//         // Verify
//         const result = await client.query(`
//             SELECT COUNT(*) as count 
//             FROM properties 
//             WHERE market = 'San Antonio' AND community_name IS NOT NULL
//         `);
//         
//         console.log(`✅ Found ${result.rows[0].count} San Antonio properties with community names`);
//         
//     } catch (error) {
//         console.error('❌ Migration failed:', error.message);
//     } finally {
//         await client.end();
//     }
// }

