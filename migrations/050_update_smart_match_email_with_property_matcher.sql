-- ============================================
-- Migration 050: Update Smart Match Email Template with Property Matcher
-- ============================================
-- Purpose: Add "View My Matches" button to Smart Match email template
-- This allows leads to click through to their personalized "My Matches" page
-- where they can select properties and schedule tours
-- ============================================

UPDATE public.email_templates
SET 
    html_content = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6; }
        .container { max-width: 650px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0 0 10px 0; font-size: 32px; font-weight: 700; }
        .header p { margin: 0; font-size: 16px; opacity: 0.95; }
        .intro { padding: 30px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
        .intro h2 { margin: 0 0 15px 0; color: #111827; font-size: 24px; }
        .intro p { margin: 10px 0; color: #4b5563; }
        .content { padding: 30px; }
        .match-badge { display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #78350f; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; margin-bottom: 25px; }
        .property-card { background: #ffffff; border: 2px solid #e5e7eb; border-radius: 10px; padding: 20px; margin-bottom: 20px; transition: all 0.3s ease; }
        .property-card:hover { border-color: #667eea; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15); }
        .property-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; }
        .property-name { font-size: 20px; font-weight: 700; color: #111827; margin: 0; }
        .property-rent { font-size: 24px; font-weight: 700; color: #667eea; margin: 0; }
        .property-specs { display: flex; gap: 20px; margin: 15px 0; padding: 15px 0; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; }
        .spec-item { display: flex; align-items: center; gap: 6px; color: #6b7280; font-size: 14px; }
        .property-location { color: #6b7280; font-size: 14px; margin: 10px 0; }
        .property-special { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 15px 0; border-radius: 6px; }
        .property-special strong { color: #92400e; }
        .property-special p { margin: 5px 0 0 0; color: #78350f; font-size: 14px; }
        .cta-section { text-align: center; margin: 40px 0; padding: 30px; background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%); border-radius: 10px; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: all 0.3s ease; margin: 10px; }
        .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4); }
        .cta-button-secondary { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .agent-card { background: #f9fafb; border-radius: 10px; padding: 25px; margin: 30px 0; }
        .agent-card h3 { margin: 0 0 15px 0; color: #111827; font-size: 18px; }
        .agent-info { display: flex; flex-direction: column; gap: 10px; }
        .agent-detail { display: flex; align-items: center; gap: 10px; color: #4b5563; font-size: 14px; }
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
            .cta-button { padding: 14px 30px; font-size: 15px; display: block; margin: 10px 0; }
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
            <div style="text-align: center; margin: 25px 0 10px 0;">
                <a href="{{propertyMatcherUrl}}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff !important; text-decoration: none; padding: 18px 40px; border-radius: 10px; font-weight: 700; font-size: 18px; box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4); transition: all 0.3s ease;">
                    🏡 View My Matches & Schedule Tours →
                </a>
            </div>
        </div>
        
        <div class="content">
            <div class="match-badge">✨ Personalized Just For You</div>
            
            {{propertyCards}}
            
            <div class="divider"></div>
            
            <div class="cta-section">
                <h3 style="margin-top: 0; color: #111827;">Ready to Find Your New Home?</h3>
                <p style="color: #6b7280; margin-bottom: 20px;">Click below to view your matches, select favorites, and schedule tours!</p>
                <a href="{{propertyMatcherUrl}}" style="display: inline-block; background: #10b981; color: #ffffff !important; text-decoration: none; padding: 18px 36px; border-radius: 10px; font-weight: 700; font-size: 17px; margin: 10px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">🏡 View My Matches & Schedule Tours</a>
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
                <div style="text-align: center; margin-top: 20px;">
                    <a href="{{propertyMatcherUrl}}" style="display: inline-block; background: #6366f1; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                        📅 Schedule Tours Now
                    </a>
                </div>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
                <strong>Questions?</strong> Reply to this email or call {{agentPhone}}. I''m here to help you find the perfect place to call home!
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
    text_content = 'Hi {{leadName}}!

Great news! Our Smart Match system analyzed your preferences and found {{propertyCount}} properties that are perfect for you.

These aren''t just random listings – they''re intelligently matched based on your budget, location preferences, and move-in timeline.

YOUR SMART MATCH PROPERTIES
{{propertyCardsText}}

READY TO FIND YOUR NEW HOME?
View all your matches, select your favorites, and schedule tours!

👉 View My Matches: {{propertyMatcherUrl}}

Or email me directly: {{agentEmail}}
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
    variables = '["leadName", "propertyCount", "agentName", "agentEmail", "agentPhone", "propertyCards", "propertyCardsText", "propertyMatcherUrl"]'::jsonb,
    updated_at = NOW()
WHERE id = 'smart_match_email';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 050 completed successfully!';
    RAISE NOTICE '📧 Smart Match email template updated with Property Matcher button';
    RAISE NOTICE '🔗 New variable added: propertyMatcherUrl';
    RAISE NOTICE '🎯 Leads can now click "View My Matches & Schedule Tours" button';
END $$;

