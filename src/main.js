/**
 * Main Application Entry Point
 * This is the new modular entry point for the TRE CRM application
 */

// Import the main application
import './app.js';

// Import all feature modules
import './features/leads/leads.js';
import './features/agents/agents.js';
import './features/listings/listings.js';
import './features/admin/admin.js';

// Import all component modules
import './components/modals.js';
import './components/navigation.js';

console.log('🚀 TRE CRM: All modules loaded successfully');
