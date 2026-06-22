/**
 * Smart Lead Bot: Telegram & Business Email Integration Test Runner
 * Run with: node test_integrations.js
 */

const baseUrl = 'http://localhost:7860';
console.log(`====================================================`);
console.log(`🚀 RUNNING INTEGRATIONS & WEBHOOK SIMULATION TESTS`);
console.log(`Target Host: ${baseUrl}`);
console.log(`====================================================\n`);

let jwtToken = '';
let userId = '';
let userEmail = '';

async function runTest(name, path, method, headers = {}, body = null) {
  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };
  if (jwtToken) {
    finalHeaders['Authorization'] = `Bearer ${jwtToken}`;
  }

  try {
    const options = { method, headers: finalHeaders };
    if (body) {
      options.body = JSON.stringify(body);
    }
    const response = await fetch(`${baseUrl}${path}`, options);
    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (response.ok) {
      console.log(`✔ [PASSED] - ${name} (${response.status})`);
      return { success: true, data };
    } else {
      console.log(`✘ [FAILED] - ${name} (${response.status})`);
      console.log(`   Response:`, data);
      return { success: false, data };
    }
  } catch (err) {
    console.log(`✘ [CRASHED] - ${name} - Exception: ${err.message}`);
    return { success: false, error: err };
  }
}

async function run() {
  // 1. Sign up a new user to test the integrations cleanly
  const uniqueEmail = `integration_tester_${Date.now()}@test.com`;
  const signup = await runTest(
    '1. Create temporary test user account',
    '/api/auth/signup',
    'POST',
    {},
    {
      firstName: 'Integration',
      lastName: 'Tester',
      email: uniqueEmail,
      password: 'testpassword123',
      company: 'Testing Corp'
    }
  );

  if (!signup.success || !signup.data.token) {
    console.error('Failed to create test user. Aborting.');
    return;
  }

  jwtToken = signup.data.token;
  userId = signup.data.user.id;
  userEmail = signup.data.user.email;

  // 2. Check initial Telegram linkage status (should be false/unlinked)
  const tgStatusInit = await runTest(
    '2. Query initial Telegram connection status (should be unlinked)',
    '/api/telegram/status',
    'GET'
  );
  if (tgStatusInit.success) {
    console.log(`   Linked status: ${tgStatusInit.data.linked}, linkUrl: ${tgStatusInit.data.linkUrl}`);
  }

  // 3. Simulate Telegram bot Webhook callback pairing the chat ID
  const base64UserId = Buffer.from(userId).toString('base64').replace(/=/g, '');
  const tgWebhook = await runTest(
    '3. Simulate Telegram bot /start webhook callback',
    '/api/telegram/webhook',
    'POST',
    {},
    {
      message: {
        text: `/start ${base64UserId}`,
        chat: {
          id: 987654321
        }
      }
    }
  );

  // 4. Query Telegram linkage status again (should be true/linked)
  const tgStatusAfter = await runTest(
    '4. Query Telegram status after webhook pairing (should be linked)',
    '/api/telegram/status',
    'GET'
  );
  if (tgStatusAfter.success) {
    console.log(`   Linked status: ${tgStatusAfter.data.linked}, chat ID: ${tgStatusAfter.data.chatId}`);
  }

  // 5. Check initial Email linkage status (should be false/unconnected)
  const emailStatusInit = await runTest(
    '5. Query initial Business Email connection status (should be unconnected)',
    '/api/email/status',
    'GET'
  );

  // 6. Connect/Link Email account (should seed mock emails)
  const emailConnect = await runTest(
    '6. Connect Business Email account (should toggle and seed folders)',
    '/api/email/connect',
    'POST'
  );

  // 7. Query Email status after connection (should be true/connected)
  const emailStatusAfter = await runTest(
    '7. Query Email status after connection (should be connected)',
    '/api/email/status',
    'GET'
  );

  // 8. Fetch synced inbox folder messages
  const inboxMessages = await runTest(
    '8. Fetch synced "Inbox" folder messages',
    '/api/email/messages?folder=inbox',
    'GET'
  );
  if (inboxMessages.success && inboxMessages.data.length > 0) {
    console.log(`   Fetched ${inboxMessages.data.length} messages in Inbox.`);
    const firstMsg = inboxMessages.data[0];
    console.log(`   Latest Inbox email: "${firstMsg.subject}" from "${firstMsg.sender}"`);
  }

  // 9. Fetch synced outbox folder messages
  const outboxMessages = await runTest(
    '9. Fetch synced "Outbox" folder messages',
    '/api/email/messages?folder=outbox',
    'GET'
  );

  // 10. Fetch Copilot Outbox messages
  const copilotMessages = await runTest(
    '10. Fetch merged "Copilot Outbox" messages',
    '/api/email/messages?folder=copilot',
    'GET'
  );

  // 11. Disconnect Telegram account
  await runTest(
    '11. Disconnect Telegram connection (should unlink and clear chat ID)',
    '/api/telegram/disconnect',
    'POST'
  );

  // 12. Disconnect Email account
  await runTest(
    '12. Disconnect Business Email account (should clear connection and wipe cached emails)',
    '/api/email/disconnect',
    'POST'
  );

  // 13. Verify clean state check
  const finalCheck = await runTest(
    '13. Final query of connection states (both must be unlinked)',
    '/api/email/status',
    'GET'
  );
}

run().catch(console.error);
