-- Migration 037: Create email templates and email logs tables
-- Purpose: Store email templates and track all sent emails via Resend

-- ============================================
-- 1. EMAIL TEMPLATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.email_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    description TEXT,
    variables JSONB, -- Array of variable names used in template (e.g., ["leadName", "agentName"])
    category TEXT, -- 'lead', 'agent', 'document', 'system'
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for email_templates
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON public.email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON public.email_templates(active);

-- ============================================
-- 2. EMAIL LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id TEXT REFERENCES public.email_templates(id),
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'bounced'
    resend_id TEXT, -- ID from Resend API response
    error_message TEXT,
    metadata JSONB, -- Additional context (lead_id, agent_id, etc.)
    sent_by TEXT REFERENCES public.users(id), -- User who triggered the email (if applicable)
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for email_logs
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON public.email_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id ON public.email_logs(resend_id);

-- ============================================
-- 3. AUTO-UPDATE TIMESTAMP TRIGGERS
-- ============================================

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_logs_updated_at
    BEFORE UPDATE ON public.email_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Email Templates Policies
CREATE POLICY "Anyone can view active email templates" ON public.email_templates
    FOR SELECT USING (active = true);

CREATE POLICY "Managers can manage email templates" ON public.email_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()::text
            AND users.role IN ('MANAGER', 'SUPER_USER')
        )
    );

-- Email Logs Policies
CREATE POLICY "Users can view email logs" ON public.email_logs
    FOR SELECT USING (
        auth.uid() IS NOT NULL
    );

CREATE POLICY "System can insert email logs" ON public.email_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update email logs" ON public.email_logs
    FOR UPDATE USING (true);

-- ============================================
-- 5. SEED EMAIL TEMPLATES
-- ============================================

