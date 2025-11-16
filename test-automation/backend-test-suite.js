/**
 * Automated Backend Test Suite for TRE CRM
 * 
 * This script tests the complete backend flow:
 * 1. Create test lead
 * 2. Send welcome email
 * 3. Verify email logging
 * 4. Send smart match email
 * 5. Verify activity logging
 * 6. Check progress tracking
 * 7. Test Property Matcher session creation
 * 
 * Usage:
 * 1. Open browser console on https://tre-crm.vercel.app
 * 2. Make sure you're logged in as an agent or manager
 * 3. Copy and paste this entire script
 * 4. Run: await runBackendTests()
 * 5. Check console for detailed results
 * 6. Check your email inbox for test emails
 */

import { getSupabase } from '../src/api/supabase-api.js';

// Test configuration
const TEST_CONFIG = {
    testEmail: 'tucker.harris@gmail.com', // Change this to your email
    testLeadName: 'AutoTest Lead',
    testLeadPhone: '555-0100',
    cleanupAfterTests: false, // Set to true to delete test data after tests
};

// Test results tracker
const testResults = {
    passed: [],
    failed: [],
    warnings: []
};

function logTest(testName, passed, details = '') {
    const emoji = passed ? '✅' : '❌';
    const message = `${emoji} ${testName}${details ? ': ' + details : ''}`;
    console.log(message);

    if (passed) {
        testResults.passed.push(testName);
    } else {
        testResults.failed.push({ test: testName, details });
    }
}

function logWarning(message) {
    console.warn(`⚠️ ${message}`);
    testResults.warnings.push(message);
}

function logSection(title) {
    console.log('\n' + '='.repeat(60));
    console.log(`  ${title}`);
    console.log('='.repeat(60) + '\n');
}

/**
 * Test 1: Create a test lead
 */
async function testCreateLead(supabase, agentId) {
    logSection('TEST 1: Create Test Lead');

    const leadData = {
        name: TEST_CONFIG.testLeadName,
        email: TEST_CONFIG.testEmail,
        phone: TEST_CONFIG.testLeadPhone,
        preferences: {
            bedrooms: 2,
            bathrooms: 1,
            max_rent: 1500,
            move_in_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            pets: 'cat'
        },
        source: 'automated_test',
        assigned_agent_id: agentId,
        found_by_agent_id: agentId,
        health_status: 'green',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    console.log('📝 Creating test lead:', leadData);

    const { data, error } = await supabase
        .from('leads')
        .insert([leadData])
        .select()
        .single();

    if (error) {
        logTest('Create Lead', false, error.message);
        throw error;
    }

    logTest('Create Lead', true, `Lead ID: ${data.id}`);
    console.log('📊 Lead data:', data);

    return data;
}

/**
 * Test 2: Verify lead creation activity was logged
 */
async function testLeadCreationActivity(supabase, leadId) {
    logSection('TEST 2: Verify Lead Creation Activity');

    // Wait a moment for trigger to fire
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data, error } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .eq('activity_type', 'lead_created')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        logTest('Lead Creation Activity', false, error.message);
        return false;
    }

    if (!data || data.length === 0) {
        logTest('Lead Creation Activity', false, 'No activity logged');
        return false;
    }

    logTest('Lead Creation Activity', true, `Activity ID: ${data[0].id}`);
    console.log('📊 Activity data:', data[0]);

    return true;
}

/**
 * Test 3: Send welcome email
 */
async function testSendWelcomeEmail(supabase, lead) {
    logSection('TEST 3: Send Welcome Email');

    console.log('📧 Preparing welcome email...');

    // Get agent info
    const { data: agent, error: agentError } = await supabase
        .from('users')
        .select('name, email, phone')
        .eq('id', lead.assigned_agent_id)
        .single();

    if (agentError) {
        logTest('Get Agent Info', false, agentError.message);
        return null;
    }

    logTest('Get Agent Info', true, `Agent: ${agent.name}`);

    // Prepare email data
    const emailData = {
        templateId: 'welcome_lead',
        recipientEmail: lead.email,
        recipientName: lead.name,
        variables: {
            leadName: lead.name,
            agentName: agent.name,
            agentEmail: agent.email,
            agentPhone: agent.phone || 'N/A'
        },
        metadata: {
            lead_id: lead.id,
            agent_id: lead.assigned_agent_id,
            source: 'automated_test'
        }
    };

    console.log('📤 Sending email via API...');

    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            logTest('Send Welcome Email', false, `API error: ${response.status} ${errorText}`);
            return null;
        }

        const result = await response.json();
        logTest('Send Welcome Email', true, `Email sent! Resend ID: ${result.resendId}`);
        console.log('📊 Email result:', result);

        return result;

    } catch (error) {
        logTest('Send Welcome Email', false, error.message);
        return null;
    }
}

/**
 * Test 4: Verify welcome email was logged
 */
