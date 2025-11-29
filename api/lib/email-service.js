/**
 * Email Service
 * 
 * Modular email service using Resend API.
 * Handles all email sending functionality with templates.
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send lease confirmation signing request email to property contact
 * 
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.toName - Recipient name
 * @param {string} params.signingUrl - Documenso signing URL
 * @param {Object} params.leaseData - Lease confirmation data
 * @param {Object} params.agentData - Agent/locator data
 * @returns {Promise<Object>} Resend response
 */
export async function sendLeaseSigningRequest({
	to,
	toName,
	signingUrl,
	leaseData,
	agentData
}) {
	console.log('Sending lease signing request email to:', to);

	const subject = `Lease Confirmation Ready for Signature - ${leaseData.tenantName}`;

	const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<style>
		body {
			font-family: Arial, sans-serif;
			line-height: 1.6;
			color: #333;
			max-width: 600px;
			margin: 0 auto;
			padding: 20px;
		}
		.header {
			background: #2c5282;
			color: white;
			padding: 20px;
			text-align: center;
			border-radius: 8px 8px 0 0;
		}
		.content {
			background: #f7fafc;
			padding: 30px;
			border: 1px solid #e2e8f0;
		}
		.details {
			background: white;
			padding: 20px;
			margin: 20px 0;
			border-left: 4px solid #2c5282;
			border-radius: 4px;
		}
		.detail-row {
			display: flex;
			padding: 8px 0;
			border-bottom: 1px solid #e2e8f0;
		}
		.detail-label {
			font-weight: bold;
			width: 140px;
			color: #2c5282;
		}
		.detail-value {
			flex: 1;
		}
		.cta-button {
			display: inline-block;
			background: #2c5282;
			color: white;
			padding: 16px 32px;
			text-decoration: none;
			border-radius: 6px;
			font-weight: bold;
			font-size: 16px;
			margin: 20px 0;
			text-align: center;
		}
		.cta-button:hover {
			background: #1a365d;
		}
		.footer {
			background: #2d3748;
			color: #cbd5e0;
			padding: 20px;
			text-align: center;
			font-size: 12px;
			border-radius: 0 0 8px 8px;
		}
		.footer a {
			color: #90cdf4;
			text-decoration: none;
		}
	</style>
</head>
<body>
	<div class="header">
		<h1 style="margin: 0;">Texas Relocation Experts</h1>
		<p style="margin: 10px 0 0 0;">Lease Confirmation Ready for Signature</p>
	</div>
	
	<div class="content">
		<p>Hi ${toName},</p>
		
		<p>A lease confirmation is ready for your signature for the following tenant:</p>
		
		<div class="details">
			<div class="detail-row">
				<span class="detail-label">📋 Tenant:</span>
				<span class="detail-value">${leaseData.tenantName}</span>
			</div>
			<div class="detail-row">
				<span class="detail-label">🏢 Property:</span>
				<span class="detail-value">${leaseData.propertyName}</span>
			</div>
			${leaseData.unitNumber ? `
			<div class="detail-row">
				<span class="detail-label">🚪 Unit:</span>
				<span class="detail-value">${leaseData.unitNumber}</span>
			</div>
			` : ''}
			${leaseData.moveInDate ? `
			<div class="detail-row">
				<span class="detail-label">📅 Move-in Date:</span>
				<span class="detail-value">${leaseData.moveInDate}</span>
			</div>
			` : ''}
			${leaseData.rentAmount ? `
			<div class="detail-row">
				<span class="detail-label">💰 Rent:</span>
				<span class="detail-value">$${leaseData.rentAmount}/month</span>
			</div>
			` : ''}
		</div>
		
		<p><strong>Please review and sign this confirmation:</strong></p>
		
		<div style="text-align: center;">
			<a href="${signingUrl}" class="cta-button">
				📝 Review & Sign Lease Confirmation
			</a>
		</div>
		
		<p style="font-size: 14px; color: #666;">
			This should only take 1-2 minutes. Click the button above to review the document and add your signature.
		</p>
		
		<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
		
		<p style="font-size: 14px;">
			<strong>Questions?</strong> Contact your locator:<br>
			${agentData.name}<br>
			${agentData.email}${agentData.phone ? ` | ${agentData.phone}` : ''}
		</p>
	</div>
	
	<div class="footer">
		<p style="margin: 0 0 10px 0;"><strong>Texas Relocation Experts</strong></p>
		<p style="margin: 0;">11255 Huebner Rd, Ste 112, San Antonio TX 78230</p>
		<p style="margin: 10px 0 0 0;">
			Office: 210.348.5739 | Fax: 210.348.8493<br>
			<a href="mailto:info@tre-crm.com">info@tre-crm.com</a>
		</p>
	</div>
</body>
</html>
	`;

	const { data, error } = await resend.emails.send({
		from: 'Texas Relocation Experts <noreply@tre-crm.com>',
		to: [to],
		subject: subject,
		html: html
	});

	if (error) {
		console.error('Error sending email:', error);
		throw new Error(`Failed to send email: ${error.message}`);
	}

	console.log('Email sent successfully:', data.id);
	return data;
}

