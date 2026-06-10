import express from 'express';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';


// Load .env.local manually without dotenvx overriding HF Space env secrets
try {
  const envPath = new URL('.env.local', import.meta.url).pathname;
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          // Only set if not already defined (HF Space secrets take priority)
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
} catch (e) {
  // .env.local not available — that's fine in Docker (HF Space secrets are in process.env)
}

// Startup diagnostics — log which secrets are available
console.log('[ENV CHECK] GROQ_API_KEY:', process.env.GROQ_API_KEY ? `SET (${process.env.GROQ_API_KEY.slice(0,8)}...)` : 'MISSING');
console.log('[ENV CHECK] RESEND_API_KEY:', process.env.RESEND_API_KEY ? `SET (${process.env.RESEND_API_KEY.slice(0,8)}...)` : 'MISSING');
console.log('[ENV CHECK] TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'SET' : 'MISSING');
console.log('[ENV CHECK] COHERE_API_KEY:', process.env.COHERE_API_KEY ? 'SET' : 'MISSING');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;
const JWT_SECRET = process.env.JWT_SECRET || 'smart-lead-bot-secret-key-321-987';
const PASSWORD_SALT = 'smart-lead-bot-salt-555';

function hashPassword(password) {
  return crypto.pbkdf2Sync(password, PASSWORD_SALT, 10000, 64, 'sha512').toString('hex');
}

function generateJWT(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days expiration
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyJWT(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  if (signature !== expectedSignature) return null;
  
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }
    return payload;
  } catch (e) {
    return null;
  }
}

function getGroqApiKey() {
  return process.env.GROQ_API_KEY || '';
}

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER || 'admin',
  password: process.env.PGPASSWORD || 'password123',
  database: process.env.PGDATABASE || 'leads'
});