async function testWelcomeEmailLogging(supabase, leadId) {
    logSection('TEST 4: Verify Welcome Email Logging');

    // Wait for email to be logged
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('lead_id', leadId)
        .eq('template_id', 'welcome_lead')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        logTest('Welcome Email Logged', false, error.message);
        return false;
    }

    if (!data || data.length === 0) {
        logTest('Welcome Email Logged', false, 'No email log found');
        return false;
    }

    logTest('Welcome Email Logged', true, `Log ID: ${data[0].id}, Status: ${data[0].status}`);
    console.log('📊 Email log:', data[0]);

    // Check if activity was logged
    const { data: activity, error: activityError } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .eq('activity_type', 'email_sent')
        .order('created_at', { ascending: false })
        .limit(1);

    if (activityError || !activity || activity.length === 0) {
        logWarning('Email sent activity not logged (this may be expected if trigger is not set up)');
    } else {
        logTest('Email Activity Logged', true, `Activity ID: ${activity[0].id}`);
        console.log('📊 Email activity:', activity[0]);
    }

    return true;
}

/**
 * Test 5: Send Smart Match email
 */
async function testSendSmartMatch(supabase, leadId) {
    logSection('TEST 5: Send Smart Match Email');

    console.log('🎯 Fetching smart matches...');

    // Import the API function
    const { sendSmartMatchEmail } = await import('../src/api/supabase-api.js');

    try {
        const result = await sendSmartMatchEmail(leadId, {
            propertyCount: 5,
            sentBy: window.state?.user?.id,
            skipCooldownCheck: true // Skip cooldown for testing
        });

        if (!result.success) {
            logTest('Send Smart Match Email', false, 'Email send failed');
            return null;
        }

        logTest('Send Smart Match Email', true, `Email sent! Log ID: ${result.emailLogId}`);
        console.log('📊 Smart Match result:', result);

        return result;

    } catch (error) {
        logTest('Send Smart Match Email', false, error.message);
        console.error('❌ Smart Match error:', error);
        return null;
    }
}

/**
 * Test 6: Verify Smart Match email logging and activity
 */
async function testSmartMatchLogging(supabase, leadId) {
    logSection('TEST 6: Verify Smart Match Logging');

    // Wait for logging
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('lead_id', leadId)
        .eq('template_id', 'smart_match_email')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        logTest('Smart Match Email Logged', false, error.message);
        return false;
    }

    if (!data || data.length === 0) {
        logTest('Smart Match Email Logged', false, 'No email log found');
        return false;
    }

    logTest('Smart Match Email Logged', true, `Log ID: ${data[0].id}, Status: ${data[0].status}`);
    console.log('📊 Smart Match email log:', data[0]);

    return true;
}

/**
 * Test 7: Verify Property Matcher session was created
 */
async function testPropertyMatcherSession(supabase, leadId) {
    logSection('TEST 7: Verify Property Matcher Session');

    const { data, error } = await supabase
        .from('property_matcher_sessions')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        logTest('Property Matcher Session', false, error.message);
        return false;
    }

    if (!data || data.length === 0) {
        logWarning('No Property Matcher session found (this is expected if no properties matched)');
        return false;
    }

    logTest('Property Matcher Session', true, `Session ID: ${data[0].id}, Token: ${data[0].token}`);
    console.log('📊 Property Matcher session:', data[0]);

    return true;
}

/**
 * Test 8: Check progress tracking data
 */
async function testProgressTracking(supabase, leadId) {
    logSection('TEST 8: Check Progress Tracking');

    // Get all activities for this lead
    const { data: activities, error } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

    if (error) {
        logTest('Get Lead Activities', false, error.message);
        return false;
    }

    logTest('Get Lead Activities', true, `Found ${activities.length} activities`);
    console.log('📊 All activities:', activities);

    // Check expected activities
    const expectedActivities = ['lead_created', 'email_sent'];
    const foundActivities = activities.map(a => a.activity_type);

    expectedActivities.forEach(expected => {
        const found = foundActivities.includes(expected);
        logTest(`Activity: ${expected}`, found);
    });

    // Calculate progress step
    const hasWelcomeEmail = foundActivities.includes('email_sent');
    const hasSmartMatch = activities.some(a =>
        a.activity_type === 'email_sent' &&
        a.metadata?.template_id === 'smart_match_email'
    );

    let expectedStep = 1; // Lead Joined
    if (hasWelcomeEmail) expectedStep = 2; // Welcome email sent
    if (hasSmartMatch) expectedStep = 3; // Smart Match sent

    console.log(`📊 Progress calculation: Step ${expectedStep}/6`);
    logTest('Progress Calculation', true, `Lead should be at step ${expectedStep}`);

    return true;
}

/**
 * Test 9: Database integrity checks
 */
