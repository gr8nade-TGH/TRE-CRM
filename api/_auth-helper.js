/**
 * Authentication Helper for Vercel Serverless Functions
 *
 * SECURITY: Always use getUser(token) to validate JWT tokens in server-side code.
 * Never trust getSession() in server code - it can be spoofed!
 *
 * This module uses supabase.auth.getUser(token) which:
 * - Validates JWT signature against Supabase Auth server
 * - Returns fresh, verified user data
 * - Cannot be spoofed by malicious clients
 *
 * Reference: https://supabase.com/docs/guides/auth/server-side
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Validate JWT token and get user data
 * @param {Request} req - HTTP request object
 * @param {Object} supabase - Supabase client instance
 * @returns {Promise<{valid: boolean, user: Object|null, error: string|null}>}
 */
export async function validateAuth(req, supabase) {
    try {
        // Get Authorization header
        const authHeader = req.headers.authorization || req.headers.Authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                valid: false,
                user: null,
                error: 'Missing or invalid Authorization header'
            };
        }

        // Extract JWT token
        const token = authHeader.replace('Bearer ', '');

        // ✅ SAFE: Validate JWT using getUser(token)
        // This sends a request to Supabase Auth server to verify the JWT signature
        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data.user) {
            console.error('❌ JWT validation failed:', error);
            return {
                valid: false,
                user: null,
                error: error?.message || 'Invalid token'
            };
        }

        console.log('✅ JWT validated for user:', data.user.email, 'role:', data.user.user_metadata?.role);

        return {
            valid: true,
            user: data.user,
            error: null
        };

    } catch (error) {
        console.error('❌ Auth validation error:', error);
        return {
            valid: false,
            user: null,
            error: 'Authentication failed'
        };
    }
}

/**
 * Check if user has required role
 * @param {Object} user - User object from validateAuth
 * @param {string[]} allowedRoles - Array of allowed roles (e.g., ['MANAGER', 'SUPER_USER'])
 * @returns {boolean}
 */
export function hasRole(user, allowedRoles) {
    if (!user || !user.user_metadata) {
        return false;
    }

    const userRole = user.user_metadata.role;
    return allowedRoles.includes(userRole);
}

/**
 * Middleware to require authentication
 * Returns 401 if not authenticated
 * @param {Request} req
 * @param {Response} res
 * @param {Object} supabase
 * @returns {Promise<Object|null>} User object if authenticated, null if response already sent
 */
export async function requireAuth(req, res, supabase) {
    const { valid, user, error } = await validateAuth(req, supabase);

    if (!valid) {
        res.status(401).json({
            error: 'Unauthorized',
            message: error
        });
        return null;
    }

    return user;
}

/**
 * Middleware to require specific role
 * Returns 401 if not authenticated, 403 if wrong role
 * @param {Request} req
 * @param {Response} res
 * @param {Object} supabase
 * @param {string[]} allowedRoles
 * @returns {Promise<Object|null>} User object if authorized, null if response already sent
 */
export async function requireRole(req, res, supabase, allowedRoles) {
    const user = await requireAuth(req, res, supabase);

    if (!user) {
        return null; // Response already sent by requireAuth
    }

    if (!hasRole(user, allowedRoles)) {
        res.status(403).json({
            error: 'Forbidden',
            message: 'Insufficient permissions'
        });
        return null;
    }

    return user;
}

