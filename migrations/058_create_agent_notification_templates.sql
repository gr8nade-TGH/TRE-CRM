-- Migration 058: Create agent notification email templates
-- These templates are used to notify agents about lead events and milestones

-- ============================================
-- 1. AGENT LEAD ASSIGNMENT EMAIL TEMPLATE
-- ============================================

INSERT INTO public.email_templates (id, name, subject, html_content, variables, created_at, updated_at)
VALUES (
    'agent_lead_assignment',
    'Agent Lead Assignment Notification',
    '🎯 New Lead Assigned: {{leadName}}',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Lead Assigned</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    
                    <!-- Header with Gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">🎯 New Lead Assigned</h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">You have a new lead to follow up with</p>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            
                            <!-- Greeting -->
                            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">Hi {{agentName}},</p>
                            <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                                A new lead has been assigned to you. Here are the details:
                            </p>
                            
                            <!-- Lead Info Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #333333; font-weight: 600;">{{leadName}}</h2>
                                        
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666; width: 140px;">📧 Email:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333;"><a href="{{trackingUrl_lead_email}}" style="color: #667eea; text-decoration: none;">{{leadEmail}}</a></td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666;">📱 Phone:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333;"><a href="{{trackingUrl_lead_phone}}" style="color: #667eea; text-decoration: none;">{{leadPhone}}</a></td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666;">🏠 Bedrooms:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333;">{{leadBedrooms}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666;">🚿 Bathrooms:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333;">{{leadBathrooms}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666;">💰 Budget:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333;">{{leadBudget}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666;">📍 Area:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333;">{{leadAreaOfTown}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666;">📅 Move-in Date:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333;">{{leadMoveInDate}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666;">📋 Source:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333;">{{leadSource}}</td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Comments if available -->
                                        {{#if leadComments}}
                                        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #666666; font-weight: 600;">💬 Comments:</p>
                                            <p style="margin: 0; font-size: 14px; color: #333333; line-height: 1.6;">{{leadComments}}</p>
                                        </div>
                                        {{/if}}
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                                <tr>
                                    <td align="center">
                                        <a href="{{trackingUrl_view_lead}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                                            View Lead in CRM →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Next Steps -->
                            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 4px; margin-bottom: 30px;">
                                <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #856404; font-weight: 600;">📋 Recommended Next Steps:</h3>
                                <ol style="margin: 0; padding-left: 20px; color: #856404; font-size: 14px; line-height: 1.8;">
                                    <li>Review lead preferences and requirements</li>
                                    <li>Contact lead within 24 hours</li>
                                    <li>Send Smart Match with curated property options</li>
                                    <li>Schedule property tours</li>
                                </ol>
                            </div>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
                                This is an automated notification from TRE CRM
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #999999;">
                                © 2025 Texas Relocation Experts. All rights reserved.
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
    
    <!-- Tracking Pixel -->
    <img src="{{trackingPixelUrl}}" width="1" height="1" style="display:none;" />
</body>
</html>',
    ARRAY['agentName', 'leadName', 'leadEmail', 'leadPhone', 'leadBedrooms', 'leadBathrooms', 'leadBudget', 'leadAreaOfTown', 'leadMoveInDate', 'leadSource', 'leadComments', 'leadDetailUrl', 'trackingPixelUrl', 'trackingUrl_view_lead', 'trackingUrl_lead_email', 'trackingUrl_lead_phone'],
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- ============================================
-- 2. AGENT LEAD RESPONSE EMAIL TEMPLATE
-- ============================================

INSERT INTO public.email_templates (id, name, subject, html_content, variables, created_at, updated_at)
VALUES (
    'agent_lead_response',
    'Agent Lead Response Notification',
    '✅ {{leadName}} Responded to Smart Match!',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lead Response</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

                    <!-- Header with Gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">✅ Lead Responded!</h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">{{leadName}} selected properties from their Smart Match</p>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">

                            <!-- Greeting -->
                            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">Hi {{agentName}},</p>
                            <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                                Great news! <strong>{{leadName}}</strong> has responded to their Smart Match email and selected properties they''re interested in.
                            </p>

                            <!-- Response Summary -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; margin-bottom: 30px; border: 2px solid #10b981;">
                                <tr>
                                    <td style="padding: 25px; text-align: center;">
                                        <h2 style="margin: 0 0 15px 0; font-size: 24px; color: #059669; font-weight: 600;">{{propertiesSelected}} Properties Selected</h2>
                                        <p style="margin: 0; font-size: 16px; color: #047857;">
                                            {{tourRequestsCount}} Tour Requests
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Lead Contact Info -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #333333; font-weight: 600;">Lead Contact Info</h3>
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666; width: 100px;">📧 Email:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333;"><a href="{{trackingUrl_lead_email}}" style="color: #10b981; text-decoration: none;">{{leadEmail}}</a></td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666;">📱 Phone:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333;"><a href="{{trackingUrl_lead_phone}}" style="color: #10b981; text-decoration: none;">{{leadPhone}}</a></td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Selected Properties -->
                            <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #333333; font-weight: 600;">Selected Properties:</h3>
                            {{{selectedPropertiesList}}}

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{{trackingUrl_view_response}}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                                            View Full Response in CRM →
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Next Steps -->
                            <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 4px; margin-bottom: 30px;">
                                <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1e40af; font-weight: 600;">📋 Recommended Next Steps:</h3>
                                <ol style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px; line-height: 1.8;">
                                    <li>Contact lead to discuss their selections</li>
                                    <li>Schedule property tours for requested properties</li>
                                    <li>Prepare additional information about selected properties</li>
                                    <li>Follow up within 24 hours</li>
                                </ol>
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
                                This is an automated notification from TRE CRM
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #999999;">
                                © 2025 Texas Relocation Experts. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

    <!-- Tracking Pixel -->
    <img src="{{trackingPixelUrl}}" width="1" height="1" style="display:none;" />
</body>
</html>',
    ARRAY['agentName', 'leadName', 'leadEmail', 'leadPhone', 'propertiesSelected', 'tourRequestsCount', 'selectedPropertiesList', 'responseDate', 'leadDetailUrl', 'trackingPixelUrl', 'trackingUrl_view_response', 'trackingUrl_lead_email', 'trackingUrl_lead_phone'],
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- ============================================
-- 3. MORE OPTIONS REQUEST EMAIL TEMPLATE
-- ============================================

INSERT INTO public.email_templates (id, name, subject, html_content, variables, created_at, updated_at)
VALUES (
    'agent_more_options_request',
    'Agent More Options Request Notification',
    '🔄 {{leadName}} Wants More Property Options!',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>More Options Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

                    <!-- Header with Gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">🔄 More Options Requested</h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">{{leadName}} wants to see more properties</p>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">

                            <!-- Greeting -->
                            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">Hi {{agentName}},</p>
                            <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                                <strong>{{leadName}}</strong> has clicked "Send More Options" after viewing their current property matches. They''re ready to see additional options!
                            </p>

                            <!-- Request Summary -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; margin-bottom: 30px; border: 2px solid #f59e0b;">
                                <tr>
                                    <td style="padding: 25px; text-align: center;">
                                        <h2 style="margin: 0 0 10px 0; font-size: 20px; color: #92400e; font-weight: 600;">Properties Viewed</h2>
                                        <p style="margin: 0; font-size: 32px; color: #d97706; font-weight: 700;">{{propertiesViewed}}</p>
                                        <p style="margin: 10px 0 0 0; font-size: 14px; color: #92400e;">
                                            Requested at: {{requestedAt}}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Lead Contact Info -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #333333; font-weight: 600;">Lead Contact Info</h3>
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666; width: 100px;">📧 Email:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333;"><a href="{{trackingUrl_lead_email}}" style="color: #f59e0b; text-decoration: none;">{{leadEmail}}</a></td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666;">📱 Phone:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333;"><a href="{{trackingUrl_lead_phone}}" style="color: #f59e0b; text-decoration: none;">{{leadPhone}}</a></td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                                <tr>
                                    <td align="center">
                                        <a href="{{trackingUrl_send_match}}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);">
                                            Send New Smart Match →
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Next Steps -->
                            <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 4px; margin-bottom: 30px;">
                                <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1e40af; font-weight: 600;">📋 Recommended Next Steps:</h3>
                                <ol style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px; line-height: 1.8;">
                                    <li>Review lead''s preferences and previous selections</li>
                                    <li>Curate new property matches based on their criteria</li>
                                    <li>Send updated Smart Match email with fresh options</li>
                                    <li>Follow up to discuss their preferences</li>
                                </ol>
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
                                This is an automated notification from TRE CRM
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #999999;">
                                © 2025 Texas Relocation Experts. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

    <!-- Tracking Pixel -->
    <img src="{{trackingPixelUrl}}" width="1" height="1" style="display:none;" />
</body>
</html>',
    ARRAY['agentName', 'leadName', 'leadEmail', 'leadPhone', 'propertiesViewed', 'requestedAt', 'leadDetailUrl', 'sendSmartMatchUrl', 'trackingPixelUrl', 'trackingUrl_send_match', 'trackingUrl_lead_email', 'trackingUrl_lead_phone'],
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- ============================================
-- 4. HEALTH STATUS CHANGE EMAIL TEMPLATE
-- ============================================

INSERT INTO public.email_templates (id, name, subject, html_content, variables, created_at, updated_at)
VALUES (
    'agent_health_status_changed',
    'Agent Health Status Change Notification',
    '⚠️ Lead Health Alert: {{leadName}} is now {{newStatus}}',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Health Status Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

                    <!-- Header with Gradient (color based on severity) -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">⚠️ Health Status Alert</h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Lead health status has changed</p>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">

                            <!-- Greeting -->
                            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">Hi {{agentName}},</p>
                            <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                                The health status for <strong>{{leadName}}</strong> has changed and requires your attention.
                            </p>

                            <!-- Status Change Summary -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fee2e2; border-radius: 8px; margin-bottom: 30px; border: 2px solid #ef4444;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="width: 50%; text-align: center; padding: 10px;">
                                                    <p style="margin: 0 0 5px 0; font-size: 14px; color: #991b1b;">Previous Status</p>
                                                    <p style="margin: 0; font-size: 24px; font-weight: 700; color: #dc2626; text-transform: uppercase;">{{previousStatus}}</p>
                                                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #991b1b;">Score: {{previousScore}}</p>
                                                </td>
                                                <td style="width: 50%; text-align: center; padding: 10px; border-left: 2px solid #ef4444;">
                                                    <p style="margin: 0 0 5px 0; font-size: 14px; color: #991b1b;">New Status</p>
                                                    <p style="margin: 0; font-size: 24px; font-weight: 700; color: #dc2626; text-transform: uppercase;">{{newStatus}}</p>
                                                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #991b1b;">Score: {{newScore}}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Lead Contact Info -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #333333; font-weight: 600;">Lead Contact Info</h3>
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666; width: 100px;">📧 Email:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333;"><a href="{{trackingUrl_lead_email}}" style="color: #ef4444; text-decoration: none;">{{leadEmail}}</a></td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666;">📱 Phone:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333;"><a href="{{trackingUrl_lead_phone}}" style="color: #ef4444; text-decoration: none;">{{leadPhone}}</a></td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                                <tr>
                                    <td align="center">
                                        <a href="{{trackingUrl_view_lead}}" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3);">
                                            View Lead in CRM →
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Next Steps -->
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 4px; margin-bottom: 30px;">
                                <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #92400e; font-weight: 600;">📋 Recommended Actions:</h3>
                                <ol style="margin: 0; padding-left: 20px; color: #92400e; font-size: 14px; line-height: 1.8;">
                                    <li>Contact lead immediately to re-engage</li>
                                    <li>Review recent activity and identify issues</li>
                                    <li>Send new property matches or updates</li>
                                    <li>Schedule follow-up call or meeting</li>
                                </ol>
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
                                This is an automated notification from TRE CRM
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #999999;">
                                © 2025 Texas Relocation Experts. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

    <!-- Tracking Pixel -->
    <img src="{{trackingPixelUrl}}" width="1" height="1" style="display:none;" />
</body>
</html>',
    ARRAY['agentName', 'leadName', 'leadEmail', 'leadPhone', 'previousStatus', 'newStatus', 'previousScore', 'newScore', 'changedAt', 'leadDetailUrl', 'trackingPixelUrl', 'trackingUrl_view_lead', 'trackingUrl_lead_email', 'trackingUrl_lead_phone'],
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- ============================================
-- 5. INACTIVITY ALERT EMAIL TEMPLATE
-- ============================================

INSERT INTO public.email_templates (id, name, subject, html_content, variables, created_at, updated_at)
VALUES (
    'agent_inactivity_alert',
    'Agent Inactivity Alert Notification',
    '⏰ Inactivity Alert: {{leadName}} Needs Attention',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inactivity Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

                    <!-- Header with Gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">⏰ Inactivity Alert</h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Lead needs immediate attention</p>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">

                            <!-- Greeting -->
                            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">Hi {{agentName}},</p>
                            <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                                <strong>{{leadName}}</strong> has been inactive for an extended period and needs your attention to prevent the lead from going cold.
                            </p>

                            <!-- Inactivity Summary -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; margin-bottom: 30px; border: 2px solid #f59e0b;">
                                <tr>
                                    <td style="padding: 25px; text-align: center;">
                                        <h2 style="margin: 0 0 10px 0; font-size: 20px; color: #92400e; font-weight: 600;">Time Since Last Activity</h2>
                                        <p style="margin: 0; font-size: 48px; color: #d97706; font-weight: 700;">{{hoursSinceActivity}}</p>
                                        <p style="margin: 5px 0 0 0; font-size: 18px; color: #92400e; font-weight: 600;">Hours</p>
                                        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #fbbf24;">
                                            <p style="margin: 0 0 5px 0; font-size: 14px; color: #92400e;">Last Activity:</p>
                                            <p style="margin: 0; font-size: 16px; color: #78350f; font-weight: 600;">{{lastActivityDate}}</p>
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <!-- Health Status Update -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fee2e2; border-radius: 8px; margin-bottom: 30px; border: 2px solid #ef4444;">
                                <tr>
                                    <td style="padding: 20px; text-align: center;">
                                        <p style="margin: 0 0 5px 0; font-size: 14px; color: #991b1b;">New Health Status</p>
                                        <p style="margin: 0; font-size: 24px; font-weight: 700; color: #dc2626; text-transform: uppercase;">{{newHealthStatus}}</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Lead Contact Info -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #333333; font-weight: 600;">Lead Contact Info</h3>
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666; width: 100px;">📧 Email:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333;"><a href="{{trackingUrl_lead_email}}" style="color: #f59e0b; text-decoration: none;">{{leadEmail}}</a></td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666;">📱 Phone:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333;"><a href="{{trackingUrl_lead_phone}}" style="color: #f59e0b; text-decoration: none;">{{leadPhone}}</a></td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                                <tr>
                                    <td align="center">
                                        <a href="{{trackingUrl_view_lead}}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);">
                                            View Lead in CRM →
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Urgent Actions -->
                            <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 4px; margin-bottom: 30px;">
                                <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #991b1b; font-weight: 600;">🚨 Urgent Actions Required:</h3>
                                <ol style="margin: 0; padding-left: 20px; color: #991b1b; font-size: 14px; line-height: 1.8;">
                                    <li><strong>Contact lead immediately</strong> - Call or email today</li>
                                    <li>Review lead history and identify engagement gaps</li>
                                    <li>Send fresh property matches or market updates</li>
                                    <li>Schedule follow-up appointment</li>
                                    <li>Update lead notes with action plan</li>
                                </ol>
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
                                This is an automated notification from TRE CRM
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #999999;">
                                © 2025 Texas Relocation Experts. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

    <!-- Tracking Pixel -->
    <img src="{{trackingPixelUrl}}" width="1" height="1" style="display:none;" />
</body>
</html>',
    ARRAY['agentName', 'leadName', 'leadEmail', 'leadPhone', 'hoursSinceActivity', 'lastActivityDate', 'lastActivityType', 'newHealthStatus', 'leadDetailUrl', 'trackingPixelUrl', 'trackingUrl_view_lead', 'trackingUrl_lead_email', 'trackingUrl_lead_phone'],
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content,
    variables = EXCLUDED.variables,
    updated_at = NOW();