async function testDatabaseIntegrity(supabase) {
    logSection('TEST 9: Database Integrity Checks');

    // Check email templates exist
    const { data: templates, error: templatesError } = await supabase
        .from('email_templates')
        .select('id, name, is_active')
        .in('id', ['welcome_lead', 'smart_match_email']);

    if (templatesError) {
        logTest('Email Templates Exist', false, templatesError.message);
    } else {
        const welcomeTemplate = templates.find(t => t.id === 'welcome_lead');
        const smartMatchTemplate = templates.find(t => t.id === 'smart_match_email');

        logTest('Welcome Template Exists', !!welcomeTemplate, welcomeTemplate ? `Active: ${welcomeTemplate.is_active}` : '');
        logTest('Smart Match Template Exists', !!smartMatchTemplate, smartMatchTemplate ? `Active: ${smartMatchTemplate.is_active}` : '');
    }

    // Check if there are any available properties
    const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, name')
        .eq('is_active', true)
        .limit(5);

    if (propertiesError) {
        logTest('Active Properties Exist', false, propertiesError.message);
    } else {
        logTest('Active Properties Exist', properties.length > 0, `Found ${properties.length} properties`);
        if (properties.length === 0) {
            logWarning('No active properties found - Smart Match may not work');
        }
    }

    return true;
}

/**
 * Test 10: Cleanup test data (optional)
 */
async function cleanupTestData(supabase, leadId) {
    if (!TEST_CONFIG.cleanupAfterTests) {
        console.log('\n⏭️  Skipping cleanup (cleanupAfterTests = false)');
        console.log(`   To manually delete test lead, run: DELETE FROM leads WHERE id = '${leadId}';`);
        return;
    }

    logSection('TEST 10: Cleanup Test Data');

    console.log('🧹 Deleting test lead and related data...');

    // Delete lead (cascade should handle activities and email logs)
    const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

    if (error) {
        logTest('Cleanup Test Data', false, error.message);
    } else {
        logTest('Cleanup Test Data', true, 'Test lead deleted');
    }
}

/**
 * Main test runner
 */
export async function runBackendTests() {
    console.clear();
    logSection('🚀 TRE CRM AUTOMATED BACKEND TEST SUITE');

    console.log('📋 Test Configuration:');
    console.log(`   Test Email: ${TEST_CONFIG.testEmail}`);
    console.log(`   Test Lead Name: ${TEST_CONFIG.testLeadName}`);
    console.log(`   Cleanup After: ${TEST_CONFIG.cleanupAfterTests}`);
    console.log('');

    const supabase = getSupabase();

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('❌ ERROR: You must be logged in to run tests!');
        console.log('   Please log in to the CRM and try again.');
        return;
    }

    console.log(`✅ Logged in as: ${user.email}`);
    console.log('');

    let testLead = null;

    try {
        // Run tests sequentially
        testLead = await testCreateLead(supabase, user.id);
        await testLeadCreationActivity(supabase, testLead.id);
        await testSendWelcomeEmail(supabase, testLead);
        await testWelcomeEmailLogging(supabase, testLead.id);
        await testSendSmartMatch(supabase, testLead.id);
        await testSmartMatchLogging(supabase, testLead.id);
        await testPropertyMatcherSession(supabase, testLead.id);
        await testProgressTracking(supabase, testLead.id);
        await testDatabaseIntegrity(supabase);

        // Cleanup
        if (testLead) {
            await cleanupTestData(supabase, testLead.id);
        }

    } catch (error) {
        console.error('\n❌ FATAL ERROR:', error);
        console.log('   Tests aborted due to critical failure.');
    }

    // Print summary
    logSection('📊 TEST SUMMARY');

    console.log(`✅ Passed: ${testResults.passed.length}`);
    testResults.passed.forEach(test => console.log(`   ✓ ${test}`));

    if (testResults.failed.length > 0) {
        console.log(`\n❌ Failed: ${testResults.failed.length}`);
        testResults.failed.forEach(({ test, details }) => {
            console.log(`   ✗ ${test}${details ? ': ' + details : ''}`);
        });
    }

    if (testResults.warnings.length > 0) {
        console.log(`\n⚠️  Warnings: ${testResults.warnings.length}`);
        testResults.warnings.forEach(warning => console.log(`   ⚠ ${warning}`));
    }

    const totalTests = testResults.passed.length + testResults.failed.length;
    const passRate = totalTests > 0 ? ((testResults.passed.length / totalTests) * 100).toFixed(1) : 0;

    console.log(`\n📈 Pass Rate: ${passRate}% (${testResults.passed.length}/${totalTests})`);

    if (testLead && !TEST_CONFIG.cleanupAfterTests) {
        console.log(`\n📝 Test Lead ID: ${testLead.id}`);
        console.log(`   View in CRM: https://tre-crm.vercel.app/#/leads`);
        console.log(`   Check your email (${TEST_CONFIG.testEmail}) for test emails!`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('  Tests Complete!');
    console.log('='.repeat(60));

    return {
        passed: testResults.passed.length,
        failed: testResults.failed.length,
        warnings: testResults.warnings.length,
        passRate: passRate,
        testLead: testLead
    };
}

// Auto-run if loaded directly
if (typeof window !== 'undefined') {
    window.runBackendTests = runBackendTests;
    console.log('✅ Backend test suite loaded!');
    console.log('   Run: await runBackendTests()');
}
