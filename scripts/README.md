# 🛠️ TRE CRM Utility Scripts

This directory contains utility scripts for database migrations, setup, testing, and maintenance.

---

## 📂 Directory Structure

```
scripts/
├── migration/         # Database migration scripts
├── setup/             # Initial setup and data population scripts
├── sql/               # One-time SQL scripts
├── testing/           # Testing and debugging utilities
└── README.md          # This file
```

---

## 🗄️ Migration Scripts

**Location:** `scripts/migration/`

Scripts for running database migrations safely and efficiently.

### Files:

- **db-migration-runner.js** - Main migration runner with logging
- **run-migration-automated.js** - Automated migration execution
- **run-migration-now.js** - Quick migration runner
- **run-migration.js** - Standard migration runner
- **run-migration.html** - Web-based migration interface

### Usage:

```bash
# Run migrations using Node.js
node scripts/migration/run-migration-now.js

# Or use the web interface
# Open scripts/migration/run-migration.html in browser
```

### Important Notes:

- Always backup your database before running migrations
- Migrations are numbered sequentially (001, 002, 003, etc.)
- Check `migrations/` directory for available migrations
- See `docs/guides/RUN_MIGRATION_INSTRUCTIONS.md` for detailed instructions

---

## ⚙️ Setup Scripts

**Location:** `scripts/setup/`

Scripts for initial setup and data population.

### Files:

- **create-auth-user.js** - Create authentication users in Supabase
- **populate-specials.js** - Populate specials/promotions data
- **upload-to-supabase.js** - Upload data to Supabase

### Usage:

```bash
# Create a new auth user
node scripts/setup/create-auth-user.js

# Populate specials data
node scripts/setup/populate-specials.js

# Upload data to Supabase
node scripts/setup/upload-to-supabase.js
```

### Prerequisites:

- Supabase project set up
- Environment variables configured (SUPABASE_URL, SUPABASE_KEY)
- Node.js installed

---

## 📝 SQL Scripts

**Location:** `scripts/sql/`

One-time SQL scripts for database maintenance and updates.

### Files:

- **ADD_SAMPLE_ACTIVITIES.sql** - Add sample activity data for testing
- **check-constraints.sql** - Check database constraints
- **create-missing-tables.sql** - Create any missing tables
- **RUN_THIS_IN_SUPABASE.sql** - Quick fixes to run in Supabase SQL editor
- **supabase-schema-updates.sql** - Schema update scripts
- **UPDATE_EXISTING_LEADS_PREFERENCES.sql** - Update lead preferences format
- **verify-migration.sql** - Verify migration success

### Usage:

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the SQL script
4. Review the script carefully
5. Execute

### ⚠️ Warning:

- These are one-time scripts - don't run repeatedly
- Always review SQL before executing
- Backup your database first
- Some scripts modify existing data

---

## 🧪 Testing Scripts

**Location:** `scripts/testing/`

Scripts for testing, debugging, and verifying functionality.

### Files:

- **check-auth-users.js** - Check authentication users
- **check-database.html** - Web-based database checker
- **check-supabase-schema.js** - Verify Supabase schema
- **query-supabase.js** - Query Supabase database
- **test-landing.html** - Test landing page functionality
- **test-modules.html** - Test modular code

### Usage:

```bash
# Check auth users
node scripts/testing/check-auth-users.js

# Check schema
node scripts/testing/check-supabase-schema.js

# Query database
node scripts/testing/query-supabase.js

# For HTML files, open in browser
```

### Testing Workflow:

1. **Before Changes:** Run tests to establish baseline
2. **After Changes:** Run tests to verify functionality
3. **Debug Issues:** Use query-supabase.js to investigate
4. **Verify Schema:** Use check-supabase-schema.js

---

## 🔧 Common Tasks

### Run a Database Migration:

```bash
node scripts/migration/run-migration-now.js
```

### Create a New User:

```bash
node scripts/setup/create-auth-user.js
```

### Check Database Schema:

```bash
node scripts/testing/check-supabase-schema.js
```

### Add Sample Data:

```sql
-- Run in Supabase SQL Editor
-- Copy from scripts/sql/ADD_SAMPLE_ACTIVITIES.sql
```

---

## 📋 Prerequisites

### For Node.js Scripts:

```bash
# Install dependencies
npm install

# Set environment variables
# Create .env file with:
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### For HTML Scripts:

- Modern web browser
- Supabase credentials configured in the HTML file

---

## 🚨 Important Notes

### Security:

- Never commit Supabase keys to Git
- Use environment variables for sensitive data
- Service role key has full database access - use carefully

### Best Practices:

- Always backup before running migrations
- Test scripts in development first
- Review SQL scripts before executing
- Keep migration numbers sequential
- Document any manual database changes

### Troubleshooting:

- Check console for error messages
- Verify Supabase credentials
- Ensure database is accessible
- Check network connectivity
- Review Supabase logs

---

## 📚 Related Documentation

- [Migration Instructions](../docs/guides/RUN_MIGRATION_INSTRUCTIONS.md)
- [Supabase Query Guide](../docs/guides/SUPABASE_QUERY_GUIDE.md)
- [Testing Guide](../docs/guides/TESTING_GUIDE.md)

---

## 🆘 Getting Help

If you encounter issues:

1. Check the error message in console
2. Review the relevant documentation
3. Verify your Supabase credentials
4. Check the Supabase dashboard for errors
5. Review recent changes in Git history

---

**Last Updated:** 2025-10-19

