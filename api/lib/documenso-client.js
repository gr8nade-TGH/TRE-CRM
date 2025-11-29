/**
 * Documenso API Client
 * 
 * Modular client for interacting with Documenso API.
 * Handles document creation, recipient management, and signing requests.
 * 
 * Documentation: https://docs.documenso.com/api
 */

const DOCUMENSO_API_BASE = 'https://api.documenso.com/v1';

/**
 * Make authenticated request to Documenso API
 */
async function documensoRequest(endpoint, options = {}) {
	const apiKey = process.env.DOCUMENSO_API_KEY;
	
	if (!apiKey) {
		throw new Error('DOCUMENSO_API_KEY environment variable is not set');
	}

	const url = `${DOCUMENSO_API_BASE}${endpoint}`;
	
	const response = await fetch(url, {
		...options,
		headers: {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			...options.headers
		}
	});

	if (!response.ok) {
		const errorText = await response.text();
		console.error('Documenso API error:', {
			status: response.status,
			statusText: response.statusText,
			body: errorText
		});
		throw new Error(`Documenso API error: ${response.status} ${response.statusText} - ${errorText}`);
	}

	return response.json();
}

/**
 * Create a new document in Documenso
 * 
 * @param {Object} params
 * @param {string} params.title - Document title
 * @param {Buffer} params.pdfBuffer - PDF file as buffer
 * @param {Array} params.recipients - Array of recipient objects
 * @param {Object} params.metadata - Optional metadata
 * @returns {Promise<Object>} Created document object
 */
export async function createDocument({ title, pdfBuffer, recipients, metadata = {} }) {
	console.log('Creating Documenso document:', { title, recipientCount: recipients.length });

	// Convert PDF buffer to base64
	const base64Pdf = pdfBuffer.toString('base64');

	const payload = {
		title,
		file: {
			name: `${title}.pdf`,
			content: base64Pdf,
			mimeType: 'application/pdf'
		},
		recipients: recipients.map((recipient, index) => ({
			email: recipient.email,
			name: recipient.name,
			role: recipient.role || 'SIGNER',
			actionAuth: recipient.actionAuth || null,
			signingOrder: index + 1
		})),
		meta: metadata
	};

	const result = await documensoRequest('/documents', {
		method: 'POST',
		body: JSON.stringify(payload)
	});

	console.log('Document created successfully:', result.id);
	return result;
}

/**
 * Get document details by ID
 * 
 * @param {string} documentId - Documenso document ID
 * @returns {Promise<Object>} Document object
 */
export async function getDocument(documentId) {
	console.log('Fetching Documenso document:', documentId);
	return documensoRequest(`/documents/${documentId}`);
}

/**
 * Get signing URL for a recipient
 * 
 * @param {string} documentId - Documenso document ID
 * @param {string} recipientId - Recipient ID
 * @returns {Promise<string>} Signing URL
 */
export async function getSigningUrl(documentId, recipientId) {
	console.log('Getting signing URL:', { documentId, recipientId });
	const result = await documensoRequest(`/documents/${documentId}/recipients/${recipientId}/signing-url`);
	return result.url;
}

/**
 * Download signed document as PDF
 * 
 * @param {string} documentId - Documenso document ID
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function downloadDocument(documentId) {
	console.log('Downloading signed document:', documentId);
	
	const apiKey = process.env.DOCUMENSO_API_KEY;
	const url = `${DOCUMENSO_API_BASE}/documents/${documentId}/download`;
	
	const response = await fetch(url, {
		headers: {
			'Authorization': `Bearer ${apiKey}`
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to download document: ${response.status} ${response.statusText}`);
	}

	const arrayBuffer = await response.arrayBuffer();
	return Buffer.from(arrayBuffer);
}

/**
 * Send signing request to recipient
 * 
 * @param {string} documentId - Documenso document ID
 * @param {string} recipientId - Recipient ID
 * @returns {Promise<Object>} Result object
 */
export async function sendSigningRequest(documentId, recipientId) {
	console.log('Sending signing request:', { documentId, recipientId });
	return documensoRequest(`/documents/${documentId}/recipients/${recipientId}/send`, {
		method: 'POST'
	});
}

