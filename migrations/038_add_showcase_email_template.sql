-- Migration 038: Add Showcase Email Template
-- Purpose: Add email template for sending property showcases to leads

-- ============================================
-- 1. INSERT SHOWCASE EMAIL TEMPLATE
-- ============================================

INSERT INTO public.email_templates (id, name, subject, html_content, text_content, description, variables, category, active)
VALUES (
    'showcase_email',
    'Property Showcase',
    'Top Property Options Hand-Picked for You',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 700px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 40px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
        .content { padding: 40px 30px; }
        .content h2 { color: #667eea; margin-top: 0; }
        .content p { margin: 15px 0; }
        .property-card { border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px; background: #f9fafb; }
        .property-card h3 { margin-top: 0; color: #1f2937; font-size: 20px; }
        .property-detail { margin: 8px 0; color: #4b5563; }
        .property-detail strong { color: #1f2937; }
        .property-amenities { margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; }
        .amenity-tag { display: inline-block; background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 12px; font-size: 12px; margin: 4px 4px 4px 0; }
        .cta-button { display: inline-block; background: #667eea; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
        .cta-button:hover { background: #5568d3; }
        .agent-info { background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .bonus-banner { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .bonus-banner strong { color: #92400e; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏠 Your Personalized Property Showcase</h1>
        </div>
        <div class="content">
            <h2>Hi {{leadName}}!</h2>
            <p>I''ve hand-picked these properties based on your preferences and budget. Each one has been carefully selected to match what you''re looking for.</p>
            
            {{bonusText}}
            
            <div class="agent-info">
                <strong>Your Dedicated Agent:</strong><br>
                <strong>{{agentName}}</strong><br>
                📧 {{agentEmail}}<br>
                📱 {{agentPhone}}
            </div>
            
            <h3 style="color: #667eea; margin-top: 30px;">Your Top Property Matches</h3>
            
            {{propertyCards}}
            
            <p style="margin-top: 30px;"><strong>Ready to schedule a tour?</strong></p>
            <p>I''d love to show you these properties in person! Reply to this email or give me a call to set up a convenient time.</p>
            
            <center>
                <a href="{{landingUrl}}" class="cta-button">View Full Showcase Online</a>
            </center>
            
            <p style="margin-top: 30px;">Looking forward to helping you find your perfect home!</p>
            
            <p>Best regards,<br>
            <strong>{{agentName}}</strong><br>
            <em>{{agentTitle}}</em></p>
        </div>
        <div class="footer">
            <p>© 2025 TRE CRM. All rights reserved.</p>
            <p>You received this email because you requested property information from us.</p>
        </div>
    </div>
</body>
</html>',
    'Hi {{leadName}}!

I''ve hand-picked these properties based on your preferences and budget. Each one has been carefully selected to match what you''re looking for.

{{bonusText}}

Your Dedicated Agent:
{{agentName}}
Email: {{agentEmail}}
Phone: {{agentPhone}}

YOUR TOP PROPERTY MATCHES
{{propertyCardsText}}

Ready to schedule a tour?
I''d love to show you these properties in person! Reply to this email or give me a call to set up a convenient time.

View Full Showcase Online: {{landingUrl}}

Looking forward to helping you find your perfect home!

Best regards,
{{agentName}}
{{agentTitle}}

---
© 2025 TRE CRM. All rights reserved.
You received this email because you requested property information from us.',
    'Email template for sending property showcases to leads with hand-picked property recommendations',
    '["leadName", "agentName", "agentEmail", "agentPhone", "agentTitle", "bonusText", "propertyCards", "propertyCardsText", "landingUrl"]'::jsonb,
    'lead',
    true
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content,
    text_content = EXCLUDED.text_content,
    description = EXCLUDED.description,
    variables = EXCLUDED.variables,
    category = EXCLUDED.category,
    active = EXCLUDED.active,
    updated_at = NOW();

-- ============================================
-- 2. COMMENTS
-- ============================================

COMMENT ON TABLE public.email_templates IS 'Stores HTML email templates for automated emails including showcase emails';