-- Welcome Email Template
INSERT INTO public.email_templates (id, name, subject, html_content, text_content, description, variables, category, active)
VALUES (
    'welcome_lead',
    'Welcome New Lead',
    'Welcome to TRE - Your Texas Real Estate Journey Starts Here!',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 40px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
        .content { padding: 40px 30px; }
        .content h2 { color: #667eea; margin-top: 0; }
        .content p { margin: 15px 0; }
        .cta-button { display: inline-block; background: #667eea; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
        .cta-button:hover { background: #5568d3; }
        .agent-info { background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏠 Welcome to TRE CRM</h1>
        </div>
        <div class="content">
            <h2>Hi {{leadName}}!</h2>
            <p>Thank you for your interest in finding your perfect home in Texas! We''re excited to help you on your real estate journey.</p>
            
            <div class="agent-info">
                <strong>Your Dedicated Agent:</strong><br>
                <strong>{{agentName}}</strong><br>
                📧 {{agentEmail}}<br>
                📱 {{agentPhone}}
            </div>
            
            <p>Your agent will be reaching out to you shortly to discuss your needs and preferences. In the meantime, feel free to browse our available properties.</p>
            
            <p><strong>What happens next?</strong></p>
            <ul>
                <li>Your agent will contact you within 24 hours</li>
                <li>We''ll discuss your housing needs and preferences</li>
                <li>You''ll receive personalized property recommendations</li>
                <li>We''ll schedule property tours at your convenience</li>
            </ul>
            
            <p>If you have any immediate questions, don''t hesitate to reach out to your agent directly!</p>
            
            <p>Best regards,<br>
            <strong>The TRE Team</strong></p>
        </div>
        <div class="footer">
            <p>© 2025 TRE CRM. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>',
    'Hi {{leadName}}!

Thank you for your interest in finding your perfect home in Texas! We''re excited to help you on your real estate journey.

Your Dedicated Agent:
{{agentName}}
Email: {{agentEmail}}
Phone: {{agentPhone}}

Your agent will be reaching out to you shortly to discuss your needs and preferences.

What happens next?
- Your agent will contact you within 24 hours
- We''ll discuss your housing needs and preferences
- You''ll receive personalized property recommendations
- We''ll schedule property tours at your convenience

If you have any immediate questions, don''t hesitate to reach out to your agent directly!

Best regards,
The TRE Team

---
© 2025 TRE CRM. All rights reserved.
This is an automated message. Please do not reply to this email.',
    'Welcome email sent to new leads when they are created in the system',
    '["leadName", "agentName", "agentEmail", "agentPhone"]'::jsonb,
    'lead',
    true
) ON CONFLICT (id) DO NOTHING;

-- Agent Assignment Email Template
INSERT INTO public.email_templates (id, name, subject, html_content, text_content, description, variables, category, active)
VALUES (
    'agent_assignment',
    'New Lead Assignment',
    'New Lead Assigned: {{leadName}}',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 40px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
        .content { padding: 40px 30px; }
        .content h2 { color: #667eea; margin-top: 0; }
        .content p { margin: 15px 0; }
        .lead-card { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .lead-card h3 { margin-top: 0; color: #667eea; }
        .lead-detail { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
        .lead-detail:last-child { border-bottom: none; }
        .lead-detail strong { color: #495057; min-width: 120px; display: inline-block; }
        .cta-button { display: inline-block; background: #667eea; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
        .cta-button:hover { background: #5568d3; }
        .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .priority-high { background: #fee; color: #c00; }
        .priority-medium { background: #ffeaa7; color: #d63031; }
        .priority-low { background: #dfe6e9; color: #2d3436; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 New Lead Assigned</h1>
        </div>
        <div class="content">
            <h2>Hi {{agentName}}!</h2>
            <p>You have been assigned a new lead. Please review the details below and reach out to them within 24 hours.</p>
            
            <div class="lead-card">
                <h3>{{leadName}}</h3>
                <div class="lead-detail">
                    <strong>📧 Email:</strong> {{leadEmail}}
                </div>
                <div class="lead-detail">
                    <strong>📱 Phone:</strong> {{leadPhone}}
                </div>
                <div class="lead-detail">
                    <strong>🏠 Move-in Date:</strong> {{moveInDate}}
                </div>
                <div class="lead-detail">
                    <strong>💰 Budget:</strong> {{budget}}
                </div>
                <div class="lead-detail">
                    <strong>📝 Notes:</strong> {{notes}}
                </div>
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <ul>
                <li>Review the lead details in the CRM</li>
                <li>Contact the lead within 24 hours</li>
                <li>Update the lead status after first contact</li>
                <li>Schedule a property tour if appropriate</li>
            </ul>
            
            <center>
                <a href="{{crmUrl}}#/leads" class="cta-button">View in CRM</a>
            </center>
            
            <p>Good luck!</p>
            
            <p>Best regards,<br>
            <strong>TRE CRM System</strong></p>
        </div>
        <div class="footer">
            <p>© 2025 TRE CRM. All rights reserved.</p>
            <p>This is an automated notification from your CRM system.</p>
        </div>
    </div>
</body>
</html>',
    'Hi {{agentName}}!

You have been assigned a new lead. Please review the details below and reach out to them within 24 hours.

Lead Details:
Name: {{leadName}}
Email: {{leadEmail}}
Phone: {{leadPhone}}
Move-in Date: {{moveInDate}}
Budget: {{budget}}
Notes: {{notes}}

Next Steps:
- Review the lead details in the CRM
- Contact the lead within 24 hours
- Update the lead status after first contact
- Schedule a property tour if appropriate

View in CRM: {{crmUrl}}#/leads

Good luck!

Best regards,
TRE CRM System

---
© 2025 TRE CRM. All rights reserved.
This is an automated notification from your CRM system.',
    'Email sent to agents when a new lead is assigned to them',
    '["agentName", "leadName", "leadEmail", "leadPhone", "moveInDate", "budget", "notes", "crmUrl"]'::jsonb,
    'agent',
    true
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. COMMENTS
-- ============================================

COMMENT ON TABLE public.email_templates IS 'Stores HTML email templates for automated emails';
COMMENT ON TABLE public.email_logs IS 'Logs all emails sent via Resend API';
COMMENT ON COLUMN public.email_templates.variables IS 'Array of variable names used in template (e.g., ["leadName", "agentName"])';
COMMENT ON COLUMN public.email_logs.resend_id IS 'ID returned from Resend API for tracking';
COMMENT ON COLUMN public.email_logs.metadata IS 'Additional context like lead_id, agent_id, etc.';

