-- Migration 051: Update Welcome Email Template
-- Purpose: Enhance welcome email with modern design matching Smart Match email
-- - Clean white card design (no purple gradient)
-- - Clickable CTAs throughout
-- - Mobile-responsive layout
-- - Agent contact card with clickable links
-- - Proper button text color with !important flag

-- ============================================
-- UPDATE WELCOME EMAIL TEMPLATE
-- ============================================

UPDATE public.email_templates
SET 
    subject = 'Welcome to TRE - Your Texas Real Estate Journey Starts Here! 🏠',
    html_content = '<!DOCTYPE html>
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
            background: #ffffff; 
            padding: 40px 30px 20px 30px; 
            text-align: center; 
            border-bottom: 3px solid #6366f1;
        }
        .header h1 { 
            margin: 0; 
            font-size: 32px; 
            font-weight: 700; 
            color: #111827;
        }
        .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            color: #6b7280;
        }
        .content { 
            padding: 40px 30px; 
        }
        .content h2 { 
            color: #111827; 
            margin-top: 0; 
            font-size: 24px;
        }
        .content p { 
            margin: 15px 0; 
            color: #4b5563;
            font-size: 16px;
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
        .agent-card { 
            background: #f9fafb; 
            border: 1px solid #e5e7eb; 
            border-radius: 12px; 
            padding: 24px; 
            margin: 24px 0; 
        }
        .agent-card h3 {
            margin: 0 0 16px 0;
            color: #111827;
            font-size: 18px;
        }
        .agent-detail {
            margin: 12px 0;
            color: #4b5563;
            font-size: 15px;
        }
        .agent-detail a {
            color: #6366f1;
            text-decoration: none;
            font-weight: 500;
        }
        .agent-detail a:hover {
            text-decoration: underline;
        }
        .next-steps {
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin: 24px 0;
            border-radius: 8px;
        }
        .next-steps h3 {
            margin: 0 0 12px 0;
            color: #1e40af;
            font-size: 18px;
        }
        .next-steps ul {
            margin: 0;
            padding-left: 20px;
        }
        .next-steps li {
            margin: 8px 0;
            color: #1e3a8a;
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
                padding: 30px 20px 15px 20px;
            }
            .header h1 {
                font-size: 24px;
            }
            .content {
                padding: 30px 20px;
            }
            .content h2 {
                font-size: 20px;
            }
            .cta-button {
                display: block;
                text-align: center;
                padding: 12px 24px;
            }
            .agent-card {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏠 Welcome to Texas Relocation Experts!</h1>
            <p>Your journey to finding the perfect home starts here</p>
        </div>
        <div class="content">
            <h2>Hi {{leadName}}! 👋</h2>
            <p>Thank you for choosing Texas Relocation Experts to help you find your perfect home in Texas! We''re thrilled to be part of your relocation journey.</p>
            
            <p>Our team specializes in helping people like you find the ideal property that matches your lifestyle, budget, and preferences. We''re here to make your move to Texas as smooth and stress-free as possible.</p>
            
            <div class="agent-card">
                <h3>👤 Your Dedicated Relocation Expert</h3>
                <div class="agent-detail">
                    <strong>{{agentName}}</strong>
                </div>
                <div class="agent-detail">
                    📧 Email: <a href="mailto:{{agentEmail}}">{{agentEmail}}</a>
                </div>
                <div class="agent-detail">
                    📱 Phone: <a href="tel:{{agentPhone}}">{{agentPhone}}</a>
                </div>
            </div>
            
            <div class="next-steps">
                <h3>📋 What Happens Next?</h3>
                <ul>
                    <li><strong>Within 24 hours:</strong> Your agent will reach out to discuss your needs</li>
                    <li><strong>Personalized matches:</strong> We''ll send you properties that fit your criteria</li>
                    <li><strong>Property tours:</strong> Schedule visits to your favorite properties</li>
                    <li><strong>Expert guidance:</strong> We''ll support you through every step of the process</li>
                </ul>
            </div>
            
            <p style="text-align: center; margin: 32px 0;">
                <a href="mailto:{{agentEmail}}" class="cta-button">
                    📧 Contact Your Agent
                </a>
            </p>
            
            <p>Have questions right now? Don''t hesitate to reach out to {{agentName}} directly via email or phone. We''re here to help!</p>
            
            <p style="margin-top: 32px;">
                <strong>Welcome to the TRE family!</strong><br>
                The Texas Relocation Experts Team
            </p>
        </div>
        <div class="footer">
            <p><strong>Texas Relocation Experts</strong></p>
            <p>© 2025 TRE CRM. All rights reserved.</p>
            <p style="margin-top: 12px; font-size: 12px;">
                You received this email because you submitted an inquiry through our website.<br>
                If you have any questions, please contact your agent directly.
            </p>
        </div>
    </div>
</body>
</html>',
    text_content = 'Welcome to Texas Relocation Experts!

Hi {{leadName}}!

Thank you for choosing Texas Relocation Experts to help you find your perfect home in Texas! We''re thrilled to be part of your relocation journey.

Our team specializes in helping people like you find the ideal property that matches your lifestyle, budget, and preferences. We''re here to make your move to Texas as smooth and stress-free as possible.

YOUR DEDICATED RELOCATION EXPERT
{{agentName}}
Email: {{agentEmail}}
Phone: {{agentPhone}}

WHAT HAPPENS NEXT?
- Within 24 hours: Your agent will reach out to discuss your needs
- Personalized matches: We''ll send you properties that fit your criteria
- Property tours: Schedule visits to your favorite properties
- Expert guidance: We''ll support you through every step of the process

Have questions right now? Don''t hesitate to reach out to {{agentName}} directly via email or phone. We''re here to help!

Welcome to the TRE family!
The Texas Relocation Experts Team

---
Texas Relocation Experts
© 2025 TRE CRM. All rights reserved.

You received this email because you submitted an inquiry through our website.
If you have any questions, please contact your agent directly.',
    updated_at = NOW()
WHERE id = 'welcome_lead';

