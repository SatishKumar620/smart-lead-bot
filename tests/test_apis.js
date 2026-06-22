/**
 * Smart Lead Bot API Test Runner
 * Run with: node test_apis.js [target_url]
 * Default target_url: http://localhost:5173 (Vite development proxy)
 */

import crypto from 'crypto';

const baseUrl = process.argv[2] || 'http://localhost:5173';
console.log(`\x1b[35m====================================================\x1b[0m`);
console.log(`\x1b[35m🚀 SMART LEAD BOT API AUTOMATED TEST RUNNER\x1b[0m`);
console.log(`\x1b[35m   Target API Host: ${baseUrl}\x1b[0m`);
console.log(`\x1b[35m====================================================\x1b[0m\n`);

let jwtToken = '';
let testLeadId = '';
let testUserId = '';

const stats = {
  total: 0,
  passed: 0,
  failed: 0
};

async function runTest(name, path, method, headers = {}, body = null) {
  stats.total++;
  console.log(`\x1b[34m[TEST ${stats.total}] ${name}\x1b[0m`);
  console.log(`\x1b[90mMethod: ${method} | Endpoint: ${path}\x1b[0m`);
  
  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };
  if (jwtToken) {
    finalHeaders['Authorization'] = `Bearer ${jwtToken}`;
  }

  const startTime = Date.now();
  try {
    const options = {
      method,
      headers: finalHeaders
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${path}`, options);
    const duration = Date.now() - startTime;
    const isSuccess = response.ok;
    
    let responseData = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (isSuccess) {
      stats.passed++;
      console.log(`\x1b[32m✔ PASSED (${duration}ms) - Status: ${response.status}\x1b[0m`);
      if (responseData && typeof responseData === 'object') {
        const keys = Object.keys(responseData);
        console.log(`\x1b[90mPayload response keys: [${keys.join(', ')}]\x1b[0m`);
      }
      return { success: true, data: responseData };
    } else {
      stats.failed++;
      console.log(`\x1b[31m✘ FAILED (${duration}ms) - Status: ${response.status}\x1b[0m`);
      console.log(`\x1b[31mError Detail:\x1b[0m`, responseData);
      return { success: false, data: responseData };
    }
  } catch (err) {
    const duration = Date.now() - startTime;
    stats.failed++;
    console.log(`\x1b[31m✘ CRASHED (${duration}ms)\x1b[0m`);
    console.log(`\x1b[31mException:\x1b[0m`, err.message);
    return { success: false, error: err };
  }
}

async function startTests() {
  // Test 1: User Signup
  const uniqueEmail = `testrunner_${Date.now()}@smartleadbot.com`;
  const signupResult = await runTest(
    '1. User Registration / Signup',
    '/api/auth/signup',
    'POST',
    {},
    {
      firstName: 'Automated',
      lastName: 'Runner',
      email: uniqueEmail,
      password: 'runnerpassword123',
      company: 'Runner Automation'
    }
  );

  // Test 2: User Signin
  const signinResult = await runTest(
    '2. User Authentication / Signin',
    '/api/auth/signin',
    'POST',
    {},
    {
      email: uniqueEmail,
      password: 'runnerpassword123'
    }
  );

  if (signinResult.success && signinResult.data.token) {
    jwtToken = signinResult.data.token;
  } else {
    console.log(`\x1b[31m🛑 CRITICAL: Token not received. Skipping subsequent protected API tests.\x1b[0m\n`);
    printSummary();
    return;
  }

  // Test 3: Get Ingest Templates
  await runTest(
    '3. Retrieve Saved Ingestion Templates',
    '/api/ingest-templates',
    'GET'
  );

  // Test 4: Create Lead (Single Lead Ingest)
  const leadResult = await runTest(
    '4. Create Single Lead (Manual Ingestion)',
    '/api/leads',
    'POST',
    {},
    {
      company: `Showroom Kolkata Test ${Date.now()}`,
      industry: 'Car Dealership',
      location: 'Kolkata',
      phone: '+91 98765 43211',
      email: 'test@showroomkolkata.in',
      website: 'http://showroomkolkatatest.in',
      ai_score: 8,
      source: 'CLI Test Runner'
    }
  );

  if (leadResult.success && leadResult.data.ids && leadResult.data.ids.length > 0) {
    testLeadId = leadResult.data.ids[0];
  }

  // Test 5: Get Leads
  await runTest(
    '5. Get Active Leads Directory List',
    '/api/leads',
    'GET'
  );

  // Test 6: List Users / Teammates
  const usersResult = await runTest(
    '6. Get Registered CRM Teammates List',
    '/api/users',
    'GET'
  );

  if (usersResult.success && usersResult.data.length > 0) {
    testUserId = usersResult.data[0].id;
  }

  // Test 7: Assign Lead
  if (testLeadId && testUserId) {
    await runTest(
      '7. Assign Lead to CRM Teammate',
      '/api/leads/assign',
      'PUT',
      {},
      {
        leadId: testLeadId,
        userId: testUserId
      }
    );
  } else {
    console.log(`\x1b[33m⚠ Skipped Test 7 (Missing testLeadId or testUserId)\x1b[0m`);
  }

  // Test 8: Get Tasks
  await runTest(
    '8. Get Tasks Timeline',
    '/api/tasks',
    'GET'
  );

  // Test 9: Create Task (Delegate task to user)
  if (testLeadId && testUserId) {
    await runTest(
      '9. Create / Delegate Task to User',
      '/api/tasks',
      'POST',
      {},
      {
        leadId: testLeadId,
        assignedUserIds: [testUserId],
        title: 'Review test showroom lead',
        description: 'Verify details and send customized pitch.',
        priority: 'Medium',
        dueDate: '2026-06-25'
      }
    );
  } else {
    console.log(`\x1b[33m⚠ Skipped Test 9 (Missing testLeadId or testUserId)\x1b[0m`);
  }

  // Test 10: Google Status
  await runTest(
    '10. Get Google Forms OAuth Status',
    '/api/google/status',
    'GET'
  );

  // Test 11: Send Emails (n8n & Resend email proxy)
  await runTest(
    '11. Send Email (n8n Webhook Proxy or Resend Fallback)',
    '/api/send-emails',
    'POST',
    {},
    {
      recipients: [
        {
          email: 'test@showroomkolkata.in',
          company: 'Showroom Kolkata'
        }
      ],
      subject: 'Test email from automated runner',
      body: 'Hello, this is a test email sent from the automated test script.'
    }
  );

  // Test 12: Find Leads (NLP lead finder proxy)
  await runTest(
    '12. Find Leads (NLP Webhook Proxy & OSM Fallback)',
    '/api/find-leads',
    'POST',
    {},
    {
      query: 'car showrooms in west bengal',
      limit: 10
    }
  );

  printSummary();
}

function printSummary() {
  console.log(`\n\x1b[35m====================================================\x1b[0m`);
  console.log(`\x1b[35m🏁 TEST RUN SUMMARY\x1b[0m`);
  console.log(`\x1b[35m====================================================\x1b[0m`);
  console.log(`Total Tests Run: ${stats.total}`);
  console.log(`Passed: \x1b[32m${stats.passed}\x1b[0m`);
  console.log(`Failed: \x1b[31m${stats.failed}\x1b[0m`);
  console.log(`\x1b[35m====================================================\x1b[0m`);
  
  console.log(`\n\x1b[36m💡 Postman Integration:\x1b[0m`);
  console.log(`   Import the file: \x1b[1msmart_lead_bot_api_tests.postman_collection.json\x1b[0m`);
  console.log(`   into your Postman application to run and save your local test history.`);
  console.log(`\x1b[35m====================================================\x1b[0m\n`);
}

startTests().catch(err => {
  console.error('Test script crashed:', err);
});
