/**
 * Run Migration 031: Fix specials RLS policies
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const SUPABASE_URL = 'https://mevirooooypfjbsrmzrk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldmlyb29vb3lwZmpic3Jtenr rrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyODk0NTU5NCwiZXhwIjoyMDQ0NTIxNTk0fQ.Zxqn5vYGZqYqYqYqYqYqYqYqYqYqYqYqYqYqYqY';

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function runMigration() {
    try {
        console.log('🚀 Running migration 031: Fix specials RLS policies...');
        
        // Read the migration file
        const migrationPath = path.join(__dirname, '..', 'migrations', '031_fix_specials_rls.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        // Split into individual statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        console.log(`📝 Found ${statements.length} SQL statements to execute`);
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i] + ';';
            console.log(`\n${i + 1}. Executing: ${statement.substring(0, 100)}...`);
            
            const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });
            
            if (error) {
                console.error(`❌ Error executing statement ${i + 1}:`, error);
                throw error;
            }
            
            console.log(`✅ Statement ${i + 1} executed successfully`);
        }
        
        console.log('\n✅ Migration 031 completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();

