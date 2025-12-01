-- Migration 059: Add Lease Confirmation Email Template
-- Purpose: Add email template for lease confirmation signature requests

INSERT INTO public.email_templates (id, name, subject, html_content, text_content, description, variables, category, active)
VALUES (
    'lease_confirmation_signature',
    'Lease Confirmation - Signature Request',
    'Lease Confirmation Ready for Signature - {{tenantName}}',
    '<!DOCTYPE html>
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
		<p>Hi {{recipientName}},</p>
		
		<p>A lease confirmation is ready for your signature for the following tenant:</p>
		
		<div class="details">
			<div class="detail-row">
				<span class="detail-label">📋 Tenant:</span>
				<span class="detail-value">{{tenantName}}</span>
			</div>
			<div class="detail-row">
				<span class="detail-label">🏢 Property:</span>
				<span class="detail-value">{{propertyName}}</span>
			</div>
			<div class="detail-row">
				<span class="detail-label">🚪 Unit:</span>
				<span class="detail-value">{{unitNumber}}</span>
			</div>
			<div class="detail-row">
				<span class="detail-label">📅 Move-in Date:</span>
				<span class="detail-value">{{moveInDate}}</span>
			</div>
			<div class="detail-row">
				<span class="detail-label">💰 Rent:</span>
				<span class="detail-value">${{rentAmount}}/month</span>
			</div>
		</div>
		
		<p><strong>Please review and sign this confirmation:</strong></p>
		
		<div style="text-align: center;">
			<a href="{{signingUrl}}" class="cta-button">
				📝 Review & Sign Lease Confirmation
			</a>
		</div>
		
		<p style="font-size: 14px; color: #666;">
			This should only take 1-2 minutes. Click the button above to review the document and add your signature.
		</p>
		
		<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
		
		<p style="font-size: 14px;">
			<strong>Questions?</strong> Contact your locator:<br>
			{{agentName}}<br>
			{{agentEmail}}{{agentPhone}}
		</p>
	</div>
	
	<div class="footer">
		<p style="margin: 0 0 10px 0;"><strong>Texas Relocation Experts</strong></p>
		<p style="margin: 0;">11255 Huebner Rd, Ste 112, San Antonio TX 78230</p>
		<p style="margin: 10px 0 0 0;">
			Office: 210.348.5739 | Fax: 210.348.8493<br>
			<a href="mailto:info@texasrelocationexperts.com">info@texasrelocationexperts.com</a>
		</p>
	</div>
</body>
</html>',
    'Hi {{recipientName}},

A lease confirmation is ready for your signature for the following tenant:

Tenant: {{tenantName}}
Property: {{propertyName}}
Unit: {{unitNumber}}
Move-in Date: {{moveInDate}}
Rent: ${{rentAmount}}/month

Please review and sign this confirmation by clicking the link below:
{{signingUrl}}

Questions? Contact your locator:
{{agentName}}
{{agentEmail}}{{agentPhone}}

---
Texas Relocation Experts
11255 Huebner Rd, Ste 112, San Antonio TX 78230
Office: 210.348.5739 | Fax: 210.348.8493',
    'Email sent to property contacts when a lease confirmation is ready for electronic signature via Documenso',
    '["recipientName", "tenantName", "propertyName", "unitNumber", "moveInDate", "rentAmount", "signingUrl", "agentName", "agentEmail", "agentPhone"]'::jsonb,
    'document',
    true
);

