/**
 * Serverless Function: Send Email via Resend API
 *
 * This function handles sending emails through Resend and logs them to the database.
 *
 * Request Body:
 * {
 *   templateId: string,           // Email template ID from email_templates table
 *   recipientEmail: string,        // Recipient email address
 *   recipientName: string,         // Recipient name
 *   variables: object,             // Template variables (e.g., { leadName: "John", agentName: "Jane" })
 *   metadata: object,              // Additional context (e.g., { lead_id: "123", agent_id: "456" })
 *   sentBy: string,                // User ID who triggered the email (optional)
 *   fromEmail: string              // Sender email address (optional, uses template default or env default)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   emailLogId: string,
 *   resendId: string
 * }
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
	// Only allow POST requests
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	// CORS headers
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

	if (req.method === 'OPTIONS') {
		return res.status(200).end();
	}

	const SUPABASE_URL = process.env.SUPABASE_URL;
	const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
	const RESEND_API_KEY = process.env.RESEND_API_KEY;
	const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@tre-crm.com';
	const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'TRE CRM';

	if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
		console.error('Missing Supabase configuration');
		return res.status(500).json({ error: 'Server configuration error' });
	}

	if (!RESEND_API_KEY) {
		console.error('Missing Resend API key');
		return res.status(500).json({ error: 'Email service not configured' });
	}

	const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

	try {
		const { templateId, recipientEmail, recipientName, variables, metadata, sentBy, fromEmail } = req.body;

		// Validate required fields
		if (!templateId || !recipientEmail) {
			return res.status(400).json({ error: 'Missing required fields: templateId, recipientEmail' });
		}

		console.log('📧 Sending email:', { templateId, recipientEmail, recipientName, fromEmail });

		// 1. Fetch email template from database
		const { data: template, error: templateError } = await supabase
			.from('email_templates')
			.select('*')
			.eq('id', templateId)
			.eq('active', true)
			.single();

		if (templateError || !template) {
			console.error('Template not found:', templateError);
			return res.status(404).json({ error: 'Email template not found or inactive' });
		}

		// Determine sender email: fromEmail param > template default > env default
		const senderEmail = fromEmail || template.default_sender || EMAIL_FROM;
		console.log('📧 Using sender email:', senderEmail);

		// 2. Create email log entry FIRST (we need the ID for tracking URLs)
		const { data: emailLog, error: logError } = await supabase
			.from('email_logs')
			.insert([{
				template_id: templateId,
				recipient_email: recipientEmail,
				recipient_name: recipientName,
				subject: template.subject, // Use template subject initially
				status: 'pending',
				metadata: metadata || {},
				sent_by: sentBy || null,
				sender_email: fromEmail || template.default_sender || EMAIL_FROM
			}])
			.select()
			.single();

		if (logError) {
			console.error('Error creating email log:', logError);
			return res.status(500).json({ error: 'Failed to create email log' });
		}

		// 3. Generate tracking URLs using the email log ID
		const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
			? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
			: 'https://tre-crm.vercel.app';

		const trackingPixelUrl = `${baseUrl}/api/track-email-open?id=${emailLog.id}`;

		// Helper function to create tracking URL
		const createTrackingUrl = (linkName, targetUrl) => {
			const encodedUrl = encodeURIComponent(targetUrl);
			return `${baseUrl}/api/track-email-click?id=${emailLog.id}&link=${linkName}&url=${encodedUrl}`;
		};

		// 4. Replace variables in template (including tracking URLs)
		let htmlContent = template.html_content;
		let textContent = template.text_content;
		let subject = template.subject;

		// Add tracking pixel URL to variables
		const allVariables = {
			...variables,
			trackingPixelUrl: trackingPixelUrl
		};

		// Generate tracking URLs for common CTAs
		if (variables?.agentEmail) {
			allVariables.trackingUrl_agent_email = createTrackingUrl('agent_email', `mailto:${variables.agentEmail}`);
		}
		if (variables?.agentPhone) {
			allVariables.trackingUrl_agent_phone = createTrackingUrl('agent_phone', `tel:${variables.agentPhone}`);
		}
		if (variables?.leadEmail) {
			allVariables.trackingUrl_lead_email = createTrackingUrl('lead_email', `mailto:${variables.leadEmail}`);
		}
		if (variables?.leadPhone) {
			allVariables.trackingUrl_lead_phone = createTrackingUrl('lead_phone', `tel:${variables.leadPhone}`);
		}
		if (variables?.propertyMatcherUrl) {
			allVariables.trackingUrl_property_matcher = createTrackingUrl('property_matcher', variables.propertyMatcherUrl);
		}
		// Default CTA button tracking (mailto to agent)
		if (variables?.agentEmail) {
			allVariables.trackingUrl_cta_button = createTrackingUrl('cta_button', `mailto:${variables.agentEmail}`);
		}

		// Replace all variables in template
		if (allVariables) {
			Object.keys(allVariables).forEach(key => {
				const regex = new RegExp(`{{${key}}}`, 'g');
				const value = allVariables[key] || '';
				htmlContent = htmlContent.replace(regex, value);
				textContent = textContent ? textContent.replace(regex, value) : null;
				subject = subject.replace(regex, value);
			});
		}

		// 5. Send email via Resend API
		try {
			const resendResponse = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${RESEND_API_KEY}`
				},
				body: JSON.stringify({
					from: `${EMAIL_FROM_NAME} <${senderEmail}>`,
					to: [recipientEmail],
					subject: subject,
					html: htmlContent,
					text: textContent
				})
			});

			const resendData = await resendResponse.json();

			if (!resendResponse.ok) {
				console.error('Resend API error:', resendData);

				// Update email log with error
				await supabase
					.from('email_logs')
					.update({
						status: 'failed',
						error_message: resendData.message || 'Unknown error from Resend API',
						updated_at: new Date().toISOString()
					})
					.eq('id', emailLog.id);

				return res.status(500).json({
					error: 'Failed to send email',
					details: resendData.message
				});
			}

			// 6. Update email log with success
			await supabase
				.from('email_logs')
				.update({
					status: 'sent',
					resend_id: resendData.id,
					sent_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				})
				.eq('id', emailLog.id);

			console.log('✅ Email sent successfully:', resendData.id);

			return res.status(200).json({
				success: true,
				emailLogId: emailLog.id,
				resendId: resendData.id
			});

		} catch (resendError) {
			console.error('Error calling Resend API:', resendError);

			// Update email log with error
			await supabase
				.from('email_logs')
				.update({
					status: 'failed',
					error_message: resendError.message,
					updated_at: new Date().toISOString()
				})
				.eq('id', emailLog.id);

			return res.status(500).json({
				error: 'Failed to send email',
				details: resendError.message
			});
		}

	} catch (error) {
		console.error('❌ Error in send-email function:', error);
		return res.status(500).json({
			error: 'Internal server error',
			details: error.message
		});
	}
}