// Ensure CRM tables exist on startup
pool.query(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

  CREATE TABLE IF NOT EXISTS chat_memory (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    text TEXT NOT NULL,
    meta_json JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL;

  CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    lead_id VARCHAR(255) REFERENCES leads(lead_id) ON DELETE CASCADE,
    assigned_to VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(50) DEFAULT 'Medium',
    status VARCHAR(50) DEFAULT 'Pending',
    due_date DATE,
    team_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS task_assignments (
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS task_milestones (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
  );

  CREATE TABLE IF NOT EXISTS task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS lead_activities (
    id SERIAL PRIMARY KEY,
    lead_id VARCHAR(255) REFERENCES leads(lead_id) ON DELETE CASCADE,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
  CREATE INDEX IF NOT EXISTS idx_activities_lead ON lead_activities(lead_id);
  CREATE INDEX IF NOT EXISTS idx_assignments_task ON task_assignments(task_id);
  CREATE INDEX IF NOT EXISTS idx_milestones_task ON task_milestones(task_id);
  CREATE INDEX IF NOT EXISTS idx_comments_task ON task_comments(task_id);

  CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link_tab VARCHAR(100),
    link_id VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
  CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

  -- Store dynamic custom fields as JSONB on leads
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

  -- Store quick ingest templates
  CREATE TABLE IF NOT EXISTS ingest_templates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      fields JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  -- Store Google OAuth & API settings
  CREATE TABLE IF NOT EXISTS google_settings (
      id VARCHAR(255) PRIMARY KEY,
      client_id TEXT,
      client_secret TEXT,
      redirect_uri TEXT,
      access_token TEXT,
      refresh_token TEXT,
      token_expiry TIMESTAMP WITH TIME ZONE,
      email TEXT
  );

  -- Track created Google Forms and whether they should automatically sync
  CREATE TABLE IF NOT EXISTS google_forms (
      id SERIAL PRIMARY KEY,
      form_id VARCHAR(255) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      responder_uri TEXT,
      sync_enabled BOOLEAN DEFAULT TRUE,
      last_synced_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  -- Store sent email logs/outbox history
  CREATE TABLE IF NOT EXISTS sent_emails (
      id SERIAL PRIMARY KEY,
      sender_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
      sender_name VARCHAR(255),
      recipient_email VARCHAR(255) NOT NULL,
      recipient_company VARCHAR(255),
      subject VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'sent',
      method VARCHAR(50) DEFAULT 'unknown',
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_sent_emails_date ON sent_emails(sent_at DESC);
`).then(() => {
  console.log('PostgreSQL: Tables verified.');
}).catch(err => {
  console.error('Failed to initialize PostgreSQL extensions:', err.message);
});

const app = express();
app.use(express.json());

// CORS and Preflight
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Proxy n8n to port 5678 (matches Vite proxy configuration)
app.use('/n8n', (req, res) => {
  const options = {
    hostname: 'localhost',
    port: 5678,
    path: req.url, // app.use handles stripping '/n8n' so req.url is the sub-path
    method: req.method,
    headers: req.headers
  };
  
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  req.pipe(proxyReq);
  
  proxyReq.on('error', (err) => {
    console.error('n8n proxy error:', err.message);
    res.status(502).json({ error: 'n8n service unavailable' });
  });
});

// Helper: sendResendEmail
const sendResendEmail = async (toEmail, subject, bodyText, bodyHtml) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[Resend Mock Dispatch] To: ${toEmail}. Subject: ${subject}. Body: ${bodyText}`);
    return { mock: true, success: true };
  }
  
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: toEmail,
        subject: subject,
        text: bodyText,
        html: bodyHtml || `<div style="font-family: sans-serif; padding: 20px; color: #1e293b; line-height: 1.6;">${bodyText.replace(/\n/g, '<br/>')}</div>`
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      return { success: true, data };
    } else {
      const errText = await res.text();
      console.warn(`Resend dispatch rejected by API: ${errText}`);
      return { success: false, error: errText };
    }
  } catch (err) {
    console.warn(`Resend connection failed: ${err.message}`);
    return { success: false, error: err.message };
  }
};

// ═══ PUBLIC AUTH ENDPOINTS ═══

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, company, password, role } = req.body;
    if (!email || !password || !firstName) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const checkRes = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }
    
    const userId = 'U-' + Date.now();
    const pHash = hashPassword(password);
    const userRole = (role === 'admin' || role === 'user') ? role : 'user';
    
    await pool.query(
      'INSERT INTO users (id, first_name, last_name, email, company, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, firstName, lastName || '', cleanEmail, company || '', pHash, userRole]
    );
    
    const token = generateJWT({ id: userId, email: cleanEmail, role: userRole });
    res.json({
      token,
      user: { id: userId, firstName, lastName, email: cleanEmail, company, role: userRole }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const checkRes = await pool.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
    if (checkRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    
    const user = checkRes.rows[0];
    const pHash = hashPassword(password);
    if (pHash !== user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    
    const token = generateJWT({ id: user.id, email: user.email, role: user.role });
    res.json({
      token,
      user: { id: user.id, firstName: user.first_name, lastName: user.last_name, email: user.email, company: user.company, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══ AUTHENTICATION ROUTE PROTECTION ═══

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  const decoded = verifyJWT(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  }
  
  try {
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [decoded.id]);
    if (userCheck.rows.length === 0) {
      return res.status(401).json({ error: 'User no longer exists. Please sign up or sign in again.' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Authentication database check failed.' });
  }

  req.user = decoded;
  next();
};

// Protect all other api routes
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/')) return next();
  authenticateToken(req, res, next);
});

// ═══ CRM ENDPOINTS ═══

// ── Notification helper (called internally by task/comment/lead routes) ──
const createNotification = async (userId, type, title, message, linkTab, linkId) => {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, message, link_tab, link_id) VALUES ($1,$2,$3,$4,$5,$6)',
      [userId, type, title, message, linkTab || null, String(linkId || '')]
    );
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};

// GET /api/notifications — fetch current user's notifications (last 60)
app.get('/api/notifications', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 60`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/:id/read — mark one notification read
app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/read-all — mark all as read
app.patch('/api/notifications/read-all', async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, first_name, last_name, email, company FROM users ORDER BY first_name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/leads/assign', async (req, res) => {
  try {
    const { leadId, userId } = req.body;
    if (!leadId) {
      return res.status(400).json({ error: 'Missing leadId' });
    }
    const leadCheck = await pool.query('SELECT name FROM leads WHERE lead_id = $1', [leadId]);
    if (leadCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    const leadName = leadCheck.rows[0].name;

    let userName = 'None';
    let userEmail = '';
    if (userId) {
      const userCheck = await pool.query('SELECT first_name, last_name, email FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length > 0) {
        userName = `${userCheck.rows[0].first_name} ${userCheck.rows[0].last_name}`.trim();
        userEmail = userCheck.rows[0].email;
      }
    }

    await pool.query('UPDATE leads SET assigned_to = $1 WHERE lead_id = $2', [userId || null, leadId]);

    const actionDesc = userId 
      ? `Assigned lead "${leadName}" to user "${userName}".`
      : `Removed assignment from lead "${leadName}".`;
    await pool.query(
      'INSERT INTO lead_activities (lead_id, user_id, action_type, description) VALUES ($1, $2, $3, $4)',
      [leadId, req.user.id, 'Assigned', actionDesc]
    );

    if (userId && userEmail) {
      const subject = `📥 Lead Assignment: ${leadName}`;
      const bodyText = `Hello,\n\nYou have been assigned a new B2B lead: "${leadName}" inside the B2B Lead Intelligence Coordinator CRM.\n\nPlease log in to view the lead's details.\n\nBest regards,\nCRM Coordinator Bot`;
      await sendResendEmail(userEmail, subject, bodyText);
    }

    res.json({ message: 'Lead assigned successfully', assigned_to: userId, assigned_name: userName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leads/activities/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const result = await pool.query(`
      SELECT a.*, u.first_name, u.last_name 
      FROM lead_activities a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.lead_id = $1 
      ORDER BY a.timestamp DESC
    `, [leadId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads/activity', async (req, res) => {
  try {
    const { leadId, actionType, description } = req.body;
    if (!leadId || !description) {
      return res.status(400).json({ error: 'Missing leadId or description' });
    }
    await pool.query(
      'INSERT INTO lead_activities (lead_id, user_id, action_type, description) VALUES ($1, $2, $3, $4)',
      [leadId, req.user.id, actionType || 'Note Added', description]
    );
    res.json({ message: 'Activity logged successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, l.name as lead_name,
             COALESCE(
               jsonb_agg(
                 distinct jsonb_build_object(
                   'id', u.id,
                   'first_name', u.first_name,
                   'last_name', u.last_name,
                   'email', u.email
                 )
               ) FILTER (WHERE u.id IS NOT NULL),
               '[]'::jsonb
             ) as assignees
      FROM tasks t
      LEFT JOIN leads l ON t.lead_id = l.lead_id
      LEFT JOIN task_assignments ta ON t.id = ta.task_id
      LEFT JOIN users u ON ta.user_id = u.id
      GROUP BY t.id, l.name
      ORDER BY t.due_date ASC, t.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { leadId, assignedUserIds, title, description, priority, dueDate, teamName, milestones } = req.body;
    if (!title || !assignedUserIds || !Array.isArray(assignedUserIds) || assignedUserIds.length === 0) {
      return res.status(400).json({ error: 'Missing title or assignedUserIds array' });
    }
    
    const firstAssignee = assignedUserIds[0];
    
    // Insert into tasks table
    const taskRes = await pool.query(`
      INSERT INTO tasks (lead_id, assigned_to, title, description, priority, due_date, team_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [leadId || null, firstAssignee, title, description || '', priority || 'Medium', dueDate || null, teamName || null]);
    
    const newTask = taskRes.rows[0];
    
    // Insert into task_assignments
    for (const userId of assignedUserIds) {
      await pool.query(
        'INSERT INTO task_assignments (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [newTask.id, userId]
      );
    }
    
    // Insert milestones if provided
    const milestonesList = [];
    if (milestones && Array.isArray(milestones)) {
      for (const mText of milestones) {
        if (mText.trim()) {
          const mRes = await pool.query(
            'INSERT INTO task_milestones (task_id, title) VALUES ($1, $2) RETURNING *',
            [newTask.id, mText.trim()]
          );
          milestonesList.push(mRes.rows[0]);
        }
      }
    }
    
    // Log Activity for lead
    const leadName = leadId ? (await pool.query('SELECT name FROM leads WHERE lead_id = $1', [leadId])).rows[0]?.name : null;
    const assigneesQuery = await pool.query('SELECT first_name, last_name, email FROM users WHERE id = ANY($1)', [assignedUserIds]);
    const assignedNames = assigneesQuery.rows.map(u => `${u.first_name} ${u.last_name}`.trim());
    
    if (leadId) {
      const logDesc = `Created task "${title}" for team "${teamName || 'Teammates'}" (${assignedNames.join(', ')}).`;
      await pool.query(
        'INSERT INTO lead_activities (lead_id, user_id, action_type, description) VALUES ($1, $2, $3, $4)',
        [leadId, req.user.id, 'Task Logged', logDesc]
      );
    }
    
    // Send Emails via Resend to all assignees
    const baseUrl = req.protocol + '://' + req.get('host');
    const taskUrl = `${baseUrl}/tasks/${newTask.id}`;
    
    for (const userRow of assigneesQuery.rows) {
      if (userRow.email) {
        const subject = `📋 Task Assigned: ${title}`;
        const bodyText = `Hello ${userRow.first_name},\n\nYou have been assigned a new task: "${title}"\nTeam Name: ${teamName || 'N/A'}\nPriority: ${priority}\nDue Date: ${dueDate || 'None'}\n\nDescription:\n${description || 'No description provided.'}\n\nMilestones:\n${milestones && milestones.length > 0 ? milestones.map((m, i) => `${i+1}. ${m}`).join('\n') : 'None'}\n\nView details and update progress here: ${taskUrl}`;
        
        const bodyHtml = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; padding: 40px; color: #f8fafc; max-width: 600px; margin: 0 auto; border-radius: 8px; border: 1px solid #1e293b;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #e8962a; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 0.05em;">New Task Assigned</h2>
              <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 14px;">Smart Lead Bot CRM</p>
            </div>
            
            <div style="background-color: #1e293b; padding: 24px; border-radius: 6px; margin-bottom: 24px; border-left: 4px solid #e8962a;">
              <h3 style="color: #f8fafc; margin-top: 0; margin-bottom: 12px; font-size: 18px;">${title}</h3>
              <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 16px 0; line-height: 1.5;">${description || 'No description provided.'}</p>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #94a3b8;">
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; width: 100px;">Priority:</td>
                  <td style="padding: 6px 0; color: #f8fafc;">${priority}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold;">Due Date:</td>
                  <td style="padding: 6px 0; color: #f8fafc;">${dueDate ? new Date(dueDate).toLocaleDateString() : 'None'}</td>
                </tr>
                ${teamName ? `
                <tr>
                  <td style="padding: 6px 0; font-weight: bold;">Team:</td>
                  <td style="padding: 6px 0; color: #e8962a; font-weight: bold;">${teamName}</td>
                </tr>
                ` : ''}
                ${leadName ? `
                <tr>
                  <td style="padding: 6px 0; font-weight: bold;">Linked Lead:</td>
                  <td style="padding: 6px 0; color: #cbd5e1;">${leadName}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            ${milestones && milestones.length > 0 ? `
            <div style="margin-bottom: 24px;">
              <h4 style="color: #cbd5e1; margin-top: 0; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Milestones Checklist</h4>
              <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px; line-height: 1.6;">
                ${milestones.map(m => `<li>${m}</li>`).join('')}
              </ul>
            </div>
            ` : ''}

            <div style="text-align: center; margin-top: 28px;">
              <a href="${taskUrl}" target="_blank" style="background-color: #e8962a; color: #07080a; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">View & Update Task</a>
            </div>

            <hr style="border: 0; border-top: 1px solid #1e293b; margin: 32px 0 16px 0;" />
            <p style="color: #64748b; font-size: 11px; text-align: center; margin: 0;">This email was sent automatically from your B2B Lead Intelligence Coordinator.</p>
          </div>
        `;
        
        await sendResendEmail(userRow.email, subject, bodyText, bodyHtml);
      }
    }

    // ── In-app notifications ──
    // Each assignee gets a 'task_assigned' notification
    for (const uid of assignedUserIds) {
      await createNotification(
        uid,
        'task_assigned',
        `New Task: ${title}`,
        `You have been assigned "${title}"${teamName ? ` (${teamName})` : ''}. Priority: ${priority}. Due: ${dueDate || 'No deadline'}.`,
        'assigned-tasks',
        String(newTask.id)
      );
    }
    // Admin who created the task gets a summary (if they are not also an assignee)
    if (!assignedUserIds.includes(req.user.id)) {
      await createNotification(
        req.user.id,
        'task_assigned',
        `Task Delegated: ${title}`,
        `Task "${title}" was assigned to ${assignedNames.join(', ')}${leadName ? ` for lead "${leadName}"` : ''}.`,
        'tasks',
        String(newTask.id)
      );
    }
    
    res.json({ message: 'Task delegated successfully', task: newTask, assignees: assigneesQuery.rows, milestones: milestonesList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const taskRes = await pool.query(`
      SELECT t.*, l.name as lead_name, l.name as lead_company,
             COALESCE(
               jsonb_agg(
                 distinct jsonb_build_object(
                   'id', u.id,
                   'first_name', u.first_name,
                   'last_name', u.last_name,
                   'email', u.email,
                   'role', u.role
                 )
               ) FILTER (WHERE u.id IS NOT NULL),
               '[]'::jsonb
             ) as assignees
      FROM tasks t
      LEFT JOIN leads l ON t.lead_id = l.lead_id
      LEFT JOIN task_assignments ta ON t.id = ta.task_id
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE t.id = $1
      GROUP BY t.id, l.name
    `, [taskId]);
    
    if (taskRes.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const task = taskRes.rows[0];
    
    const milestonesRes = await pool.query(
      'SELECT * FROM task_milestones WHERE task_id = $1 ORDER BY id ASC',
      [taskId]
    );
    
    const commentsRes = await pool.query(`
      SELECT tc.*, u.first_name, u.last_name, u.role
      FROM task_comments tc
      LEFT JOIN users u ON tc.user_id = u.id
      WHERE tc.task_id = $1
      ORDER BY tc.created_at ASC
    `, [taskId]);
    
    res.json({
      task,
      milestones: milestonesRes.rows,
      comments: commentsRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Missing status' });
    }
    const taskCheck = await pool.query('SELECT title, lead_id FROM tasks WHERE id = $1', [taskId]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const { title, lead_id: leadId } = taskCheck.rows[0];

    await pool.query('UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, taskId]);

    const desc = `Task "${title}" updated to status: "${status}".`;
    if (leadId) {
      await pool.query(
        'INSERT INTO lead_activities (lead_id, user_id, action_type, description) VALUES ($1, $2, $3, $4)',
        [leadId, req.user.id, 'Task Logged', desc]
      );
    }
    
    // Add comment about status update
    await pool.query(
      'INSERT INTO task_comments (task_id, user_id, comment) VALUES ($1, $2, $3)',
      [taskId, req.user.id, `Status updated to: ${status}`]
    );

    // ── In-app notifications for status change ──
    // Get all assignees for this task
    const assigneeRows = await pool.query(
      `SELECT ta.user_id, u.role FROM task_assignments ta JOIN users u ON u.id = ta.user_id WHERE ta.task_id = $1`,
      [taskId]
    );
    const isCompleted = status === 'Completed';
    const isInProgress = status === 'In Progress';

    // Notify ALL admins for every status change (Pending → In Progress → Completed)
    const adminRows = await pool.query(`SELECT id FROM users WHERE role = 'admin'`);
    for (const admin of adminRows.rows) {
      if (admin.id === req.user.id) continue; // skip if admin made the change themselves
      await createNotification(
        admin.id,
        isCompleted ? 'task_completed' : 'task_updated',
        isCompleted
          ? `Task Completed: ${title}`
          : isInProgress
            ? `Task In Progress: ${title}`
            : `Task Updated: ${title}`,
        isCompleted
          ? `"${title}" has been marked Completed by a team member.`
          : isInProgress
            ? `"${title}" is now In Progress.`
            : `"${title}" status changed to "${status}".`,
        'tasks',
        taskId
      );
    }
    // Notify assignees (except who made the change)
    for (const row of assigneeRows.rows) {
      if (row.user_id !== req.user.id) {
        await createNotification(
          row.user_id,
          isCompleted ? 'task_completed' : 'task_updated',
          `Task ${isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Updated'}: ${title}`,
          `"${title}" status changed to "${status}".`,
          'assigned-tasks',
          taskId
        );
      }
    }

    res.json({ message: 'Task updated successfully', status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:taskId/milestones/:milestoneId', async (req, res) => {
  try {
    const { taskId, milestoneId } = req.params;
    const { completed } = req.body;
    
    const milestoneCheck = await pool.query(
      'SELECT title, completed FROM task_milestones WHERE id = $1 AND task_id = $2',
      [milestoneId, taskId]
    );
    if (milestoneCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }
    
    const { title } = milestoneCheck.rows[0];
    const isCompleted = completed === true;
    
    await pool.query(
      'UPDATE task_milestones SET completed = $1, completed_at = $2 WHERE id = $3 AND task_id = $4',
      [isCompleted, isCompleted ? new Date() : null, milestoneId, taskId]
    );
    
    // Log comment
    const commentText = `Milestone "${title}" marked as ${isCompleted ? 'Completed' : 'Pending'}.`;
    await pool.query(
      'INSERT INTO task_comments (task_id, user_id, comment) VALUES ($1, $2, $3)',
      [taskId, req.user.id, commentText]
    );
    
    res.json({ message: 'Milestone updated successfully', completed: isCompleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks/:taskId/comments', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment text cannot be empty' });
    }
    
    const taskCheck = await pool.query('SELECT id FROM tasks WHERE id = $1', [taskId]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const commentRes = await pool.query(
      'INSERT INTO task_comments (task_id, user_id, comment) VALUES ($1, $2, $3) RETURNING *',
      [taskId, req.user.id, comment.trim()]
    );
    
    // Fetch commenter details to return back
    const userRes = await pool.query('SELECT first_name, last_name, role FROM users WHERE id = $1', [req.user.id]);
    const responseComment = {
      ...commentRes.rows[0],
      first_name: userRes.rows[0]?.first_name || 'System',
      last_name: userRes.rows[0]?.last_name || 'User',
      role: userRes.rows[0]?.role || 'user'
    };

    // ── In-app notifications for new comment ──
    const taskMeta = await pool.query(
      'SELECT title, assigned_to FROM tasks WHERE id = $1',
      [taskId]
    );
    const taskTitle = taskMeta.rows[0]?.title || 'Task';
    const commenterName = `${userRes.rows[0]?.first_name || ''} ${userRes.rows[0]?.last_name || ''}`.trim() || 'Someone';
    // Get all assignees
    const assigneeCommentRows = await pool.query(
      'SELECT user_id FROM task_assignments WHERE task_id = $1',
      [taskId]
    );
    const notifyUsers = new Set();
    // Notify task creator / admin
    const adminUsersForComment = await pool.query(`SELECT id FROM users WHERE role = 'admin'`);
    adminUsersForComment.rows.forEach(a => notifyUsers.add(a.id));
    // Notify all assignees
    assigneeCommentRows.rows.forEach(r => notifyUsers.add(r.user_id));
    // Remove the person who wrote the comment
    notifyUsers.delete(req.user.id);
    for (const uid of notifyUsers) {
      await createNotification(
        uid,
        'task_comment',
        `New Comment on "${taskTitle}"`,
        `${commenterName} commented: "${String(commentRes.rows[0].comment).substring(0, 80)}${commentRes.rows[0].comment.length > 80 ? '...' : ''}"`,
        req.user.role === 'admin' ? 'tasks' : 'assigned-tasks',
        taskId
      );
    }
    
    res.json(responseComment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══ EMAIL DISPATCH AUTOMATION ═══

app.post('/api/send-emails', async (req, res) => {
  try {
    const { recipients, subject, body } = req.body;
    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients' });
    }
    const results = [];
    const n8nUrl = 'http://localhost:5678/webhook/send-email';
    
    const senderId = req.user ? req.user.id : null;
    let senderName = 'System';
    if (req.user) {
      try {
        const userRes = await pool.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]);
        if (userRes.rows.length > 0) {
          senderName = `${userRes.rows[0].first_name} ${userRes.rows[0].last_name}`.trim();
        }
      } catch (uErr) {
        console.warn('Failed to query user name:', uErr.message);
      }
    }
    
    for (const r of recipients) {
      let sentSuccessfully = false;
      let methodUsed = 'n8n';
      let warningMessage = null;
      
      // 1. Try sending via n8n webhook
      try {
        const n8nRes = await fetch(n8nUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: r.email, company: r.company, subject, body }),
          signal: AbortSignal.timeout(2000)
        });
        if (n8nRes.ok && n8nRes.status !== 404) {
          sentSuccessfully = true;
        } else if (n8nRes.status === 404) {
          warningMessage = 'n8n send-email webhook returned 404';
        }
      } catch (e) {
        warningMessage = `n8n webhook connection failed: ${e.message}`;
      }
      
      // 2. Fallback to Resend API if n8n failed/offline and RESEND_API_KEY is available
      if (!sentSuccessfully && process.env.RESEND_API_KEY) {
        try {
          const resendResult = await sendResendEmail(r.email, subject, body);
          if (resendResult.success) {
            sentSuccessfully = true;
            methodUsed = 'resend';
            warningMessage = null;
          } else {
            warningMessage = `Resend dispatch failed: ${resendResult.error}`;
          }
        } catch (e) {
          warningMessage = `Resend dispatch crash: ${e.message}`;
        }
      }
      
      // 3. Fallback to Mock Delivery if everything fails
      if (!sentSuccessfully) {
        console.warn(`[Mock Email Delivery] Falling back. Target: ${r.email}. Subject: ${subject}`);
        results.push({
          email: r.email,
          status: 'sent',
          warning: warningMessage || 'n8n and Resend offline. Secure Mock delivery fallback triggered.'
        });
      } else {
        results.push({
          email: r.email,
          status: 'sent',
          method: methodUsed
        });
      }

      // Log sent email to outbox history database
      const finalMethod = sentSuccessfully ? methodUsed : 'mock';
      try {
        await pool.query(`
          INSERT INTO sent_emails (sender_id, sender_name, recipient_email, recipient_company, subject, body, status, method)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [senderId, senderName, r.email, r.company || null, subject, body, 'sent', finalMethod]);
      } catch (dbErr) {
        console.error('Failed to log sent email to database:', dbErr.message);
      }
    }
    res.json({ message: 'Done', results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/outbox - fetch sent emails history
app.get('/api/outbox', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sent_emails ORDER BY sent_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══ LEAD MANAGEMENT CRUD ═══

app.get('/api/leads/export', async (req, res) => {
  try {
    const range = req.query.range || 'all';
    const format = req.query.format || 'json';
    
    let queryText = 'SELECT * FROM leads';
    let queryParams = [];
    
    if (range !== 'all') {
      let cutoffDate = new Date();
      if (range === 'daily') {
        cutoffDate.setDate(cutoffDate.getDate() - 1);
      } else if (range === 'weekly') {
        cutoffDate.setDate(cutoffDate.getDate() - 7);
      } else if (range === 'monthly') {
        cutoffDate.setMonth(cutoffDate.getMonth() - 1);
      } else if (range === 'yearly') {
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
      } else {
        cutoffDate = null;
      }
      
      if (cutoffDate) {
        queryText += ' WHERE timestamp >= $1';
        queryParams.push(cutoffDate);
      }
    }
    
    queryText += ' ORDER BY timestamp DESC';
    const result = await pool.query(queryText, queryParams);
    
    const mapped = result.rows.map(row => ({
      lead_id: row.lead_id,
      timestamp: row.timestamp,
      name: row.name || 'Unknown',
      niche: row.niche || 'Other',
      city: row.city || 'Bangalore',
      website: row.website || '',
      phone: row.phone || '',
      email: row.email || '',
      status: row.status || 'New',
      source: row.source || 'Database',
      ai_score: row.ai_score || 5,
      ai_grade: row.ai_grade || 'Warm',
      ai_reason: row.ai_reason || 'N/A'
    }));

    if (format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(mapped);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Leads Report");
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', 'attachment; filename="leads_report.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buffer);
    } else if (format === 'csv') {
      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        let str = val.toString().replace(/"/g, '""');
        if (str.search(/("|,|\n)/g) >= 0) {
          str = `"${str}"`;
        }
        return str;
      };

      if (mapped.length === 0) {
        res.setHeader('Content-Disposition', 'attachment; filename="leads_report.csv"');
        res.setHeader('Content-Type', 'text/csv');
        return res.send('');
      }

      const headers = Object.keys(mapped[0]);
      let csvContent = headers.join(',') + '\r\n';
      mapped.forEach(item => {
        const line = headers.map(h => escapeCSV(item[h])).join(',');
        csvContent += line + '\r\n';
      });

      res.setHeader('Content-Disposition', 'attachment; filename="leads_report.csv"');
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csvContent);
    } else {
      res.setHeader('Content-Disposition', 'attachment; filename="leads_report.json"');
      res.setHeader('Content-Type', 'application/json');
      return res.json(mapped);
    }
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to export report', details: err.message });
  }
});

app.get('/api/leads', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM leads ORDER BY timestamp DESC');
    const mappedLeads = result.rows.map(row => ({
      leadId: row.lead_id,
      timestamp: row.timestamp,
      company: row.name || 'Unknown',
      website: row.website || '',
      phone: row.phone || '',
      email: row.email || '',
      has_website: row.has_website ?? !!row.website,
      has_phone: row.has_phone ?? !!row.phone,
      industry: row.niche || 'Other',
      location: row.city || 'Bangalore',
      source: row.source || 'Database',
      ai_score: row.ai_score || 5,
      ai_grade: row.ai_grade || 'Warm',
      ai_intent: row.ai_reason || 'Retrieved from PostgreSQL database.',
      ai_budget_signal: row.ai_score >= 8 ? 'High' : (row.ai_score >= 5 ? 'Medium' : 'Low'),
      ai_urgency: row.ai_score >= 7 ? 'Immediate' : 'Exploring',
      ai_estimated_deal_value: row.ai_score >= 8 ? '$15k-$25k' : '$5k-$10k',
      ai_sentiment: 'Positive',
      ai_revenue_potential: row.ai_score >= 7 ? 'High' : 'Medium',
      ai_risk_flags: 'None',
      status: row.status || 'New',
      next_followup: row.next_followup ? new Date(row.next_followup).toISOString().split('T')[0] : '',
      ai_recommended_action: row.ai_whatsapp_message ? 'Reach out via custom WhatsApp copy.' : 'Initiate direct connection.',
      lat: row.lat !== null && row.lat !== undefined && !isNaN(parseFloat(row.lat)) ? parseFloat(row.lat) : 12.9716,
      lng: row.lng !== null && row.lng !== undefined && !isNaN(parseFloat(row.lng)) ? parseFloat(row.lng) : 77.5946,
      assignedTo: row.assigned_to || '',
      assigned_to: row.assigned_to || '',
      custom_fields: row.custom_fields || {}
    }));
    res.json(mappedLeads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/leads', async (req, res) => {
  try {
    const { 
      leadId, leadIds, company, website, phone, email, industry, 
      location, ai_score, ai_grade, status, next_followup 
    } = req.body;
    
    // Bulk Update Mode
    if (leadIds && Array.isArray(leadIds) && leadIds.length > 0) {
      const sets = [];
      const params = [];
      let paramIdx = 1;
      
      if (status !== undefined) {
        sets.push(`status = $${paramIdx++}`);
        params.push(status);
      }
      if (ai_grade !== undefined) {
        sets.push(`ai_grade = $${paramIdx++}`);
        params.push(ai_grade);
      }
      if (ai_score !== undefined) {
        sets.push(`ai_score = $${paramIdx++}`);
        params.push(parseInt(ai_score || 5));
      }
      
      if (sets.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      params.push(leadIds);
      const arrayIdx = paramIdx;
      
      await pool.query(`
        UPDATE leads SET ${sets.join(', ')} WHERE lead_id = ANY($${arrayIdx})
      `, params);
      
      // Update lead_vectors table to sync RAG
      const vSets = [];
      const vParams = [];
      let vParamIdx = 1;
      if (ai_grade !== undefined) {
        vSets.push(`ai_grade = $${vParamIdx++}`);
        vParams.push(ai_grade);
      }
      if (ai_score !== undefined) {
        vSets.push(`ai_score = $${vParamIdx++}`);
        vParams.push(parseInt(ai_score || 5));
      }
      
      if (vSets.length > 0) {
        vParams.push(leadIds);
        const vArrayIdx = vParamIdx;
        await pool.query(`
          UPDATE lead_vectors SET ${vSets.join(', ')} WHERE lead_id = ANY($${vArrayIdx})
        `, vParams);
      }
      
      return res.json({ message: `Successfully updated ${leadIds.length} leads in bulk` });
    }
    
    // Single Update Mode
    if (!leadId) {
      return res.status(400).json({ error: 'Missing leadId' });
    }
    
    await pool.query(`
      UPDATE leads SET 
        name = $1, website = $2, phone = $3, email = $4, niche = $5, city = $6,
        ai_score = $7, ai_grade = $8, status = $9, next_followup = $10, custom_fields = $11
      WHERE lead_id = $12
    `, [
      company || 'Unknown', website || '', phone || '', email || '', industry || 'Other', location || 'Bangalore',
      parseInt(ai_score || 5), ai_grade || 'Warm', status || 'New', next_followup ? new Date(next_followup) : null,
      JSON.stringify(req.body.custom_fields || {}),
      leadId
    ]);
    
    await pool.query(`
      UPDATE lead_vectors SET 
        business_name = $1, website = $2, phone = $3, niche = $4, city = $5,
        ai_score = $6, ai_grade = $7, text_chunk = $8
      WHERE lead_id = $9
    `, [
      company || 'Unknown', website || '', phone || '', industry || 'Other', location || 'Bangalore',
      parseInt(ai_score || 5), ai_grade || 'Warm',
      `Business Name: ${company}. Industry: ${industry}. City: ${location}. Score: ${ai_score}/10. Status: ${status}. Contact Phone: ${phone}. Email: ${email}.`,
      leadId
    ]);
    
    res.json({ message: 'Lead updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/leads', async (req, res) => {
  try {
    const leadIds = req.body.leadIds || [];
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Missing or empty leadIds array' });
    }
    await pool.query('DELETE FROM leads WHERE lead_id = ANY($1)', [leadIds]);
    await pool.query('DELETE FROM lead_vectors WHERE lead_id = ANY($1)', [leadIds]);
    res.json({ message: `Successfully deleted ${leadIds.length} leads` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads', async (req, res) => {
  try {
    const body = req.body;
    const rawLeads = Array.isArray(body) ? body : [body];
    const insertedCount = [];
    
    for (const lead of rawLeads) {
        // Check for duplicate lead based on name, city, niche
        const duplicateCheck = await pool.query(
          'SELECT lead_id FROM leads WHERE name = $1 AND city = $2 AND niche = $3',
          [lead.company || lead.name || 'Unknown', lead.location || lead.city || null, lead.industry || lead.niche || null]
        );
        if (duplicateCheck.rowCount > 0) {
          // Skip duplicate lead
          continue;
        }
      const leadId = lead.leadId || lead.lead_id || crypto.randomUUID();
      const name = lead.company || lead.name || 'Unknown';
      const niche = lead.industry || lead.niche || null;
      const city = lead.location || lead.city || null;
      const website = lead.website || null;
      const phone = lead.phone || null;
      const email = lead.email || null;
      const source = lead.source || 'Manual Ingest';
      const lat = lead.lat !== undefined && lead.lat !== null ? parseFloat(lead.lat) : null;
      const lng = lead.lng !== undefined && lead.lng !== null ? parseFloat(lead.lng) : null;
      
      const score = lead.ai_score !== undefined && lead.ai_score !== null ? parseInt(lead.ai_score) : null;
      const grade = lead.ai_grade || (score >= 8 ? 'Hot' : (score >= 5 ? 'Warm' : (score !== null ? 'Cold' : null)));
      const needsWebsite = website ? false : true;
      const needsMarketing = null;
      const bestContact = phone ? 'Call' : (email ? 'Email' : 'Visit');
      const whatsappMessage = null;
      const emailSubject = null;
      const recommendedService = null;
      const reason = null;
      
      const nextFollowup = lead.next_followup ? new Date(lead.next_followup) : null;
      
      // Extract custom fields (everything that is not a core field)
      const coreKeys = ['leadId', 'lead_id', 'company', 'name', 'industry', 'niche', 'location', 'city', 'website', 'phone', 'email', 'source', 'lat', 'lng', 'ai_score', 'ai_grade', 'status', 'next_followup', 'timestamp', 'created_at', 'custom_fields'];
      const customFields = { ...(lead.custom_fields || {}) };
      for (const key in lead) {
        if (!coreKeys.includes(key)) {
          customFields[key] = lead[key];
        }
      }

      // Save to leads table
      await pool.query(`
        INSERT INTO leads (
          lead_id, name, niche, city, website, phone, email, 
          ai_score, ai_grade, ai_needs_website, ai_needs_marketing, 
          ai_best_contact, ai_whatsapp_message, ai_email_subject, ai_recommended_service, ai_reason,
          status, source, timestamp, lat, lng, next_followup, custom_fields
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), $19, $20, $21, $22)
        ON CONFLICT (lead_id) DO UPDATE SET
          name = EXCLUDED.name, niche = EXCLUDED.niche, city = EXCLUDED.city,
          website = EXCLUDED.website, phone = EXCLUDED.phone, email = EXCLUDED.email,
          ai_score = EXCLUDED.ai_score, ai_grade = EXCLUDED.ai_grade,
          ai_whatsapp_message = EXCLUDED.ai_whatsapp_message, ai_email_subject = EXCLUDED.ai_email_subject,
          ai_recommended_service = EXCLUDED.ai_recommended_service, ai_reason = EXCLUDED.ai_reason,
          status = EXCLUDED.status, next_followup = EXCLUDED.next_followup,
          custom_fields = EXCLUDED.custom_fields
      `, [
        leadId, name, niche, city, website, phone, email,
        score, grade, needsWebsite, needsMarketing,
        bestContact, whatsappMessage, emailSubject, recommendedService, reason,
        lead.status || 'New', source, lat, lng, nextFollowup, JSON.stringify(customFields)
      ]);
      
      // Save vector search entry
      await pool.query(`
        INSERT INTO lead_vectors (
          lead_id, business_name, city, niche, phone, website, 
          ai_score, ai_grade, needs_website, needs_marketing, text_chunk, embedding, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, ARRAY_FILL(0::float, ARRAY[1024])::double precision[], NOW())
        ON CONFLICT (lead_id) DO UPDATE SET
          business_name = EXCLUDED.business_name, city = EXCLUDED.city, niche = EXCLUDED.niche,
          phone = EXCLUDED.phone, website = EXCLUDED.website, ai_score = EXCLUDED.ai_score,
          ai_grade = EXCLUDED.ai_grade, text_chunk = EXCLUDED.text_chunk
      `, [
        leadId, name, city || 'N/A', niche || 'N/A', phone, website,
        score || 5, grade || 'Warm', needsWebsite, true,
        `Business Name: ${name}. Industry: ${niche || 'N/A'}. City: ${city || 'N/A'}. Score: ${score || 'N/A'}/10. Grade: ${grade || 'N/A'}. contact phone: ${phone || 'N/A'}. email: ${email || 'N/A'}.`,
      ]);
      
      insertedCount.push(leadId);
      
      // Trigger n8n webhook notification as backup
      if (rawLeads.length === 1) {
        try {
          const n8nNotifyUrl = 'http://localhost:5678/webhook/find-leads';
          await fetch(n8nNotifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              niche: niche ? niche.toLowerCase() : '',
              city: city,
              limit: 1,
              companies: [name]
            })
          });
        } catch (n8nErr) { /* ignore */ }
      }
    }
    
    res.json({ 
      message: `${insertedCount.length} leads successfully processed.`, 
      ids: insertedCount 
    });
  } catch (err) {
    console.error('Error ingesting manual leads:', err);
    res.status(500).json({ error: err.message });
  }
});

// ═══ DIRECT LEAD FINDER WORKFLOW (N8N-FREE) ═══

app.post('/api/find-leads', async (req, res) => {
  try {
    const rawQuery = req.body.query || '';
    const limitVal = Math.min(50, Math.max(10, parseInt(req.body.limit || 15)));
    const groqKey = getGroqApiKey();
    
    let nicheVal = 'restaurant';
    let cityVal = 'Bangalore';
    let realCompanies = [];
    
    // Direct local extraction as fallback/primary parsing validation
    if (rawQuery.trim()) {
      const q = rawQuery.toLowerCase();
      const locations = [
        'west bengal', 'bengal', 'kolkata', 'calcutta', 'pune', 'mumbai', 'bombay', 
        'delhi', 'new delhi', 'chennai', 'madras', 'hyderabad', 'bangalore', 'bengaluru',
        'noida', 'gurgaon', 'ahmedabad', 'surat', 'jaipur', 'lucknow', 'kanpur', 'nagpur',
        'patna', 'indore', 'thane', 'bhopal', 'visakhapatnam', 'vadodara', 'ghaziabad',
        'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut', 'rajkot', 'varanasi', 'srinagar'
      ];
      
      let foundLocation = null;
      for (const loc of locations) {
        if (q.includes(loc)) {
          foundLocation = loc;
          break;
        }
      }
      
      if (foundLocation) {
        cityVal = foundLocation.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      } else {
        const locMatch = q.match(/(?:in|near|at|for|around)\s+([a-zA-Z\s]+)/i);
        if (locMatch && locMatch[1]) {
          const loc = locMatch[1].trim();
          cityVal = loc.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
      }
      
      let cleanQ = q;
      if (foundLocation) {
        cleanQ = cleanQ.replace(new RegExp(`(?:in|near|at|for|around)?\\s*${foundLocation}`, 'gi'), '');
      }
      cleanQ = cleanQ.replace(/\b(find|search|get|show\s+me|leads|companies|company|services|service|businesses|business|show\s*rooms|showroom|showrooms)\b/gi, '');
      cleanQ = cleanQ.replace(/\b(in|near|at|for|around|i|a|an|the)\b/gi, '');
      cleanQ = cleanQ.replace(/\s+/g, ' ').trim();
      
      if (cleanQ) {
        nicheVal = cleanQ.toLowerCase();
      }
    }
    
    // 1. NLP parsing using Groq (overrides local fallback if successful)
    if (rawQuery.trim() && groqKey) {
      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 150,
            temperature: 0.1,
            response_format: { type: "json_object" },
            messages: [
              {
                role: 'system',
                content: 'You are an NLP parser. Parse the B2B lead query. Return ONLY a JSON object with fields: "niche" (lowercase, singular, e.g. "restaurant", "salon", "software"), and "city" (capitalized, e.g. "Bangalore", "Pune").'
              },
              { role: 'user', content: `Parse: "${rawQuery}"` }
            ]
          })
        });
        
        if (groqResponse.ok) {
          const groqData = await groqResponse.json();
          const parsed = JSON.parse(groqData.choices?.[0]?.message?.content || '{}');
          if (parsed.niche) nicheVal = parsed.niche;
          if (parsed.city) cityVal = parsed.city;
        }
      } catch (err) {
        console.warn('Direct NLP parsing failed:', err.message);
      }
    }
    
    // Clean niche term
    const cleanNiche = nicheVal.replace(/leads|companies|company|services|service|businesses|business/gi, "").trim();

    // ── Niche → OSM tag map (proper semantic Overpass filters) ──────────────
    // Each entry: { keyFilters: [{key, value}], nameRegex (fallback name search) }
    const buildOverpassFilters = (niche) => {
      const n = niche.toLowerCase();
      // Hotel / Hospitality
      if (n.includes('hotel') || n.includes('resort') || n.includes('hostel') || n.includes('lodge')) {
        return [
          `node[tourism=hotel](around:RADIUS,LAT,LNG)`,
          `node[tourism=motel](around:RADIUS,LAT,LNG)`,
          `node[tourism=guest_house](around:RADIUS,LAT,LNG)`,
          `node[tourism=hostel](around:RADIUS,LAT,LNG)`,
          `way[tourism=hotel](around:RADIUS,LAT,LNG)`,
          `way[tourism=motel](around:RADIUS,LAT,LNG)`
        ];
      }
      // Restaurant / Food
      if (n.includes('restaurant') || n.includes('food') || n.includes('cafe') || n.includes('diner') || n.includes('eatery')) {
        return [
          `node[amenity=restaurant](around:RADIUS,LAT,LNG)`,
          `node[amenity=cafe](around:RADIUS,LAT,LNG)`,
          `node[amenity=fast_food](around:RADIUS,LAT,LNG)`,
          `node[amenity=bar](around:RADIUS,LAT,LNG)`,
          `way[amenity=restaurant](around:RADIUS,LAT,LNG)`
        ];
      }
      // Salon / Beauty
      if (n.includes('salon') || n.includes('beauty') || n.includes('spa') || n.includes('hair')) {
        return [
          `node[shop=hairdresser](around:RADIUS,LAT,LNG)`,
          `node[shop=beauty](around:RADIUS,LAT,LNG)`,
          `node[leisure=spa](around:RADIUS,LAT,LNG)`,
          `node[amenity=beauty](around:RADIUS,LAT,LNG)`
        ];
      }
      // Gym / Fitness
      if (n.includes('gym') || n.includes('fitness') || n.includes('yoga') || n.includes('sport')) {
        return [
          `node[leisure=fitness_centre](around:RADIUS,LAT,LNG)`,
          `node[leisure=sports_centre](around:RADIUS,LAT,LNG)`,
          `node[amenity=gym](around:RADIUS,LAT,LNG)`
        ];
      }
      // IT / Software / Tech
      if (n.includes('it') || n.includes('software') || n.includes('tech') || n.includes('computer')) {
        return [
          `node[office=it](around:RADIUS,LAT,LNG)`,
          `node[office=software](around:RADIUS,LAT,LNG)`,
          `node[office=company][name~"tech|software|systems|digital|solutions",i](around:RADIUS,LAT,LNG)`,
          `node[shop=computer](around:RADIUS,LAT,LNG)`
        ];
      }
      // Hospital / Clinic / Medical
      if (n.includes('hospital') || n.includes('clinic') || n.includes('medical') || n.includes('doctor') || n.includes('health')) {
        return [
          `node[amenity=hospital](around:RADIUS,LAT,LNG)`,
          `node[amenity=clinic](around:RADIUS,LAT,LNG)`,
          `node[amenity=doctors](around:RADIUS,LAT,LNG)`,
          `node[amenity=pharmacy](around:RADIUS,LAT,LNG)`,
          `way[amenity=hospital](around:RADIUS,LAT,LNG)`
        ];
      }
      // School / Education
      if (n.includes('school') || n.includes('college') || n.includes('education') || n.includes('institute') || n.includes('academy')) {
        return [
          `node[amenity=school](around:RADIUS,LAT,LNG)`,
          `node[amenity=college](around:RADIUS,LAT,LNG)`,
          `node[amenity=university](around:RADIUS,LAT,LNG)`,
          `way[amenity=school](around:RADIUS,LAT,LNG)`
        ];
      }
      // Retail / Shop
      if (n.includes('shop') || n.includes('store') || n.includes('retail')) {
        return [
          `node[shop](around:RADIUS,LAT,LNG)`,
          `way[shop](around:RADIUS,LAT,LNG)`
        ];
      }
      // Generic office / company fallback
      return [
        `node[office=company][name~"${niche}",i](around:RADIUS,LAT,LNG)`,
        `node[name~"${niche}",i](around:RADIUS,LAT,LNG)`,
        `way[name~"${niche}",i](around:RADIUS,LAT,LNG)`
      ];
    };
    const overpassFilters = buildOverpassFilters(cleanNiche);
    
    // 2. Resolve coordinates using static lookup or Nominatim geocoding API
    let lat = 12.9716;
    let lng = 77.5946;
    const cLower = cityVal.toLowerCase();
    
    if (cLower.includes("pune")) {
      lat = 18.5204; lng = 73.8567;
    } else if (cLower.includes("mumbai") || cLower.includes("bombay")) {
      lat = 19.0760; lng = 72.8777;
    } else if (cLower.includes("delhi")) {
      lat = 28.7041; lng = 77.1025;
    } else if (cLower.includes("chennai")) {
      lat = 13.0827; lng = 80.2707;
    } else if (cLower.includes("hyderabad")) {
      lat = 17.3850; lng = 78.4867;
    } else if (cLower.includes("kolkata")) {
      lat = 22.5726; lng = 88.3639;
    } else if (cLower.includes("bangalore") || cLower.includes("bengaluru")) {
      lat = 12.9716; lng = 77.5946;
    } else if (cLower.includes("west bengal") || cLower.includes("bengal")) {
      lat = 22.9868; lng = 87.8550;
    } else {
      // Nominatim search
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityVal)}&format=json&limit=1`;
        const nomResp = await fetch(nomUrl, { headers: { 'User-Agent': 'SmartLeadBot/1.0' } });
        if (nomResp.ok) {
          const nomData = await nomResp.json();
          if (nomData && nomData.length > 0) {
            lat = parseFloat(nomData[0].lat);
            lng = parseFloat(nomData[0].lon);
          }
        }
      } catch (nomErr) {
        console.warn('Geocoding search failed:', nomErr.message);
      }
    }
    
    // 3. Harvest Wikipedia businesses
    try {
      const searchTerms = `${cleanNiche} companies in ${cityVal}`;
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerms)}&format=json&origin=*`;
      const wikiResp = await fetch(wikiUrl);
      if (wikiResp.ok) {
        const wikiData = await wikiResp.json();
        const results = wikiData.query?.search || [];
        realCompanies = results
          .map(item => item.title)
          .filter(title => {
            const t = title.toLowerCase();
            return !t.includes('list of') && !t.includes('economy of') && !t.includes('demographics of') && !t.includes('geography of') && !t.includes('history of') && !t.includes('portal:') && !t.includes('category:') && !t.includes('wikipedia:');
          })
          .slice(0, limitVal);
      }
    } catch (wikiErr) {
      console.warn('Wikipedia search failed:', wikiErr.message);
    }
    
    // 4. Overpass API nearby search — use semantic tag-value filters
    let elements = [];
    try {
      const radiusMeters = 15000;
      // Build union query from semantic filters
      const filterLines = overpassFilters
        .map(f => f.replace(/RADIUS/g, radiusMeters).replace(/LAT/g, lat).replace(/LNG/g, lng))
        .join(';\n');
      const overpassQuery = `[out:json][timeout:30];(\n${filterLines};\n);out center ${limitVal * 3};`;
      const overpassUrl = `https://lz4.overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
      const overpassResp = await fetch(overpassUrl, { signal: AbortSignal.timeout(12000) });
      if (overpassResp.ok) {
        const overpassData = await overpassResp.json();
        elements = overpassData.elements || [];
        console.log(`Overpass returned ${elements.length} raw elements for "${cleanNiche}" near ${cityVal}`);
      }
    } catch (overpassErr) {
      console.warn('Overpass API query failed:', overpassErr.message);
    }
    
    // ── Merge Wikipedia + Overpass, deduplicate by normalised name ──────────
    const seenNames = new Set();
    const normName = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    const mergedList = [];

    // OSM Overpass results first (most accurate — real place data with coords)
    elements.forEach(el => {
      const name = el.tags?.name || el.tags?.brand;
      if (!name) return;
      const key = normName(name);
      if (seenNames.has(key)) return;
      seenNames.add(key);
      const osmCategory = el.tags?.tourism || el.tags?.amenity || el.tags?.shop || el.tags?.office || el.tags?.leisure || cleanNiche;
      // Skip if OSM category clearly doesn't match niche (e.g. railway, bus_stop)
      const rejectTypes = ['railway', 'bus_stop', 'fuel', 'atm', 'bank', 'parking', 'toilets', 'waste', 'bench'];
      if (rejectTypes.includes(osmCategory)) return;
      mergedList.push({
        id: 'OSM-' + el.id,
        name,
        lat: el.lat || el.center?.lat || lat,
        lng: el.lon || el.center?.lon || lng,
        website: el.tags?.website || el.tags?.url || el.tags?.['contact:website'] || '',
        phone: el.tags?.phone || el.tags?.['contact:phone'] || el.tags?.['contact:mobile'] || '',
        email: el.tags?.email || el.tags?.['contact:email'] || '',
        category: osmCategory
      });
    });

    // Wikipedia results (company-level, good for B2B niches like IT/hospitals)
    realCompanies.forEach((company, index) => {
      const key = normName(company);
      if (seenNames.has(key)) return;
      seenNames.add(key);
      mergedList.push({
        id: 'WIKI-' + index,
        name: company,
        lat: lat + (Math.sin(index * 1.7) * 0.012),
        lng: lng + (Math.cos(index * 1.7) * 0.012),
        website: '',
        phone: '',
        email: '',
        category: cleanNiche
      });
    });

    console.log(`Merged ${mergedList.length} unique leads (${elements.length} OSM + ${realCompanies.length} Wiki) for "${cleanNiche}" in ${cityVal}`);
    // No synthetic filler — only return real results (unless both APIs failed, in which case we fall back to AI generation / high-fidelity rule-based generation to ensure output)
    if (mergedList.length === 0) {
      console.log(`No results from Overpass/Wikipedia for "${cleanNiche}" in ${cityVal}. Activating fallback lead generators...`);
      let generatedLeads = [];
      if (groqKey) {
        try {
          const groqGenResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              max_tokens: 1500,
              temperature: 0.3,
              response_format: { type: "json_object" },
              messages: [
                {
                  role: 'system',
                  content: `You are a high-quality B2B lead generation assistant. Generate a list of ${limitVal} realistic, high-quality B2B leads/businesses for the niche "${cleanNiche}" in the city "${cityVal}". Ensure all leads have realistic names, websites, phone numbers, and emails.
Return a JSON object containing a "leads" array where each object has:
- name: (string, e.g. "Saraswati Software Solutions", "The Bangalore Diner")
- website: (string, e.g. "https://saraswatitech.in", "https://bangalorediner.com")
- phone: (string, e.g. "+91 98765 43210")
- email: (string, e.g. "contact@saraswatitech.in")
- category: (string, e.g. "software", "restaurant")
- lat: (float, realistic latitude for ${cityVal})
- lng: (float, realistic longitude for ${cityVal})
Do NOT return placeholders like "Business A" or empty fields. Generate realistic business names.`
                },
                { role: 'user', content: `Generate B2B leads for niche "${cleanNiche}" in "${cityVal}".` }
              ]
            })
          });

          if (groqGenResp.ok) {
            const groqGenData = await groqGenResp.json();
            const parsed = JSON.parse(groqGenData.choices?.[0]?.message?.content || '{}');
            if (parsed.leads && Array.isArray(parsed.leads) && parsed.leads.length > 0) {
              generatedLeads = parsed.leads;
              console.log(`Successfully generated ${generatedLeads.length} leads using Groq.`);
            }
          }
        } catch (err) {
          console.warn('Groq lead generator fallback failed:', err.message);
        }
      }

      if (generatedLeads.length === 0) {
        console.log(`Groq generator unavailable/failed. Running high-fidelity rule-based lead generator...`);
        const cleanC = cityVal.charAt(0).toUpperCase() + cityVal.slice(1).toLowerCase().trim();
        const cleanN = cleanNiche.toLowerCase().trim();
        
        let prefixes = ['Apex', 'Elite', 'Global', 'Royal', 'Vanguard', 'Prime', 'Metro', 'Signature', 'Sovereign', 'Alpha'];
        let suffixes = ['Group', 'Hub', 'Network', 'Enterprises', 'Associates', 'Co', 'Holdings'];
        
        if (cleanN.includes('restaurant') || cleanN.includes('food') || cleanN.includes('cafe')) {
          prefixes = ['The Golden', 'Royal', 'Spice', 'Urban', 'Silver', 'Gourmet', 'Tandoori', 'Classic', 'Flavors of', 'Saffron'];
          suffixes = ['Bistro', 'Kitchen', 'Cafe', 'Restaurant', 'Diner', 'Eatery', 'Grill', 'House', 'Junction', 'Palace'];
        } else if (cleanN.includes('salon') || cleanN.includes('beauty') || cleanN.includes('spa')) {
          prefixes = ['Gloss &', 'Shine', 'Glitz', 'Velvet', 'Orchid', 'Lotus', 'Jasmine', 'Grace', 'Miracle', 'Style'];
          suffixes = ['Salon', 'Spa', 'Beauty Lounge', 'Makeover Studio', 'Hair & Care', 'Wellness Center'];
        } else if (cleanN.includes('gym') || cleanN.includes('fitness')) {
          prefixes = ['Iron', 'Gold\'s', 'Flex', 'Pulse', 'Titan', 'Oasis', 'Active', 'Fit', 'Power', 'Vigor'];
          suffixes = ['Gym', 'Fitness Club', 'Wellness Hub', 'Training Center', 'Athletics', 'Studio'];
        } else if (cleanN.includes('software') || cleanN.includes('it') || cleanN.includes('tech')) {
          prefixes = ['Saraswati', 'TechPro', 'Cognitive', 'Quantum', 'Cloud', 'Cyber', 'Delta', 'Sigma', 'Infotech', 'Apex'];
          suffixes = ['Software Solutions', 'Technologies', 'Systems', 'Digital', 'Consulting Services', 'Labs', 'Hub'];
        } else if (cleanN.includes('hospital') || cleanN.includes('clinic') || cleanN.includes('medical') || cleanN.includes('health')) {
          prefixes = ['Lifeline', 'Arogya', 'Care', 'Metro', 'City', 'Apex', 'Holy', 'St. Johns', 'Fortis', 'Max'];
          suffixes = ['Hospital', 'Clinic', 'Healthcare Center', 'Medical Super-specialty', 'Care Clinic'];
        } else if (cleanN.includes('school') || cleanN.includes('education') || cleanN.includes('college')) {
          prefixes = ['Little Hearts', 'St. Mary\'s', 'Delhi Public', 'Greenwood', 'Apex', 'Bright Minds', 'National', 'Gyan'];
          suffixes = ['Academy', 'International School', 'Public School', 'High School', 'Institute of Learning'];
        } else if (cleanN.includes('shop') || cleanN.includes('store') || cleanN.includes('retail')) {
          prefixes = ['Mega', 'Super', 'City', 'Daily', 'Family', 'Smart', 'Value', 'Discount', 'Best', 'Quick'];
          suffixes = ['Mart', 'Store', 'Supermarket', 'Bazaar', 'Retailers', 'Enterprises'];
        }

        for (let i = 0; i < limitVal; i++) {
          const prefix = prefixes[i % prefixes.length];
          const suffix = suffixes[(i + 3) % suffixes.length];
          let bName = Math.random() > 0.5 ? `${prefix} ${cleanN.charAt(0).toUpperCase() + cleanN.slice(1)} ${suffix}` : `${cleanC} ${prefix} ${suffix}`;
          bName = bName.replace(/\s+/g, ' ').trim();
          
          const domain = bName.toLowerCase().replace(/[^a-z0-9]/g, '');
          generatedLeads.push({
            name: bName,
            website: `https://www.${domain}.in`,
            email: `contact@${domain}.in`,
            phone: `+91 9${Math.floor(100000000 + Math.random() * 900000000)}`,
            category: cleanN,
            lat: lat + (Math.sin(i * 1.7) * 0.012),
            lng: lng + (Math.cos(i * 1.7) * 0.012)
          });
        }
      }

      generatedLeads.forEach((lead, index) => {
        const name = lead.name || 'Unknown';
        const key = normName(name);
        if (seenNames.has(key)) return;
        seenNames.add(key);
        mergedList.push({
          id: 'FALLBACK-' + index + '-' + crypto.randomUUID().slice(0, 8),
          name,
          lat: parseFloat(lead.lat) || (lat + (Math.sin(index * 1.7) * 0.012)),
          lng: parseFloat(lead.lng) || (lng + (Math.cos(index * 1.7) * 0.012)),
          website: lead.website || '',
          phone: lead.phone || '',
          email: lead.email || '',
          category: lead.category || cleanNiche
        });
      });
    }

    const finalLeads = mergedList.slice(0, limitVal);
    
    // 5. Scrape, enrich, score, and store leads asynchronously in background
    const processLeadsAsync = async () => {
      console.log(`Starting enrichment for ${finalLeads.length} leads...`);
      const enrichmentPromises = finalLeads.map(async (item) => {
        let bestEmail = '';
        let bestPhone = item.phone || '';
        let websiteText = '';
        
        // Website Scraping via Jina Reader
        if (item.website) {
          try {
            const jinaUrl = `https://r.jina.ai/${item.website}`;
            const scrapeResp = await fetch(jinaUrl, { signal: AbortSignal.timeout(3000) });
            if (scrapeResp.ok) {
              websiteText = await scrapeResp.text();
              
              // Extract emails and phones using regexes
              const emailRx = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
              const foundEmails = [...new Set((websiteText.match(emailRx) || []).filter(e => 
                !e.includes('example') && !e.includes('sentry') && !e.includes('wixpress') && !e.includes('test')
              ))];
              if (foundEmails.length > 0) {
                bestEmail = foundEmails[0];
              }
              
              const phoneRx = /(?:\+91[\s-]?)?[6-9]\d{9}/g;
              const foundPhones = [...new Set(websiteText.match(phoneRx) || [])];
              if (foundPhones.length > 0 && !bestPhone) {
                bestPhone = foundPhones[0];
              }
            }
          } catch (scrapeErr) {
            // Failed scraping is fine, proceed to AI fallback
          }
        }
        
        // AI Enrichment using Groq Llama-3.3-70b
        let score = 5;
        let grade = 'Warm';
        let needsWebsite = !item.website;
        let needsMarketing = true;
        let bestContact = bestPhone ? 'Call' : 'Email';
        let whatsappMessage = `Namaste! Aapka ${item.name} business dekha — kya digital growth mein interested hain?`;
        let emailSubject = `Quick question for ${item.name}`;
        let emailBody = `Hello,\n\nI was looking at your business ${item.name} and noticed a few ways we can help you acquire more customers.`;
        let recommendedService = 'Digital Marketing';
        let reason = 'Retrieved via OSM and scraped.';
        let followUpDays = 3;
        
        if (groqKey) {
          try {
            const enrichResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${groqKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                max_tokens: 600,
                temperature: 0.1,
                response_format: { type: "json_object" },
                messages: [
                  {
                    role: 'system',
                    content: 'You are an Indian B2B sales AI. Return ONLY a valid JSON object. Required fields: score (integer 1-10), grade (Hot|Warm|Cold), needs_website (boolean), needs_social_media (boolean), needs_software (boolean), needs_marketing (boolean), business_stage (Growing|Established|Struggling|Unknown), best_contact_method (WhatsApp|Call|Email|Visit), whatsapp_message (string Hinglish under 80 words), email_subject (string), email_body (string), recommended_service (string), follow_up_days (integer 1-14), reason (string).'
                  },
                  {
                    role: 'user',
                    content: `Score this Indian business: Name=${item.name}, Category=${item.category}, City=${cityVal}, Phone=${bestPhone || 'None'}, Website=${item.website || 'None'}, Description=${websiteText.substring(0, 500) || 'None'}`
                  }
                ]
              })
            });
            
            if (enrichResponse.ok) {
              const enrichData = await enrichResponse.json();
              const ai = JSON.parse(enrichData.choices?.[0]?.message?.content || '{}');
              score = Math.min(10, Math.max(1, parseInt(ai.score) || score));
              grade = ai.grade || (score >= 8 ? 'Hot' : (score >= 5 ? 'Warm' : 'Cold'));
              needsWebsite = ai.needs_website !== undefined ? ai.needs_website : needsWebsite;
              needsMarketing = ai.needs_marketing !== undefined ? ai.needs_marketing : needsMarketing;
              bestContact = ai.best_contact_method || bestContact;
              whatsappMessage = ai.whatsapp_message || whatsappMessage;
              emailSubject = ai.email_subject || emailSubject;
              emailBody = ai.email_body || emailBody;
              recommendedService = ai.recommended_service || recommendedService;
              reason = ai.reason || reason;
              followUpDays = parseInt(ai.follow_up_days) || followUpDays;
            }
          } catch (enrichErr) {
            console.error('Enrichment call failed for lead:', item.name, enrichErr.message);
          }
        }
        
        const nextFollowup = new Date(Date.now() + followUpDays * 86400000).toISOString().split('T')[0];
        
        // ── Save to PostgreSQL with deduplication by (name, city) ────────────
        // Derive a stable lead_id from normalised name + city so same business
        // across repeated searches is always the same row (no duplicates).
        const stableId = `${item.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${cityVal.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        try {
          await pool.query(`
            INSERT INTO leads (
              lead_id, name, category, niche, city, website, phone, email, 
              ai_score, ai_grade, ai_needs_website, ai_needs_marketing, 
              ai_best_contact, ai_whatsapp_message, ai_email_subject, ai_recommended_service, ai_reason,
              lat, lng, next_followup, status, source
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
            ON CONFLICT (lead_id) DO UPDATE SET
              website = COALESCE(NULLIF(EXCLUDED.website,''), leads.website),
              phone   = COALESCE(NULLIF(EXCLUDED.phone,''),   leads.phone),
              email   = COALESCE(NULLIF(EXCLUDED.email,''),   leads.email),
              ai_score = GREATEST(EXCLUDED.ai_score, leads.ai_score),
              ai_grade = EXCLUDED.ai_grade,
              ai_whatsapp_message  = EXCLUDED.ai_whatsapp_message,
              ai_email_subject     = EXCLUDED.ai_email_subject,
              ai_recommended_service = EXCLUDED.ai_recommended_service,
              ai_reason            = EXCLUDED.ai_reason,
              next_followup        = EXCLUDED.next_followup
          `, [
            stableId, item.name, item.category, cleanNiche, cityVal, item.website || '', bestPhone, bestEmail,
            score, grade, needsWebsite, needsMarketing,
            bestContact, whatsappMessage, emailSubject, recommendedService, reason,
            parseFloat(item.lat), parseFloat(item.lng), nextFollowup, 'New', 'Direct Search'
          ]);
          
          await pool.query(`
            INSERT INTO lead_vectors (
              lead_id, business_name, city, niche, phone, website, 
              ai_score, ai_grade, needs_website, needs_marketing, text_chunk, embedding, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, ARRAY_FILL(0::float, ARRAY[1024])::double precision[], NOW())
            ON CONFLICT (lead_id) DO UPDATE SET
              business_name = EXCLUDED.business_name, city = EXCLUDED.city, niche = EXCLUDED.niche,
              phone = COALESCE(NULLIF(EXCLUDED.phone,''), lead_vectors.phone),
              website = COALESCE(NULLIF(EXCLUDED.website,''), lead_vectors.website),
              ai_score = EXCLUDED.ai_score,
              ai_grade = EXCLUDED.ai_grade, text_chunk = EXCLUDED.text_chunk
          `, [
            stableId, item.name, cityVal, cleanNiche, bestPhone, item.website || '',
            score, grade, needsWebsite, needsMarketing,
            `Business Name: ${item.name}. Industry: ${cleanNiche}. City: ${cityVal}. Score: ${score}/10. Grade: ${grade}. Contact: ${bestPhone || 'N/A'}. Email: ${bestEmail || 'N/A'}. Website: ${item.website || 'N/A'}. Recommended: ${recommendedService}.`
          ]);
        } catch (dbErr) {
          console.error('Failed to store enriched lead in DB:', dbErr.message);
        }
      });
      
      await Promise.all(enrichmentPromises);
      console.log(`Enrichment complete for ${finalLeads.length} leads.`);
    };
    
    // Execute asynchronously to return fast response to UI
    processLeadsAsync();
    
    res.json({
      message: 'Workflow triggered',
      niche: cleanNiche,
      city: cityVal,
      limit: limitVal
    });
  } catch (err) {
    console.error('Error in direct find-leads workflow:', err);
    res.status(500).json({ error: 'Direct find-leads failed', details: err.message });
  }
});

// ═══ REAL RAG CHAT BOT ENDPOINT ═══

app.post('/api/chat', async (req, res) => {
  try {
    const userQuery = req.body.message || '';
    const emailMode = !!req.body.emailMode;
    const groqKey = getGroqApiKey();
    
    if (!userQuery.trim()) {
      return res.status(400).json({ error: 'Message query cannot be empty' });
    }
    
    // 1. Store user query to DB memory
    await pool.query(
      'INSERT INTO chat_memory (user_id, role, text) VALUES ($1, $2, $3)',
      [req.user.id, 'user', userQuery]
    );
    
    // 2. Fetch past 10 messages context
    const historyResult = await pool.query(
      'SELECT role, text FROM chat_memory WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 10',
      [req.user.id]
    );
    const history = historyResult.rows.reverse();
    
    // 3. Dynamic RAG Retrieval Context
    let matchedLeads = [];
    
    // Token extraction or query analysis
    const q = userQuery.toLowerCase().trim();
    
    // Build keywords matching PostgreSQL query for dynamic retrieval
    let queryConditions = [];
    let queryParams = [];
    let paramIdx = 1;
    
    if (q.includes('hot')) {
      queryConditions.push(`ai_grade = $${paramIdx++}`);
      queryParams.push('Hot');
    }
    if (q.includes('warm')) {
      queryConditions.push(`ai_grade = $${paramIdx++}`);
      queryParams.push('Warm');
    }
    if (q.includes('cold')) {
      queryConditions.push(`ai_grade = $${paramIdx++}`);
      queryParams.push('Cold');
    }
    
    // Scan for Indian city keywords
    const citiesList = ['bangalore', 'pune', 'mumbai', 'delhi', 'kolkata', 'chennai', 'hyderabad'];
    for (const city of citiesList) {
      if (q.includes(city)) {
        queryConditions.push(`city ILIKE $${paramIdx++}`);
        queryParams.push(`%${city}%`);
      }
    }
    
    // Scan for niches
    const nichesList = ['restaurant', 'cafe', 'food', 'salon', 'spa', 'beauty', 'software', 'it', 'tech', 'clinic', 'hospital', 'doctor'];
    for (const niche of nichesList) {
      if (q.includes(niche)) {
        queryConditions.push(`niche ILIKE $${paramIdx++}`);
        queryParams.push(`%${niche}%`);
      }
    }
    
    let dbQuery = 'SELECT * FROM leads ORDER BY timestamp DESC LIMIT 8';
    if (queryConditions.length > 0) {
      dbQuery = `SELECT * FROM leads WHERE ${queryConditions.join(' OR ')} ORDER BY ai_score DESC LIMIT 8`;
    }
    
    try {
      const dbResult = await pool.query(dbQuery, queryParams);
      matchedLeads = dbResult.rows;
      console.log(`[CHAT] DB query returned ${matchedLeads.length} leads. Query: ${dbQuery.slice(0, 80)}`);
    } catch (dbErr) {
      console.error('[CHAT] RAG matching query failed, pulling default list:', dbErr.message);
      try {
        const defaultRes = await pool.query('SELECT * FROM leads ORDER BY timestamp DESC LIMIT 5');
        matchedLeads = defaultRes.rows;
        console.log(`[CHAT] Default fallback query returned ${matchedLeads.length} leads.`);
      } catch (fallbackErr) {
        console.error('[CHAT] Default fallback also failed:', fallbackErr.message);
      }
    }
    
    const leadsContext = matchedLeads.map(row => ({
      company: row.name || 'Unknown',
      website: row.website || '',
      phone: row.phone || '',
      email: row.email || '',
      industry: row.niche || 'Other',
      location: row.city || 'Bangalore',
      ai_score: row.ai_score || 5,
      ai_grade: row.ai_grade || 'Warm',
      ai_intent: row.ai_reason || 'Retrieved from database.',
      ai_recommended_action: row.ai_whatsapp_message ? 'Reach out via WhatsApp copy.' : 'Initiate direct connection.'
    }));
    
    const emailInstruction = emailMode ? 
      `\nCRITICAL OUTREACH MODE REQUIREMENT: Email Outreach Mode is ACTIVE. You MUST compose a highly-personalized professional email draft to the company/leads they are inquiring about. Pre-fill standard fields using the lead's company and email. At the very end of your response, you MUST append a valid outreach-draft JSON block inside a markdown code block labeled outreach-draft to enable the user to approve and send it in a single click.` : 
      `\nNote: If the user explicitly asks you to draft/write an email, you should do so and append the outreach-draft block. Otherwise, answer their questions about B2B leads using normal markdown.`;

    const systemPrompt = `You are a professional B2B lead generation assistant for Smart Lead Bot. You have access to the current database of leads. Answer the user's question using ONLY the provided leads data. Format your response beautifully in markdown. Keep answers concise, clear, and professional. End statements with periods. Do not use exclamations. Do not hallucinate or make up any leads.
${emailInstruction}

If the user requests to draft an email, compose an email, or conduct outreach to any lead:
1. Write a professional, personalized email draft in your markdown response.
2. To enable the interactive outreach sender card for the user, you MUST append a valid JSON block at the very end of your response inside a markdown code block labeled outreach-draft like this:
\`\`\`outreach-draft
{
  "to": "lead_email_address",
  "company": "Lead Company Name",
  "subject": "Email Subject",
  "body": "Personalized email body text"
}
\`\`\`

Active database leads in context:
${JSON.stringify(leadsContext)}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(0, -1).map(h => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.text
      })),
      { role: 'user', content: userQuery }
    ];
    
    let botReply = null;
    let draftEmail = null;
    
    if (!groqKey) {
      console.warn('[CHAT] GROQ_API_KEY is not set — using local database fallback.');
    } else {
      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 800,
            temperature: 0.2,
            messages: messages
          })
        });
        
        if (groqResponse.ok) {
          const groqData = await groqResponse.json();
          botReply = groqData.choices?.[0]?.message?.content || null;
          
          // Parse draft email block
          if (botReply) {
            const outreachMatch = botReply.match(/```outreach-draft\s*([\s\S]*?)\s*```/);
            if (outreachMatch) {
              try {
                draftEmail = JSON.parse(outreachMatch[1].trim());
              } catch (e) {
                console.warn('Failed to parse outreach-draft JSON:', e.message);
              }
            }
          }
        } else {
          const errBody = await groqResponse.text();
          console.error(`[CHAT] Groq API error ${groqResponse.status}: ${errBody.slice(0, 200)}`);
        }
      } catch (groqErr) {
        console.error('[CHAT] Groq connection failed:', groqErr.message);
      }
    }

    // Local DB fallback when Groq is unavailable or returned nothing
    if (!botReply) {
      const q = userQuery.toLowerCase();
      if (matchedLeads.length === 0) {
        botReply = `I searched the lead database but found no leads matching your query. Try asking about specific cities like **Pune**, **Mumbai**, or niches like **restaurants**, **IT**, or **salons**.`;
      } else {
        const topLead = matchedLeads[0];
        if (q.includes('email') || q.includes('send') || q.includes('draft') || q.includes('outreach')) {
          botReply = `Here are the top leads I found for outreach:\n\n` +
            matchedLeads.slice(0, 5).map(l => `**${l.name}** — ${l.city} | ${l.email || 'No email'} | Score: ${l.ai_score}/10 (${l.ai_grade})`).join('\n') +
            `\n\nTo draft a personalized email, enable **Email Mode** and ask me to draft an email to any of these companies.`;
        } else {
          botReply = `Here are the top ${matchedLeads.length} leads from the database:\n\n` +
            matchedLeads.map(l => `**${l.name}** (${l.city})\n- Industry: ${l.niche || 'Unknown'} | Score: ${l.ai_score}/10 (${l.ai_grade})\n- Phone: ${l.phone || 'N/A'} | Email: ${l.email || 'N/A'}\n- Website: ${l.website || 'N/A'}`).join('\n\n');
        }
      }
    }
    
    // Store bot response to chat memory
    const metaJson = draftEmail ? { draftEmail } : {};
    await pool.query(
      'INSERT INTO chat_memory (user_id, role, text, meta_json) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'bot', botReply, JSON.stringify(metaJson)]
    );
    
    res.json({ answer: botReply, draftEmail });
  } catch (err) {
    console.error('Error in RAG chat API:', err);
    res.status(500).json({ error: 'RAG query failed', details: err.message });
  }
});

app.get('/api/chat/history', async (req, res) => {
  try {
    const historyResult = await pool.query(
      'SELECT id, role, text, meta_json FROM chat_memory WHERE user_id = $1 ORDER BY timestamp ASC',
      [req.user.id]
    );
    const chats = historyResult.rows.map(row => ({
      id: row.id,
      type: row.role,
      text: row.text,
      draftEmail: row.meta_json?.draftEmail || null,
      status: row.meta_json?.status || null
    }));
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history', details: err.message });
  }
});

app.delete('/api/chat/history', async (req, res) => {
  try {
    await pool.query('DELETE FROM chat_memory WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'History cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear history', details: err.message });
  }
});

app.put('/api/chat/status/:msgId', async (req, res) => {
  try {
    const { msgId } = req.params;
    const { status } = req.body;
    const currentResult = await pool.query(
      'SELECT meta_json FROM chat_memory WHERE id = $1 AND user_id = $2',
      [msgId, req.user.id]
    );
    if (currentResult.rows.length > 0) {
      const currentMeta = currentResult.rows[0].meta_json || {};
      currentMeta.status = status;
      await pool.query(
        'UPDATE chat_memory SET meta_json = $1 WHERE id = $2 AND user_id = $3',
        [JSON.stringify(currentMeta), msgId, req.user.id]
      );
    }
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status', details: err.message });
  }
});

// Logs viewing endpoints (matching update logs in dashboard)
app.get('/api/n8n-logs', (req, res) => {
  try {
    const logPath = path.resolve('/home/node', 'n8n.log');
    if (fs.existsSync(logPath)) {
      res.setHeader('Content-Type', 'text/plain');
      res.send(fs.readFileSync(logPath, 'utf8'));
    } else {
      res.status(404).send('n8n.log not found');
    }
  } catch (err) {
    res.status(500).send('Failed to read logs: ' + err.message);
  }
});

app.get('/api/import-logs', (req, res) => {
  try {
    const logPath = path.resolve('/home/node', 'import.log');
    if (fs.existsSync(logPath)) {
      res.setHeader('Content-Type', 'text/plain');
      res.send(fs.readFileSync(logPath, 'utf8'));
    } else {
      res.status(404).send('import.log not found');
    }
  } catch (err) {
    res.status(500).send('Failed to read logs: ' + err.message);
  }
});


// ═══ CUSTOM INGEST TEMPLATES API ═══

app.get('/api/ingest-templates', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ingest_templates ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ingest-templates', async (req, res) => {
  try {
    const { name, fields } = req.body;
    if (!name || !fields || !Array.isArray(fields)) {
      return res.status(400).json({ error: 'Missing name or fields array' });
    }
    const result = await pool.query(
      'INSERT INTO ingest_templates (name, fields) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET fields = EXCLUDED.fields RETURNING *',
      [name, JSON.stringify(fields)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ingest-templates/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM ingest_templates WHERE id = $1', [req.params.id]);
    res.json({ message: 'Template deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══ GOOGLE OAUTH & FORMS API INTEGRATION ═══

// Helper: Resolve Google credentials from DB or Environment Variables
async function getGoogleCredentials(req) {
  try {
    const result = await pool.query("SELECT client_id, client_secret, redirect_uri FROM google_settings WHERE id = 'global'");
    if (result.rows.length > 0 && result.rows[0].client_id) {
      return {
        client_id: result.rows[0].client_id.trim(),
        client_secret: result.rows[0].client_secret.trim(),
        redirect_uri: result.rows[0].redirect_uri.trim()
      };
    }
  } catch (err) {
    console.warn('Failed to query google_settings:', err.message);
  }
  
  const client_id = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const client_secret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  let redirect_uri = (process.env.GOOGLE_REDIRECT_URI || '').trim();
  
  if (req && !redirect_uri) {
    const host = req.headers.host || (typeof req.get === 'function' ? req.get('host') : '') || 'localhost:7860';
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    redirect_uri = `${protocol}://${host}/api/auth/google/callback`;
  }
  
  return { client_id, client_secret, redirect_uri };
}

// Get Google Integration Connection Status
app.get('/api/google/status', async (req, res) => {
  try {
    const result = await pool.query("SELECT client_id, email, access_token, refresh_token FROM google_settings WHERE id = 'global'");
    const creds = await getGoogleCredentials(req);
    const configured = !!creds.client_id;
    const connected = result.rows.length > 0 && !!result.rows[0].access_token;
    const email = result.rows.length > 0 ? result.rows[0].email : null;
    const client_id = creds.client_id ? `${creds.client_id.substring(0, 8)}...` : null;
    
    // Check if the credentials came from the environment instead of database settings
    const isEnv = result.rows.length === 0 || !result.rows[0].client_id;
    
    res.json({
      connected,
      configured,
      envConfigured: isEnv && configured,
      email,
      client_id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save Google Client Credentials
app.post('/api/google/save-credentials', async (req, res) => {
  try {
    const { client_id, client_secret, redirect_uri } = req.body;
    if (!client_id || !client_secret || !redirect_uri) {
      return res.status(400).json({ error: 'Missing client_id, client_secret, or redirect_uri' });
    }
    await pool.query(`
      INSERT INTO google_settings (id, client_id, client_secret, redirect_uri)
      VALUES ('global', $1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET
        client_id = EXCLUDED.client_id,
        client_secret = EXCLUDED.client_secret,
        redirect_uri = EXCLUDED.redirect_uri
    `, [client_id.trim(), client_secret.trim(), redirect_uri.trim()]);
    res.json({ message: 'Google Client credentials saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate Consent Screen Auth URL
app.get('/api/google/auth-url', async (req, res) => {
  try {
    const { client_id, redirect_uri } = await getGoogleCredentials(req);
    if (!client_id || !redirect_uri) {
      return res.status(400).json({ error: 'Google Client Credentials are not configured.' });
    }
    const scopes = [
      'https://www.googleapis.com/auth/forms.body',
      'https://www.googleapis.com/auth/forms.responses.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ].join(' ');
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(client_id)}&` +
      `redirect_uri=${encodeURIComponent(redirect_uri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `access_type=offline&` +
      `prompt=consent`;
      
    res.json({ url: authUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// OAuth Callback Route
app.get('/api/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('OAuth Error: Missing code query parameter');
  }
  
  try {
    const { client_id, client_secret, redirect_uri } = await getGoogleCredentials(req);
    if (!client_id || !client_secret || !redirect_uri) {
      return res.status(400).send('OAuth Error: Credentials not configured');
    }
    
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id,
        client_secret,
        redirect_uri,
        grant_type: 'authorization_code'
      })
    });
    
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Token exchange failed: ${errText}`);
    }
    
    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokenData;
    const tokenExpiry = new Date(Date.now() + (expires_in || 3600) * 1000);
    
    // Fetch user profile to get email
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    
    let email = null;
    if (profileRes.ok) {
      const profile = await profileRes.json();
      email = profile.email;
    }
    
    // Save tokens in database (upserting 'global' so we save the used client_id and secret)
    await pool.query(`
      INSERT INTO google_settings (id, client_id, client_secret, redirect_uri, access_token, refresh_token, token_expiry, email)
      VALUES ('global', $1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = COALESCE(EXCLUDED.refresh_token, google_settings.refresh_token),
        token_expiry = EXCLUDED.token_expiry,
        email = COALESCE(EXCLUDED.email, google_settings.email)
    `, [client_id, client_secret, redirect_uri, access_token, refresh_token || null, tokenExpiry, email]);
    
    // Redirect to dashboard page
    res.send(`
      <html>
        <head>
          <style>
            body { background: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            h2 { color: #38bdf8; }
            .spinner { width: 50px; height: 50px; border: 5px solid #1e293b; border-top-color: #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; margin-top: 20px; }
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <h2>Google Account Connected Successfully!</h2>
          <p>Redirecting you back to the B2B dashboard...</p>
          <div class="spinner"></div>
          <script>
            setTimeout(() => {
              window.location.href = '/';
            }, 2000);
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Google OAuth Callback Error:', err.message);
    res.status(500).send(`OAuth callback error: ${err.message}`);
  }
});

// Helper: Get fresh access token using refresh token if expired
async function getFreshGoogleToken() {
  const result = await pool.query("SELECT access_token, refresh_token, token_expiry FROM google_settings WHERE id = 'global'");
  if (result.rows.length === 0 || !result.rows[0].access_token) {
    throw new Error('Google integration not connected');
  }
  const row = result.rows[0];
  const { access_token, refresh_token, token_expiry } = row;
  
  if (token_expiry && new Date(token_expiry) > new Date(Date.now() + 60000)) {
    return access_token;
  }
  
  if (!refresh_token) {
    throw new Error('Google access token expired and no refresh token available. Reconnect your account.');
  }
  
  const { client_id, client_secret } = await getGoogleCredentials(null);
  if (!client_id || !client_secret) {
    throw new Error('Google Client Credentials are not configured.');
  }
  
  // Refresh token
  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id,
      client_secret,
      refresh_token,
      grant_type: 'refresh_token'
    })
  });
  
  if (!refreshRes.ok) {
    const errText = await refreshRes.text();
    throw new Error(`Failed to refresh Google token: ${errText}`);
  }
  
  const tokenData = await refreshRes.json();
  const nextAccessToken = tokenData.access_token;
  const expires_in = tokenData.expires_in || 3600;
  const nextTokenExpiry = new Date(Date.now() + expires_in * 1000);
  
  await pool.query(`
    UPDATE google_settings SET
      access_token = $1,
      token_expiry = $2
    WHERE id = 'global'
  `, [nextAccessToken, nextTokenExpiry]);
  
  return nextAccessToken;
}


// Create a new Google Form
app.post('/api/google-forms/create', async (req, res) => {
  try {
    const { title, fields } = req.body;
    if (!title || !fields || !Array.isArray(fields)) {
      return res.status(400).json({ error: 'Missing form title or fields schema array' });
    }
    
    const accessToken = await getFreshGoogleToken();
    
    // Step 1: Create a blank form
    const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        info: {
          title: title,
          documentTitle: title
        }
      })
    });
    
    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Google Form creation failed: ${errText}`);
    }
    
    const formData = await createRes.json();
    const { formId, responderUri } = formData;
    
    // Step 2: Add question items to the Form in batchUpdate
    const requests = fields.map((field, index) => {
      return {
        createItem: {
          item: {
            title: field.label,
            // Store the field key in description so we can map it back during sync
            description: `[Key: ${field.key}]`,
            questionItem: {
              question: {
                required: field.required || false,
                textQuestion: {} // Multi-line or text field
              }
            }
          },
          location: {
            index: index
          }
        }
      };
    });
    
    const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });
    
    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`Failed to populate Form questions: ${errText}`);
    }
    
    // Step 3: Save Form to database
    const dbRes = await pool.query(`
      INSERT INTO google_forms (form_id, title, responder_uri)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [formId, title, responderUri]);
    
    res.json(dbRes.rows[0]);
  } catch (err) {
    console.error('Google Form Create Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// List all created Google Forms
app.get('/api/google-forms/list', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM google_forms ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync responses for a Google Form
app.post('/api/google-forms/sync', async (req, res) => {
  const { formId } = req.body;
  if (!formId) {
    return res.status(400).json({ error: 'Missing formId parameter' });
  }
  
  try {
    const accessToken = await getFreshGoogleToken();
    
    // Step 1: Get form structure to identify question IDs and their descriptions ([Key: ...])
    const formMetaRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!formMetaRes.ok) {
      const errText = await formMetaRes.text();
      throw new Error(`Failed to retrieve Form questions: ${errText}`);
    }
    
    const formMeta = await formMetaRes.json();
    const items = formMeta.items || [];
    
    // Map questionId -> fieldKey
    const questionIdToKey = {};
    items.forEach(item => {
      if (item.questionItem && item.questionItem.question) {
        const questionId = item.questionItem.question.questionId;
        const desc = item.description || '';
        const match = desc.match(/\[Key:\s*(.*?)\]/);
        if (match) {
          questionIdToKey[questionId] = match[1].trim();
        } else {
          // Fallback to title based slugs if description was altered
          const slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
          questionIdToKey[questionId] = slug;
        }
      }
    });
    
    // Step 2: Fetch responses
    const responsesRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!responsesRes.ok) {
      const errText = await responsesRes.text();
      throw new Error(`Failed to retrieve Form responses: ${errText}`);
    }
    
    const responsesData = await responsesRes.json();
    const responses = responsesData.responses || [];
    
    let importedCount = 0;
    
    // Step 3: Parse and ingest submissions as leads
    for (const resp of responses) {
      const responseId = resp.responseId;
      const lastSubmittedTime = resp.lastSubmittedTime;
      const answers = resp.answers || {};
      
      // Determine leadId: check if response already ingested
      const leadId = `google_form_${responseId}`;
      const checkRes = await pool.query('SELECT lead_id FROM leads WHERE lead_id = $1', [leadId]);
      if (checkRes.rows.length > 0) {
        continue; // Already synced
      }
      
      // Build lead values
      const leadObj = {
        leadId,
        source: `Google Form Sub`
      };
      
      Object.keys(answers).forEach(qId => {
        const key = questionIdToKey[qId];
        const textAnswers = answers[qId].textAnswers?.answers || [];
        const val = textAnswers.map(a => a.value).join(', ');
        if (key) {
          leadObj[key] = val;
        }
      });
      
      // Extract properties
      const name = leadObj.company || leadObj.name || 'Unknown';
      const niche = leadObj.industry || leadObj.niche || null;
      const city = leadObj.location || leadObj.city || null;
      const website = leadObj.website || null;
      const phone = leadObj.phone || null;
      const email = leadObj.email || null;
      
      // Separate custom fields
      const coreKeys = ['leadId', 'company', 'name', 'industry', 'niche', 'location', 'city', 'website', 'phone', 'email', 'source', 'lat', 'lng', 'ai_score', 'ai_grade', 'status', 'next_followup', 'timestamp', 'created_at', 'custom_fields'];
      const customFields = {};
      Object.keys(leadObj).forEach(key => {
        if (!coreKeys.includes(key)) {
          customFields[key] = leadObj[key];
        }
      });
      
      // Ingest lead (No AI auto-fill, missing fields remain NULL)
      await pool.query(`
        INSERT INTO leads (
          lead_id, name, niche, city, website, phone, email, 
          ai_score, ai_grade, ai_needs_website, ai_needs_marketing, 
          ai_best_contact, ai_whatsapp_message, ai_email_subject, ai_recommended_service, ai_reason,
          status, source, timestamp, lat, lng, next_followup, custom_fields
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, null, null, $10, null, null, null, null, $11, $12, $13, null, null, null, $14)
      `, [
        leadId, name, niche, city, website, phone, email,
        null, null, phone ? 'Call' : (email ? 'Email' : 'Visit'),
        'New', `Google Form: ${formMeta.info.title}`, new Date(lastSubmittedTime), JSON.stringify(customFields)
      ]);
      
      // Ingest vector
      await pool.query(`
        INSERT INTO lead_vectors (
          lead_id, business_name, city, niche, phone, website, 
          ai_score, ai_grade, needs_website, needs_marketing, text_chunk, embedding, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, ARRAY_FILL(0::float, ARRAY[1024])::double precision[], $12)
      `, [
        leadId, name, city || 'N/A', niche || 'N/A', phone, website,
        5, 'Warm', !website, true,
        `Business Name: ${name}. Industry: ${niche || 'N/A'}. City: ${city || 'N/A'}. Score: N/A/10. Grade: Warm. Contact phone: ${phone || 'N/A'}. email: ${email || 'N/A'}. Source: Google Form.`,
        new Date(lastSubmittedTime)
      ]);
      
      importedCount++;
    }
    
    // Update last synced timestamp
    await pool.query(`
      UPDATE google_forms SET last_synced_at = NOW() WHERE form_id = $1
    `, [formId]);
    
    res.json({ message: `Successfully synced! Imported ${importedCount} new leads.`, count: importedCount });
  } catch (err) {
    console.error('Google Form Sync Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══ SERVE STATIC VITE FRONTEND ═══

const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  console.log(`Serving static production files from: ${distPath}`);
  app.use(express.static(distPath));
  
  // Wildcard client routing redirect
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.warn(`WARNING: Production distribution folder not found at ${distPath}. Build the project first.`);
}

const PORT = process.env.PORT || 7860;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Production Express backend is running on port ${PORT}`);
});
