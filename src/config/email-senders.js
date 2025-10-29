/**
 * Email Sender Configuration
 * 
 * Defines available sender email addresses for the TRE CRM.
 * These addresses must be verified in Resend before they can be used.
 */

export const EMAIL_SENDERS = [
    {
        email: 'noreply@tre-crm.com',
        name: 'TRE CRM',
        description: 'System notifications and automated emails',
        verified: true
    },
    {
        email: 'support@tre-crm.com',
        name: 'TRE Support',
        description: 'Customer support and help emails',
        verified: false // Set to true after verifying in Resend
    },
    {
        email: 'team@tre-crm.com',
        name: 'TRE Team',
        description: 'Team communications and updates',
        verified: false // Set to true after verifying in Resend
    }
];

/**
 * Get default sender (first verified sender)
 */
export function getDefaultSender() {
    return EMAIL_SENDERS.find(s => s.verified) || EMAIL_SENDERS[0];
}

/**
 * Get all verified senders
 */
export function getVerifiedSenders() {
    return EMAIL_SENDERS.filter(s => s.verified);
}

/**
 * Get sender by email address
 */
export function getSenderByEmail(email) {
    return EMAIL_SENDERS.find(s => s.email === email);
}

