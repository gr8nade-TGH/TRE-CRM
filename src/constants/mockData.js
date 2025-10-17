/**
 * Mock Data for Development and Testing
 * This file contains all mock data used throughout the application
 */

export const mockLeads = [
    {
        id: 'lead_1',
        name: 'John Smith',
        email: 'john@example.com',
        phone: '555-0101',
        submitted_at: '2024-01-15T10:30:00Z',
        status: 'new',
        agent_id: 'agent_1',
        preferences: {
            bedrooms: 2,
            bathrooms: 2,
            rent_min: 1500,
            rent_max: 2500,
            location: 'Downtown'
        }
    },
    {
        id: 'lead_2',
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        phone: '555-0102',
        submitted_at: '2024-01-14T14:20:00Z',
        status: 'contacted',
        agent_id: 'agent_2',
        preferences: {
            bedrooms: 1,
            bathrooms: 1,
            rent_min: 1200,
            rent_max: 1800,
            location: 'Midtown'
        }
    }
];

export const mockAgents = [
    {
        id: 'agent_1',
        name: 'Alex Agent',
        email: 'alex@example.com',
        phone: '555-0101',
        slug: 'alex-agent',
        role: 'agent',
        specialties: ['Residential', 'Commercial'],
        hire_date: '2024-01-01',
        license_number: 'RE123456',
        notes: 'Top performer in Q1'
    },
    {
        id: 'agent_2',
        name: 'Maria Rodriguez',
        email: 'maria@example.com',
        phone: '555-0102',
        slug: 'maria-rodriguez',
        role: 'agent',
        specialties: ['Luxury', 'Residential'],
        hire_date: '2024-01-15',
        license_number: 'RE789012',
        notes: 'Specializes in luxury properties'
    }
];

export const mockProperties = [
    {
        id: 'prop_1',
        address: '123 Main St',
        city: 'Downtown',
        state: 'CA',
        zip: '90210',
        bedrooms: 2,
        bathrooms: 2,
        rent: 2200,
        status: 'available',
        agent_id: 'agent_1'
    },
    {
        id: 'prop_2',
        address: '456 Oak Ave',
        city: 'Midtown',
        state: 'CA',
        zip: '90211',
        bedrooms: 1,
        bathrooms: 1,
        rent: 1500,
        status: 'available',
        agent_id: 'agent_2'
    }
];

export const mockSpecials = [
    {
        id: 'special_1',
        title: 'First Month Free',
        description: 'Get your first month rent-free on select properties',
        valid_from: '2024-01-01',
        valid_to: '2024-03-31',
        created_by: 'agent_1',
        status: 'active'
    }
];

export const mockBugs = [
    {
        id: 'bug_1',
        title: 'Login button not working',
        description: 'Users cannot log in on mobile devices',
        status: 'open',
        priority: 'high',
        reported_by: 'agent_1',
        created_at: '2024-01-15T10:00:00Z'
    }
];

export const mockAuditLog = [
    {
        id: 'audit_1',
        action: 'user_created',
        performed_by: 'manager_1',
        performed_by_name: 'John Manager',
        timestamp: '2024-01-15T10:30:00Z',
        details: 'Created new agent user: alex@example.com'
    },
    {
        id: 'audit_2',
        action: 'lead_updated',
        performed_by: 'agent_1',
        performed_by_name: 'Alex Agent',
        timestamp: '2024-01-14T16:30:00Z',
        details: 'Email updated to alex@trecrm.com'
    }
];
