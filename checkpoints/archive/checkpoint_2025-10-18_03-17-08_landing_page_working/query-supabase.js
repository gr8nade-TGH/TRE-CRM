/**
 * Interactive Supabase Query Tool
 * Run queries against your Supabase database from the command line
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('./supabase-config.js');
const readline = require('readline');

// Initialize Supabase client
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

// Create readline interface for interactive queries
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

// Helper function to format results as a table
function formatTable(data) {
	if (!data || data.length === 0) {
		return 'No results found.';
	}
	
	console.table(data);
}

// Common query shortcuts
const SHORTCUTS = {
	'agents': async () => {
		console.log('\n📋 Fetching all agents...\n');
		const { data, error } = await supabase
			.from('users')
			.select('*')
			.order('name');

		if (error) {
			console.error('❌ Error:', error.message);
			return;
		}

		// Filter agents in JavaScript to avoid enum issues
		const agents = data ? data.filter(u => {
			const roleStr = String(u.role).toLowerCase();
			return roleStr === 'agent' || roleStr.includes('agent');
		}) : [];

		formatTable(agents);
	},
	
	'leads': async () => {
		console.log('\n📋 Fetching all leads...\n');
		const { data, error } = await supabase
			.from('leads')
			.select('*')
			.order('created_at', { ascending: false })
			.limit(50);

		if (error) {
			console.error('❌ Error:', error.message);
			return;
		}

		formatTable(data);
	},
	
	'users': async () => {
		console.log('\n📋 Fetching all users...\n');
		const { data, error } = await supabase
			.from('users')
			.select('*')
			.order('name');
		
		if (error) {
			console.error('❌ Error:', error.message);
			return;
		}
		
		formatTable(data);
	},
	
	'properties': async () => {
		console.log('\n📋 Fetching all properties...\n');
		const { data, error } = await supabase
			.from('properties')
			.select('*')
			.order('name')
			.limit(50);
		
		if (error) {
			console.error('❌ Error:', error.message);
			return;
		}
		
		formatTable(data);
	},
	
	'specials': async () => {
		console.log('\n📋 Fetching all specials...\n');
		const { data, error } = await supabase
			.from('specials')
			.select('*')
			.order('created_at', { ascending: false })
			.limit(50);
		
		if (error) {
			console.error('❌ Error:', error.message);
			return;
		}
		
		formatTable(data);
	},
	
	'tables': async () => {
		console.log('\n📋 Available tables:\n');
		console.log('  • users');
		console.log('  • leads');
		console.log('  • properties');
		console.log('  • specials');
		console.log('  • notes');
		console.log('  • showcases');
		console.log('  • showcase_properties');
	},
	
	'help': () => {
		console.log('\n📖 Available Commands:\n');
		console.log('Shortcuts:');
		console.log('  agents       - List all agents');
		console.log('  leads        - List recent leads');
		console.log('  users        - List all users');
		console.log('  properties   - List properties');
		console.log('  specials     - List specials');
		console.log('  tables       - Show available tables');
		console.log('  help         - Show this help');
		console.log('  exit         - Exit the tool');
		console.log('\nCustom Queries:');
		console.log('  sql: <query> - Run raw SQL query');
		console.log('  Example: sql: SELECT * FROM users WHERE role = \'agent\'');
		console.log('\nTable Queries:');
		console.log('  table: <name> - Query a specific table');
		console.log('  Example: table: leads');
		console.log('\n');
	}
};

// Execute raw SQL query
async function executeSQL(query) {
	console.log(`\n🔍 Executing: ${query}\n`);
	
	const { data, error } = await supabase.rpc('exec_sql', { query_text: query });
	
	if (error) {
		console.error('❌ Error:', error.message);
		return;
	}
	
	formatTable(data);
}

// Query a specific table
async function queryTable(tableName) {
	console.log(`\n📋 Fetching from ${tableName}...\n`);
	
	const { data, error } = await supabase
		.from(tableName)
		.select('*')
		.limit(50);
	
	if (error) {
		console.error('❌ Error:', error.message);
		return;
	}
	
	formatTable(data);
}

// Process user input
async function processCommand(input) {
	const trimmed = input.trim().toLowerCase();
	
	// Check for exit
	if (trimmed === 'exit' || trimmed === 'quit') {
		console.log('\n👋 Goodbye!\n');
		rl.close();
		process.exit(0);
	}
	
	// Check for shortcuts
	if (SHORTCUTS[trimmed]) {
		await SHORTCUTS[trimmed]();
		return;
	}
	
	// Check for SQL query
	if (trimmed.startsWith('sql:')) {
		const query = input.substring(4).trim();
		await executeSQL(query);
		return;
	}
	
	// Check for table query
	if (trimmed.startsWith('table:')) {
		const tableName = input.substring(6).trim();
		await queryTable(tableName);
		return;
	}
	
	// Unknown command
	console.log('❌ Unknown command. Type "help" for available commands.');
}

// Main interactive loop
function startInteractive() {
	console.log('\n🚀 Supabase Query Tool');
	console.log('Type "help" for available commands, "exit" to quit\n');
	
	const prompt = () => {
		rl.question('supabase> ', async (input) => {
			if (input.trim()) {
				await processCommand(input);
			}
			prompt();
		});
	};
	
	prompt();
}

// Check if running with arguments (non-interactive mode)
const args = process.argv.slice(2);

if (args.length > 0) {
	// Non-interactive mode - run command and exit
	const command = args.join(' ');
	processCommand(command).then(() => {
		process.exit(0);
	});
} else {
	// Interactive mode
	startInteractive();
}

