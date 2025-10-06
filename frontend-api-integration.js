// Frontend API Integration for TRE CRM
// Replace the mock API in script.js with this real API integration

const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://your-api-domain.com/api' 
  : 'http://localhost:3001/api';

// Helper function to get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

// Helper function to handle API responses
async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

// Updated API object to replace the mock API in script.js
const api = {
  // Authentication
  async login(email, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await handleResponse(response);
    localStorage.setItem('authToken', data.token);
    return data;
  },

  async logout() {
    localStorage.removeItem('authToken');
  },

  async getCurrentUser() {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Leads API
  async getLeads({ role, agentId, search, sortKey, sortDir, page, pageSize, filters = {} }) {
    const params = new URLSearchParams({
      role,
      agentId,
      search,
      sortKey,
      sortDir,
      page,
      pageSize,
      ...filters
    });

    const response = await fetch(`${API_BASE}/leads?${params}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getLead(id) {
    const response = await fetch(`${API_BASE}/leads/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async assignLead(id, agent_id) {
    const response = await fetch(`${API_BASE}/leads/${id}/assign`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ agent_id })
    });
    return handleResponse(response);
  },

  // Properties API
  async getProperties(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE}/properties?${params}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getProperty(id) {
    const response = await fetch(`${API_BASE}/properties/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Documents API
  async getLeadDocumentStatus(leadId) {
    const response = await fetch(`${API_BASE}/documents/leads/${leadId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async updateDocumentStep(leadId, stepId, status, attachments = []) {
    const response = await fetch(`${API_BASE}/documents/leads/${leadId}/steps/${stepId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, attachments })
    });
    return handleResponse(response);
  },

  async uploadAttachment(leadId, stepId, file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('stepId', stepId);

    const response = await fetch(`${API_BASE}/documents/leads/${leadId}/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: formData
    });
    return handleResponse(response);
  },

  async getDocumentHistory() {
    const response = await fetch(`${API_BASE}/documents/history`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Showcases API
  async createShowcase({ lead_id, agent_id, listing_ids, message }) {
    const response = await fetch(`${API_BASE}/showcases`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ lead_id, agent_id, listing_ids, message })
    });
    return handleResponse(response);
  },

  async getPublicShowcase(slug) {
    const response = await fetch(`${API_BASE}/showcases/${slug}`);
    return handleResponse(response);
  },

  // Email API (mock for now)
  async sendEmail({ to, subject, html, showcase_id }) {
    // This would integrate with your email service (SendGrid, AWS SES, etc.)
    console.log('Sending email:', { to, subject, showcase_id });
    return { ok: true };
  },

  // Health check
  async healthCheck() {
    const response = await fetch(`${API_BASE}/health`);
    return handleResponse(response);
  }
};

// Error handling wrapper
function withErrorHandling(apiFunction) {
  return async (...args) => {
    try {
      return await apiFunction(...args);
    } catch (error) {
      console.error('API Error:', error);
      toast(error.message || 'An error occurred');
      throw error;
    }
  };
}

// Wrap all API functions with error handling
Object.keys(api).forEach(key => {
  if (typeof api[key] === 'function') {
    api[key] = withErrorHandling(api[key]);
  }
});

// Export for use in your main script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else {
  window.api = api;
}
