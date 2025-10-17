/**
 * Simple Migration Runner
 * Executes the create-missing-tables migration directly
 */

const fs = require('fs');
const path = require('path');
const config = require('./supabase-config');

const MIGRATION_FILE = path.join(__dirname, 'migrations', '001_create_missing_tables.sql');

console.log('='.repeat(80));
console.log('🚀 TRE CRM - Database Migration Runner');
console.log('='.repeat(80));
console.log('');
console.log(`📍 Project: ${config.SUPABASE_URL}`);
console.log(`📄 Migration: 001_create_missing_tables.sql`);
console.log('');
console.log('This will create:');
console.log('  • lead_notes table');
console.log('  • specials table');
console.log('  • documents table');
console.log('  • RLS policies for agent/manager access control');
console.log('  • Triggers and indexes');
console.log('');
console.log('='.repeat(80));
console.log('');

// Read the SQL file
const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');

console.log('📋 SQL Preview:');
console.log('─'.repeat(80));
console.log(sql.substring(0, 500) + '...\n');
console.log('─'.repeat(80));
console.log('');
console.log(`📏 Total SQL length: ${sql.length} characters`);
console.log('');
console.log('='.repeat(80));
console.log('');
console.log('⚠️  IMPORTANT: Supabase REST API cannot execute DDL statements');
console.log('');
console.log('📋 PLEASE RUN THIS MIGRATION MANUALLY:');
console.log('');
console.log('1. Go to: https://supabase.com/dashboard/project/mevirooooypfjbsrmzrk/sql/new');
console.log('2. Copy the SQL from: migrations/001_create_missing_tables.sql');
console.log('3. Paste into SQL Editor');
console.log('4. Click "Run"');
console.log('');
console.log('OR use the helper page:');
console.log('  https://tre-crm.vercel.app/run-migration.html');
console.log('');
console.log('='.repeat(80));
console.log('');
console.log('💡 TIP: After running the migration, verify with:');
console.log('   node check-supabase-schema.js');
console.log('');

