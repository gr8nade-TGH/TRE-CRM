/**
 * Automated Migration Runner
 * Executes SQL migrations directly on Supabase using PostgreSQL client
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const config = require('./supabase-config');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const LOGS_DIR = path.join(__dirname, 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR);
}

/**
 * Get PostgreSQL connection string
 */
function getConnectionString() {
    // Supabase connection string format:
    // postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres

    const password = 'Temp1234!';
    const projectRef = config.PROJECT_REF;

    // Use the pooler connection (Transaction mode, port 6543)
    const connectionString = `postgresql://postgres.${projectRef}:${password}@aws-1-us-east-2.pooler.supabase.com:6543/postgres`;

    return connectionString;
}

/**
 * Execute migration using direct SQL
 */
async function runMigration(migrationFile, connectionString) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(LOGS_DIR, `migration_${timestamp}.log`);
    
    const log = [];
    const logLine = (line) => {
        console.log(line);
        log.push(line);
    };

    logLine('='.repeat(80));
    logLine(`🚀 Running Migration: ${migrationFile}`);
    logLine('='.repeat(80));
    logLine('');

    try {
        // Read migration file
        const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }

        const sql = fs.readFileSync(migrationPath, 'utf8');
        logLine(`📄 Migration file: ${migrationFile}`);
        logLine(`📏 SQL length: ${sql.length} characters`);
        logLine('');

        if (!connectionString) {
            logLine('❌ No database connection string available');
            logLine('');
            logLine('📋 MANUAL MIGRATION REQUIRED:');
            logLine('');
            logLine('1. Go to: https://supabase.com/dashboard/project/mevirooooypfjbsrmzrk/sql/new');
            logLine(`2. Copy SQL from: ${migrationPath}`);
            logLine('3. Paste and click "Run"');
            logLine('');
            logLine('OR use: https://tre-crm.vercel.app/run-migration.html');
            logLine('');
            fs.writeFileSync(logFile, log.join('\n'));
            return { success: false, manual: true, logFile };
        }

        // Connect to database
        logLine('🔌 Connecting to Supabase...');
        const client = new Client({ connectionString });
        await client.connect();
        logLine('✅ Connected!');
        logLine('');

        // Execute SQL
        logLine('⚙️  Executing migration...');
        logLine('');
        
        const result = await client.query(sql);
        
        logLine('✅ Migration executed successfully!');
        logLine('');
        logLine(`📊 Result: ${JSON.stringify(result.rowCount)} rows affected`);
        logLine('');

        // Disconnect
        await client.end();
        logLine('🔌 Disconnected from database');
        logLine('');

        // Save log
        fs.writeFileSync(logFile, log.join('\n'));
        logLine(`💾 Log saved: ${logFile}`);
        logLine('');
        logLine('='.repeat(80));
        logLine('✅ Migration completed successfully!');
        logLine('='.repeat(80));
        logLine('');

        return { success: true, logFile };

    } catch (error) {
        logLine('');
        logLine(`❌ Migration failed: ${error.message}`);
        logLine('');
        logLine('Stack trace:');
        logLine(error.stack);
        logLine('');
        
        fs.writeFileSync(logFile, log.join('\n'));
        logLine(`💾 Error log saved: ${logFile}`);
        logLine('');
        
        throw error;
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('='.repeat(80));
    console.log('🚀 TRE CRM - Automated Migration Runner');
    console.log('='.repeat(80));
    console.log('');

    const args = process.argv.slice(2);
    const migrationFile = args[0] || '001_create_missing_tables.sql';

    console.log(`📄 Migration: ${migrationFile}`);
    console.log('');

    // Get connection string
    const connectionString = getConnectionString();

    // Run migration
    const result = await runMigration(migrationFile, connectionString);

    if (result.manual) {
        console.log('⚠️  Manual migration required - see instructions above');
        process.exit(0);
    }

    if (result.success) {
        console.log('💡 Next step: Verify tables were created');
        console.log('   Run: node check-supabase-schema.js');
        console.log('');
        process.exit(0);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('');
        console.error('❌ Fatal error:', error.message);
        console.error('');
        process.exit(1);
    });
}

module.exports = { runMigration };

