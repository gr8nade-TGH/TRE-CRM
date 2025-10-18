# Supabase Query Guide

## 🚀 Quick Start

You can now query your Supabase database directly from the command line without using the SQL editor!

## 📋 Available Commands

### Interactive Mode
```bash
node query-supabase.js
```
This starts an interactive session where you can run multiple queries.

### One-off Commands
```bash
node query-supabase.js <command>
```
Run a single command and exit.

---

## 🔥 Common Shortcuts

### View All Agents
```bash
node query-supabase.js agents
```

### View All Leads
```bash
node query-supabase.js leads
```

### View All Users
```bash
node query-supabase.js users
```

### View All Properties
```bash
node query-supabase.js properties
```

### View All Specials
```bash
node query-supabase.js specials
```

### List Available Tables
```bash
node query-supabase.js tables
```

### Show Help
```bash
node query-supabase.js help
```

---

## 🔧 Advanced Queries

### Query a Specific Table
```bash
node query-supabase.js "table: leads"
node query-supabase.js "table: properties"
```

### Run Raw SQL (if you enable the RPC function)
```bash
node query-supabase.js "sql: SELECT * FROM users WHERE role = 'AGENT'"
```

---

## 💻 Using in Your Own Scripts

You can also import the helper functions in your own Node.js scripts:

```javascript
const {
  getAllAgents,
  getAllLeads,
  createLead,
  updateLead,
  deleteLead
} = require('./supabase-helpers.js');

// Example: Get all agents
async function example() {
  const agents = await getAllAgents();
  console.log('Agents:', agents);
  
  // Create a new lead
  const newLead = await createLead({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '555-1234',
    assigned_agent_id: agents[0].id
  });
  
  console.log('Created lead:', newLead);
}

example();
```

---

## 📦 Available Helper Functions

### Agents
- `getAllAgents()` - Get all agents
- `getAgentByEmail(email)` - Get agent by email
- `getAgentById(id)` - Get agent by ID
- `createAgent(agentData)` - Create new agent

### Leads
- `getAllLeads(limit)` - Get all leads (default limit: 100)
- `getLeadsByAgent(agentId)` - Get leads for specific agent
- `createLead(leadData)` - Create new lead
- `updateLead(leadId, updates)` - Update a lead
- `deleteLead(leadId)` - Delete a lead

### Properties
- `getAllProperties(limit)` - Get all properties
- `getPropertyById(id)` - Get property by ID
- `createProperty(propertyData)` - Create new property
- `updateProperty(propertyId, updates)` - Update a property
- `deleteProperty(propertyId)` - Delete a property

### Users
- `getAllUsers()` - Get all users
- `getUserByEmail(email)` - Get user by email

---

## 🎯 Examples

### Check if landing page form submissions are working
```bash
node query-supabase.js leads
```

### See all agents and their info
```bash
node query-supabase.js agents
```

### View all properties
```bash
node query-supabase.js properties
```

---

## 🔐 Security Note

The query tool uses your **SERVICE_ROLE_KEY** which has full admin access to your database. Keep this secure and never commit it to Git!

---

## 📝 Your Production URLs

**Main App:**
```
https://mevirooooypfjbsrmzrk.supabase.co/storage/v1/object/public/app/index.html
```

**Landing Page (example):**
```
https://mevirooooypfjbsrmzrk.supabase.co/storage/v1/object/public/app/landing.html?agent=alex-agent
```

Replace `alex-agent` with the actual agent slug (name in lowercase with dashes).

---

## 🐛 Troubleshooting

### "Cannot find module" error
Run: `npm install @supabase/supabase-js`

### "Invalid enum value" error
The query tool automatically handles enum issues by filtering in JavaScript instead of SQL.

### No results showing
Make sure you have data in your tables. Check the Supabase dashboard to verify.

