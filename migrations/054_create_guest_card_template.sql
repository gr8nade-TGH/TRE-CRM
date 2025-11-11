-- Migration 054: Create Guest Card Email Template
-- Purpose: Email template sent to property owners when their property is included in a Smart Match showcase
-- Notifies owners about qualified leads viewing their properties

-- ============================================
-- INSERT GUEST CARD EMAIL TEMPLATE
-- ============================================

INSERT INTO public.email_templates (id, name, subject, html_content, text_content, active, default_sender, created_at, updated_at)
VALUES (
    'guest_card_email',
    'Guest Card - Property Owner Notification',
    '🏠 New Lead Interested in {{propertyName}}',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
            line-height: 1.6; 
            color: #1f2937; 
            margin: 0; 
            padding: 0; 
            background-color: #f3f4f6; 
        }
        .container { 
            max-width: 650px; 
            margin: 20px auto; 
            background: #ffffff; 
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.08); 
        }
        .header { 
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            padding: 40px 30px; 
            text-align: center; 
            color: #ffffff;
        }
        .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 700; 
        }
        .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.95;
        }
        .content { 
            padding: 40px 30px; 
        }
        .content h2 { 
            color: #111827; 
            margin-top: 0; 
            font-size: 22px;
            margin-bottom: 20px;
        }
        .content p { 
            margin: 15px 0; 
            color: #4b5563;
            font-size: 16px;
        }
        .info-card { 
            background: #f9fafb; 
            border: 1px solid #e5e7eb; 
            border-radius: 12px; 
            padding: 24px; 
            margin: 24px 0; 
        }
        .info-card h3 {
            margin: 0 0 16px 0;
            color: #111827;
            font-size: 18px;
            font-weight: 600;
        }
        .info-row {
            display: flex;
            margin: 12px 0;
            color: #4b5563;
            font-size: 15px;
        }
        .info-label {
            font-weight: 600;
            min-width: 140px;
            color: #6b7280;
        }
        .info-value {
            color: #111827;
        }
        .info-value a {
            color: #6366f1;
            text-decoration: none;
            font-weight: 500;
        }
        .info-value a:hover {
            text-decoration: underline;
        }
        .highlight-box {
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin: 24px 0;
            border-radius: 8px;
        }
        .highlight-box p {
            margin: 8px 0;
            color: #1e3a8a;
        }
        .cta-button { 
            display: inline-block; 
            background: #6366f1; 
            color: #ffffff !important; 
            padding: 14px 32px; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 20px 0; 
            font-weight: 600; 
            font-size: 16px;
            transition: background 0.2s ease;
        }
        .cta-button:hover { 
            background: #4f46e5; 
        }
        .footer { 
            background: #f9fafb; 
            padding: 24px; 
            text-align: center; 
            font-size: 13px; 
            color: #6b7280; 
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            margin: 8px 0;
        }
        @media only screen and (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 8px;
            }
            .header {
                padding: 30px 20px;
            }
            .header h1 {
                font-size: 22px;
            }
            .content {
                padding: 30px 20px;
            }
            .info-row {
                flex-direction: column;
            }
            .info-label {
                min-width: auto;
                margin-bottom: 4px;
            }
            .cta-button {
                display: block;
                text-align: center;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏠 New Qualified Lead!</h1>
            <p>Your property was included in a curated showcase</p>
        </div>
        <div class="content">
            <h2>Hi {{propertyOwnerName}}! 👋</h2>
            <p>Great news! Your property <strong>{{propertyName}}</strong> was included in a personalized property showcase sent to a qualified lead through Texas Relocation Experts.</p>
            
            <div class="info-card">
                <h3>👤 Lead Information</h3>
                <div class="info-row">
                    <div class="info-label">Name:</div>
                    <div class="info-value">{{leadName}}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Email:</div>
                    <div class="info-value"><a href="{{trackingUrl_lead_email}}">{{leadEmail}}</a></div>
                </div>
                <div class="info-row">
                    <div class="info-label">Phone:</div>
                    <div class="info-value"><a href="{{trackingUrl_lead_phone}}">{{leadPhone}}</a></div>
                </div>
                <div class="info-row">
                    <div class="info-label">Budget:</div>
                    <div class="info-value">{{leadBudget}}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Bedrooms:</div>
                    <div class="info-value">{{leadBedrooms}}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Bathrooms:</div>
                    <div class="info-value">{{leadBathrooms}}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Move-in Date:</div>
                    <div class="info-value">{{leadMoveInDate}}</div>
                </div>
            </div>

            <div class="highlight-box">
                <p><strong>📋 What Happens Next?</strong></p>
                <p>• The lead is reviewing your property along with other curated matches</p>
                <p>• If they express interest or request a tour, we''ll notify you immediately</p>
                <p>• Our agent will coordinate all showings and follow-ups</p>
                <p>• You can expect to hear from us within 24-48 hours with an update</p>
            </div>

            <div class="info-card">
                <h3>📞 Your TRE Agent</h3>
                <div class="info-row">
                    <div class="info-label">Agent:</div>
                    <div class="info-value">{{agentName}}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Email:</div>
                    <div class="info-value"><a href="{{trackingUrl_agent_email}}">{{agentEmail}}</a></div>
                </div>
                <div class="info-row">
                    <div class="info-label">Phone:</div>
                    <div class="info-value"><a href="{{trackingUrl_agent_phone}}">{{agentPhone}}</a></div>
                </div>
            </div>

            <p style="text-align: center; margin: 32px 0;">
                <a href="{{trackingUrl_agent_email}}" class="cta-button">
                    📧 Contact Agent for Updates
                </a>
            </p>

            <p style="margin-top: 32px; color: #6b7280; font-size: 14px;">
                <strong>Note:</strong> This is an automated notification. If the lead expresses interest in your property, your agent will reach out to you directly to coordinate next steps.
            </p>
        </div>
        <div class="footer">
            <p><strong>Texas Relocation Experts</strong></p>
            <p>© 2025 TRE CRM. All rights reserved.</p>
            <p style="margin-top: 12px; font-size: 12px;">
                You received this email because your property is listed with Texas Relocation Experts.<br>
                Questions? Contact your agent directly.
            </p>
        </div>
    </div>
    
    <!-- Tracking Pixel for Open Tracking -->
    <img src="{{trackingPixelUrl}}" width="1" height="1" style="display:none;" alt="" />
</body>
</html>',
    'Hi {{propertyOwnerName}},

Great news! Your property {{propertyName}} was included in a personalized property showcase sent to a qualified lead through Texas Relocation Experts.

LEAD INFORMATION:
Name: {{leadName}}
Email: {{leadEmail}}
Phone: {{leadPhone}}
Budget: {{leadBudget}}
Bedrooms: {{leadBedrooms}}
Bathrooms: {{leadBathrooms}}
Move-in Date: {{leadMoveInDate}}

WHAT HAPPENS NEXT:
- The lead is reviewing your property along with other curated matches
- If they express interest or request a tour, we''ll notify you immediately
- Our agent will coordinate all showings and follow-ups
- You can expect to hear from us within 24-48 hours with an update

YOUR TRE AGENT:
{{agentName}}
{{agentEmail}}
{{agentPhone}}

This is an automated notification. If the lead expresses interest in your property, your agent will reach out to you directly to coordinate next steps.

---
Texas Relocation Experts
© 2025 TRE CRM. All rights reserved.',
    true,
    'noreply@texasrelocationexperts.com',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content,
    text_content = EXCLUDED.text_content,
    updated_at = NOW();

