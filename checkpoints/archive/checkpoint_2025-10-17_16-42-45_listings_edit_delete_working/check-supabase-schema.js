/**
 * Supabase Schema Checker
 * Queries Supabase to check existing tables and their structures
 */

const SUPABASE_URL = 'https://mevirooooypfjbsrmzrk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldmlyb29vb3lwZmpic3JtenJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MTU1MDgsImV4cCI6MjA3NTI5MTUwOH0.FGez_nPoWZA5NKbJP54e5JsgJILrWB7rBUD4vx6iZZA';

// Tables we expect to exist
const EXPECTED_TABLES = [
    'leads',
    'lead_notes', 
    'agents',
    'users',
    'properties',
    'listings',
    'specials',
    'bugs',
    'documents'
];

async function checkTable(tableName) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=1`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            
            // Get count
            const countResponse = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=count`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Prefer': 'count=exact'
                }
            });
            
            const countHeader = countResponse.headers.get('content-range');
            const count = countHeader ? parseInt(countHeader.split('/')[1]) : 0;
            
            // Get columns from first row
            const columns = data.length > 0 ? Object.keys(data[0]) : [];
            
            return {
                exists: true,
                count,
                columns,
                sample: data[0] || null
            };
        } else {
            return {
                exists: false,
                error: `HTTP ${response.status}: ${response.statusText}`
            };
        }
    } catch (error) {
        return {
            exists: false,
            error: error.message
        };
    }
}

async function checkAllTables() {
    console.log('🔍 Checking Supabase Database Schema...\n');
    console.log(`📍 Project: ${SUPABASE_URL}\n`);
    console.log('=' .repeat(80));
    
    const results = {};
    
    for (const table of EXPECTED_TABLES) {
        process.stdout.write(`Checking ${table}...`);
        const result = await checkTable(table);
        results[table] = result;
        
        if (result.exists) {
            console.log(` ✅ EXISTS (${result.count} rows, ${result.columns.length} columns)`);
        } else {
            console.log(` ❌ NOT FOUND (${result.error})`);
        }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 SUMMARY:\n');
    
    const existing = Object.entries(results).filter(([_, r]) => r.exists);
    const missing = Object.entries(results).filter(([_, r]) => !r.exists);
    
    console.log(`✅ Existing tables: ${existing.length}/${EXPECTED_TABLES.length}`);
    console.log(`❌ Missing tables: ${missing.length}/${EXPECTED_TABLES.length}\n`);
    
    if (existing.length > 0) {
        console.log('📋 EXISTING TABLES:\n');
        existing.forEach(([table, result]) => {
            console.log(`\n  ${table.toUpperCase()}`);
            console.log(`  ${'─'.repeat(60)}`);
            console.log(`  Rows: ${result.count}`);
            console.log(`  Columns (${result.columns.length}): ${result.columns.join(', ')}`);
            
            if (result.sample) {
                console.log(`  Sample data:`);
                console.log(`  ${JSON.stringify(result.sample, null, 4).split('\n').join('\n  ')}`);
            }
        });
    }
    
    if (missing.length > 0) {
        console.log('\n\n❌ MISSING TABLES:\n');
        missing.forEach(([table, result]) => {
            console.log(`  • ${table} - ${result.error}`);
        });
    }
    
    console.log('\n' + '='.repeat(80));
    
    // Return results for further processing
    return results;
}

// Run the check
checkAllTables()
    .then(results => {
        console.log('\n✅ Schema check complete!\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Error checking schema:', error);
        process.exit(1);
    });

