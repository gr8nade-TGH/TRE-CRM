-- Migration 040: Add Smart Match Email Template
-- Purpose: Add email template for Smart Match feature (intelligent property matching)

-- ============================================
-- 1. INSERT SMART MATCH EMAIL TEMPLATE
-- ============================================

INSERT INTO public.email_templates (id, name, subject, html_content, text_content, description, variables, category, active)
VALUES (
    'smart_match_email',
    'Smart Match - Intelligent Property Recommendations',
    '🏠 {{leadName}}, We Found Your Perfect Match!',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6; }
        .container { max-width: 650px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0 0 10px 0; font-size: 32px; font-weight: 700; }
        .header p { margin: 0; font-size: 16px; opacity: 0.95; }
        .intro { padding: 30px 30px 20px 30px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
        .intro h2 { margin: 0 0 15px 0; color: #3b82f6; font-size: 22px; }
        .intro p { margin: 8px 0; color: #4b5563; font-size: 15px; }
        .content { padding: 30px; }
        .match-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
        .property-card { border: 1px solid #e5e7eb; border-radius: 10px; margin: 20px 0; overflow: hidden; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.04); transition: box-shadow 0.2s; }
        .property-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .property-image { width: 100%; height: 220px; object-fit: cover; background: #e5e7eb; }
        .property-body { padding: 20px; }
        .property-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .property-name { font-size: 20px; font-weight: 700; color: #111827; margin: 0; }
        .property-price { font-size: 24px; font-weight: 700; color: #3b82f6; margin: 0; }
        .property-price-label { font-size: 13px; color: #6b7280; font-weight: 400; }
        .property-specs { display: flex; gap: 16px; margin: 12px 0; padding: 12px 0; border-top: 1px solid #f3f4f6; border-bottom: 1px solid #f3f4f6; }
        .spec-item { display: flex; align-items: center; gap: 6px; color: #4b5563; font-size: 14px; }
        .spec-icon { font-size: 16px; }
        .property-location { color: #6b7280; font-size: 14px; margin: 8px 0; }
        .property-location::before { content: "📍 "; }
        .property-special { background: #fef3c7; border-left: 3px solid #f59e0b; padding: 12px; margin: 12px 0; border-radius: 4px; font-size: 14px; color: #92400e; }
        .property-special strong { color: #78350f; }
        .cta-section { text-align: center; padding: 30px; background: #f9fafb; margin-top: 20px; border-radius: 8px; }
        .cta-button { display: inline-block; background: #3b82f6; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3); transition: all 0.2s; }
        .cta-button:hover { background: #2563eb; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); transform: translateY(-1px); }
        .agent-card { background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border: 1px solid #e5e7eb; border-radius: 10px; padding: 24px; margin: 30px 0; }
        .agent-card h3 { margin: 0 0 12px 0; color: #111827; font-size: 18px; }
        .agent-info { display: flex; flex-direction: column; gap: 8px; }
        .agent-detail { display: flex; align-items: center; gap: 10px; color: #4b5563; font-size: 15px; }
        .agent-detail strong { color: #111827; min-width: 60px; }
        .footer { background: #f9fafb; padding: 24px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; }
        .footer p { margin: 6px 0; }
        .divider { height: 1px; background: #e5e7eb; margin: 30px 0; }
        @media only screen and (max-width: 600px) {
            .container { margin: 10px; border-radius: 8px; }
            .header { padding: 30px 20px; }
            .header h1 { font-size: 26px; }
            .intro, .content { padding: 20px; }
            .property-specs { flex-wrap: wrap; }
            .cta-button { padding: 14px 30px; font-size: 15px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏠 Your Perfect Match Awaits!</h1>
            <p>Intelligently matched properties based on your preferences</p>
        </div>
        
        <div class="intro">
            <h2>Hi {{leadName}}! 👋</h2>
            <p>Great news! Our Smart Match system analyzed your preferences and found <strong>{{propertyCount}} properties</strong> that are perfect for you.</p>
            <p>These aren''t just random listings – they''re intelligently matched based on your budget, location preferences, and move-in timeline.</p>
        </div>
        
        <div class="content">
            <div class="match-badge">✨ Personalized Just For You</div>
            
            {{propertyCards}}
            
            <div class="divider"></div>
            
            <div class="cta-section">
                <h3 style="margin-top: 0; color: #111827;">Ready to Find Your New Home?</h3>
                <p style="color: #6b7280; margin-bottom: 20px;">Let''s schedule a tour of your favorite properties!</p>
                <a href="mailto:{{agentEmail}}?subject=Tour Request - Smart Match Properties" class="cta-button">📅 Schedule a Tour</a>
            </div>
            
            <div class="agent-card">
                <h3>Your Dedicated Relocation Expert</h3>
                <div class="agent-info">
                    <div class="agent-detail">
                        <strong>Name:</strong> {{agentName}}
                    </div>
                    <div class="agent-detail">
                        <strong>Email:</strong> <a href="mailto:{{agentEmail}}" style="color: #3b82f6; text-decoration: none;">{{agentEmail}}</a>
                    </div>
                    <div class="agent-detail">
                        <strong>Phone:</strong> <a href="tel:{{agentPhone}}" style="color: #3b82f6; text-decoration: none;">{{agentPhone}}</a>
                    </div>
                </div>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                <strong>Questions?</strong> Reply to this email or give me a call anytime. I''m here to help you find the perfect place to call home!
            </p>
        </div>
        
        <div class="footer">
            <p><strong>Texas Relocation Experts</strong></p>
            <p>© 2025 TRE CRM. All rights reserved.</p>
            <p style="margin-top: 12px;">You received this email because you requested property recommendations from us.</p>
        </div>
    </div>
</body>
</html>',
    'Hi {{leadName}}!

Great news! Our Smart Match system analyzed your preferences and found {{propertyCount}} properties that are perfect for you.

These aren''t just random listings – they''re intelligently matched based on your budget, location preferences, and move-in timeline.

YOUR SMART MATCH PROPERTIES
{{propertyCardsText}}

READY TO FIND YOUR NEW HOME?
Let''s schedule a tour of your favorite properties!

Email me: {{agentEmail}}
Call me: {{agentPhone}}

YOUR DEDICATED RELOCATION EXPERT
Name: {{agentName}}
Email: {{agentEmail}}
Phone: {{agentPhone}}

Questions? Reply to this email or give me a call anytime. I''m here to help you find the perfect place to call home!

---
Texas Relocation Experts
© 2025 TRE CRM. All rights reserved.
You received this email because you requested property recommendations from us.',
    'Smart Match email template for sending intelligently matched property recommendations (4-6 properties) based on lead preferences, budget, and location',
    '["leadName", "propertyCount", "agentName", "agentEmail", "agentPhone", "propertyCards", "propertyCardsText"]'::jsonb,
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

COMMENT ON TABLE public.email_templates IS 'Stores HTML email templates for automated emails including Smart Match emails';

