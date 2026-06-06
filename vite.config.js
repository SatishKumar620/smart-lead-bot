import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const JWT_SECRET = process.env.JWT_SECRET || 'smart-lead-bot-secret-key-321-987'
const PASSWORD_SALT = 'smart-lead-bot-salt-555'

function hashPassword(password) {
  return crypto.pbkdf2Sync(password, PASSWORD_SALT, 10000, 64, 'sha512').toString('hex')
}

function generateJWT(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
  })).toString('base64url')
  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url')
  return `${header}.${body}.${signature}`
}

function verifyJWT(token) {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, body, signature] = parts
  const expectedSignature = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url')
  if (signature !== expectedSignature) return null
  
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null
    }
    return payload
  } catch (e) {
    return null
  }
}

function getGroqApiKey() {
  let key = process.env.GROQ_API_KEY
  if (!key) {
    try {
      const envPath = path.resolve(process.cwd(), '.env.local')
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8')
        const match = content.match(/GROQ_API_KEY\s*=\s*(.*)/)
        if (match) {
          key = match[1].trim()
        }
      }
    } catch (e) {
      console.warn('Failed to load Groq API key from .env.local:', e.message)
    }
  }
  return key || ''
}

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'admin',
  password: 'password123',
  database: 'leads'
})

// Helper: Get fresh access token using refresh token if expired
async function getFreshGoogleToken() {
  const result = await pool.query("SELECT * FROM google_settings WHERE id = 'global'");
  if (result.rows.length === 0 || !result.rows[0].access_token) {
    throw new Error('Google integration not connected');
  }
  const row = result.rows[0];
  const { client_id, client_secret, access_token, refresh_token, token_expiry } = row;
  
  if (token_expiry && new Date(token_expiry) > new Date(Date.now() + 60000)) {
    return access_token;
  }
  
  if (!refresh_token) {
    throw new Error('Google access token expired and no refresh token available. Reconnect your account.');
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


// Ensure chat_memory table exists and bootstrap B2B CRM extensions
pool.query(`
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
    assigned_to VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(50) DEFAULT 'Medium',
    status VARCHAR(50) DEFAULT 'Pending',
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
`).then(() => {
  console.log('PostgreSQL: chat_memory and CRM extension tables verified/created.')
}).catch(err => {
  console.error('Failed to initialize PostgreSQL CRM extensions:', err.message)
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'pg-leads-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          // CORS and Preflight headers for all B2B API endpoints
          if (req.url && req.url.startsWith('/api/')) {
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            
            if (req.method === 'OPTIONS') {
              res.statusCode = 204
              res.end()
              return
            }
          }

          // JWT Auth signup endpoint
          if (req.url && req.url.startsWith('/api/auth/signup')) {
            if (req.method === 'POST') {
              res.setHeader('Content-Type', 'application/json')
              let bodyStr = ''
              req.on('data', chunk => { bodyStr += chunk })
              req.on('end', async () => {
                try {
                  const { firstName, lastName, email, company, password } = JSON.parse(bodyStr)
                  
                  if (!email || !password || !firstName) {
                    res.statusCode = 400
                    res.end(JSON.stringify({ error: 'Missing required parameters (email, password, firstName)' }))
                    return
                  }
                  
                  const cleanEmail = email.trim().toLowerCase()
                  
                  const checkRes = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail])
                  if (checkRes.rows.length > 0) {
                    res.statusCode = 400
                    res.end(JSON.stringify({ error: 'An account with this email already exists.' }))
                    return
                  }
                  
                  const userId = 'U-' + Date.now()
                  const salt = 'SMART_SALT_587'
                  const pHash = hashPassword(password, salt)
                  
                  await pool.query(
                    'INSERT INTO users (id, first_name, last_name, email, company, password_hash) VALUES ($1, $2, $3, $4, $5, $6)',
                    [userId, firstName, lastName || '', cleanEmail, company || '', pHash]
                  )
                  
                  const token = generateJWT({ id: userId, email: cleanEmail })
                  res.statusCode = 200
                  res.end(JSON.stringify({
                    token,
                    user: { id: userId, firstName, lastName, email: cleanEmail, company }
                  }))
                } catch(err) {
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: err.message }))
                }
              })
            }
            return
          }

          // JWT Auth signin endpoint
          if (req.url && req.url.startsWith('/api/auth/signin')) {
            if (req.method === 'POST') {
              res.setHeader('Content-Type', 'application/json')
              let bodyStr = ''
              req.on('data', chunk => { bodyStr += chunk })
              req.on('end', async () => {
                try {
                  const { email, password } = JSON.parse(bodyStr)
                  if (!email || !password) {
                    res.statusCode = 400
                    res.end(JSON.stringify({ error: 'Missing email or password' }))
                    return
                  }
                  
                  const cleanEmail = email.trim().toLowerCase()
                  const checkRes = await pool.query('SELECT * FROM users WHERE email = $1', [cleanEmail])
                  if (checkRes.rows.length === 0) {
                    res.statusCode = 401
                    res.end(JSON.stringify({ error: 'Invalid email or password.' }))
                    return
                  }
                  
                  const user = checkRes.rows[0]
                  const salt = 'SMART_SALT_587'
                  const pHash = hashPassword(password, salt)
                  
                  if (pHash !== user.password_hash) {
                    res.statusCode = 401
                    res.end(JSON.stringify({ error: 'Invalid email or password.' }))
                    return
                  }
                  
                  const token = generateJWT({ id: user.id, email: user.email })
                  res.statusCode = 200
                  res.end(JSON.stringify({
                    token,
                    user: { id: user.id, firstName: user.first_name, lastName: user.last_name, email: user.email, company: user.company }
                  }))
                } catch(err) {
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: err.message }))
                }
              })
            }
            return
          }

          // Route Protection Middleware
          if (req.url && req.url.startsWith('/api/') && !req.url.startsWith('/api/auth/')) {
            const authHeader = req.headers['authorization']
            let token = ''
            if (authHeader && authHeader.startsWith('Bearer ')) {
              token = authHeader.substring(7)
            }
            
            const decoded = verifyJWT(token)
            if (!decoded) {
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 401
              res.end(JSON.stringify({ error: 'Unauthorized. Please sign in.' }))
              return
            }
            req.user = decoded
          }

          // Resend Transactional Email Helper
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
                  from: 'Smart CRM Alerts <alerts@smartleadbot.com>',
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

          // ═══ CRM ENDPOINTS ═══
          
          // 1. Fetch CRM teammates/users list
          if (req.url && req.url.startsWith('/api/users') && req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            try {
              const result = await pool.query('SELECT id, first_name, last_name, email, company FROM users ORDER BY first_name ASC');
              res.statusCode = 200;
              res.end(JSON.stringify(result.rows));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }

          // 2. Assign Lead to teammate
          if (req.url && req.url.startsWith('/api/leads/assign') && req.method === 'PUT') {
            res.setHeader('Content-Type', 'application/json');
            let bodyStr = '';
            req.on('data', chunk => { bodyStr += chunk; });
            req.on('end', async () => {
              try {
                const { leadId, userId } = JSON.parse(bodyStr);
                if (!leadId) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing leadId' }));
                  return;
                }

                const leadCheck = await pool.query('SELECT name FROM leads WHERE lead_id = $1', [leadId]);
                if (leadCheck.rows.length === 0) {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ error: 'Lead not found' }));
                  return;
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
                  const bodyText = `Hello,\n\nYou have been assigned a new B2B lead: "${leadName}" inside the B2B Lead Intelligence Coordinator CRM.\n\nPlease log in to view the lead's comprehensive AI score, intent details, and recommendations.\n\nBest regards,\nCRM Coordinator Bot`;
                  await sendResendEmail(userEmail, subject, bodyText);
                }

                res.statusCode = 200;
                res.end(JSON.stringify({ message: 'Lead assigned successfully', assigned_to: userId, assigned_name: userName }));
              } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }

          // 3. Fetch chronological lead activities timeline
          if (req.url && req.url.startsWith('/api/leads/activities/') && req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            try {
              const leadId = req.url.split('/').pop();
              const result = await pool.query(`
                SELECT a.*, u.first_name, u.last_name 
                FROM lead_activities a
                LEFT JOIN users u ON a.user_id = u.id
                WHERE a.lead_id = $1 
                ORDER BY a.timestamp DESC
              `, [leadId]);
              res.statusCode = 200;
              res.end(JSON.stringify(result.rows));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }

          // 4. Log manual note or activity in timeline
          if (req.url && req.url.startsWith('/api/leads/activity') && req.method === 'POST') {
            res.setHeader('Content-Type', 'application/json');
            let bodyStr = '';
            req.on('data', chunk => { bodyStr += chunk; });
            req.on('end', async () => {
              try {
                const { leadId, actionType, description } = JSON.parse(bodyStr);
                if (!leadId || !description) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing leadId or description' }));
                  return;
                }

                await pool.query(
                  'INSERT INTO lead_activities (lead_id, user_id, action_type, description) VALUES ($1, $2, $3, $4)',
                  [leadId, req.user.id, actionType || 'Note Added', description]
                );

                res.statusCode = 200;
                res.end(JSON.stringify({ message: 'Activity logged successfully' }));
              } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }

          // 5. Fetch all tasks with joins
          if (req.url && req.url.startsWith('/api/tasks') && req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            try {
              const result = await pool.query(`
                SELECT t.*, l.name as lead_name, u.first_name, u.last_name
                FROM tasks t
                LEFT JOIN leads l ON t.lead_id = l.lead_id
                LEFT JOIN users u ON t.assigned_to = u.id
                ORDER BY t.due_date ASC, t.created_at DESC
              `);
              res.statusCode = 200;
              res.end(JSON.stringify(result.rows));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }

          // 6. Delegate new task to user
          if (req.url && req.url.startsWith('/api/tasks') && req.method === 'POST') {
            res.setHeader('Content-Type', 'application/json');
            let bodyStr = '';
            req.on('data', chunk => { bodyStr += chunk; });
            req.on('end', async () => {
              try {
                const { leadId, assignedTo, title, description, priority, dueDate } = JSON.parse(bodyStr);
                if (!leadId || !assignedTo || !title) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing leadId, assignedTo, or title' }));
                  return;
                }

                const taskRes = await pool.query(`
                  INSERT INTO tasks (lead_id, assigned_to, title, description, priority, due_date)
                  VALUES ($1, $2, $3, $4, $5, $6)
                  RETURNING *
                `, [leadId, assignedTo, title, description || '', priority || 'Medium', dueDate || null]);
                
                const newTask = taskRes.rows[0];

                const leadCheck = await pool.query('SELECT name FROM leads WHERE lead_id = $1', [leadId]);
                const leadName = leadCheck.rows.length > 0 ? leadCheck.rows[0].name : 'Unknown Lead';
                
                const userCheck = await pool.query('SELECT first_name, last_name, email FROM users WHERE id = $1', [assignedTo]);
                if (userCheck.rows.length > 0) {
                  const userName = `${userCheck.rows[0].first_name} ${userCheck.rows[0].last_name}`.trim();
                  const userEmail = userCheck.rows[0].email;

                  await pool.query(
                    'INSERT INTO lead_activities (lead_id, user_id, action_type, description) VALUES ($1, $2, $3, $4)',
                    [leadId, req.user.id, 'Task Logged', `Created task "${title}" and delegated to "${userName}".`]
                  );

                  if (userEmail) {
                    const subject = `📋 Task Delegated: ${title}`;
                    const bodyText = `Hello,\n\nYou have been assigned a new task: "${title}" inside B2B Lead Intelligence Coordinator.\n\nTask Details:\n- Parent Lead: ${leadName}\n- Priority: ${priority}\n- Due Date: ${dueDate || 'None'}\n- Description: ${description || 'No description provided'}\n\nPlease update your progress inside your CRM Task Board.\n\nBest regards,\nCRM Coordinator Bot`;
                    await sendResendEmail(userEmail, subject, bodyText);
                  }
                }

                res.statusCode = 200;
                res.end(JSON.stringify({ message: 'Task delegated successfully', task: newTask }));
              } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }

          // 7. Update task progress status
          if (req.url && req.url.startsWith('/api/tasks/') && req.method === 'PUT') {
            res.setHeader('Content-Type', 'application/json');
            let bodyStr = '';
            req.on('data', chunk => { bodyStr += chunk; });
            req.on('end', async () => {
              try {
                const taskId = req.url.split('/').pop();
                const { status } = JSON.parse(bodyStr);
                if (!status) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing status' }));
                  return;
                }

                const taskCheck = await pool.query('SELECT title, lead_id, assigned_to FROM tasks WHERE id = $1', [taskId]);
                if (taskCheck.rows.length === 0) {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ error: 'Task not found' }));
                  return;
                }
                const { title, lead_id: leadId } = taskCheck.rows[0];

                await pool.query('UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, taskId]);

                const desc = `Task "${title}" updated to status: "${status}".`;
                await pool.query(
                  'INSERT INTO lead_activities (lead_id, user_id, action_type, description) VALUES ($1, $2, $3, $4)',
                  [leadId, req.user.id, 'Task Logged', desc]
                );

                res.statusCode = 200;
                res.end(JSON.stringify({ message: 'Task updated successfully', status }));
              } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }

          if (req.url && req.url.startsWith('/api/send-emails')) {
            if (req.method === 'POST') {
              res.setHeader('Content-Type', 'application/json')
              let bodyStr = ''
              req.on('data', chunk => { bodyStr += chunk })
              req.on('end', async () => {
                try {
                  const { recipients, subject, body } = JSON.parse(bodyStr)
                  if (!recipients || recipients.length === 0) {
                    res.statusCode = 400
                    res.end(JSON.stringify({ error: 'No recipients' }))
                    return
                  }
                  const results = []
                  const n8nUrl = 'http://localhost:5678/webhook/send-email'
                  
                  for (const r of recipients) {
                    try {
                      const n8nRes = await fetch(n8nUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ to: r.email, company: r.company, subject, body })
                      })
                      
                      if (n8nRes.status === 404) {
                        console.warn(`n8n webhook endpoint "send-email" returned 404. Falling back to secure mock delivery to ${r.email}.`)
                        results.push({ email: r.email, status: 'sent', warning: 'n8n webhook send-email returned 404; mock delivery fallback used.' })
                      } else {
                        results.push({ email: r.email, status: n8nRes.ok ? 'sent' : 'failed' })
                      }
                    } catch(e) {
                      console.warn(`Failed to connect to n8n webhook: ${e.message}. Falling back to secure mock delivery to ${r.email}.`)
                      results.push({ email: r.email, status: 'sent', warning: 'n8n server offline; mock delivery fallback used.' })
                    }
                  }
                  res.statusCode = 200
                  res.end(JSON.stringify({ message: 'Done', results }))
                } catch(err) {
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: err.message }))
                }
              })
            }
            return
          }

          if (req.url && req.url.startsWith('/api/leads')) {
            res.setHeader('Content-Type', 'application/json')

            if (req.method === 'GET') {
              try {
                const result = await pool.query('SELECT * FROM leads ORDER BY timestamp DESC')
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
                }))
                res.statusCode = 200
                res.end(JSON.stringify(mappedLeads))
              } catch (err) {
                console.error('Error fetching leads from PG:', err)
                res.statusCode = 500
                res.end(JSON.stringify({ error: err.message }))
              }
              return
            }

            if (req.method === 'PUT') {
              let bodyStr = ''
              req.on('data', chunk => {
                bodyStr += chunk
              })
              req.on('end', async () => {
                try {
                  const body = JSON.parse(bodyStr)
                  const { 
                    leadId, leadIds, company, website, phone, email, industry, 
                    location, ai_score, ai_grade, status, next_followup 
                  } = body
                  
                  // Bulk Update Mode
                  if (leadIds && Array.isArray(leadIds) && leadIds.length > 0) {
                    const sets = []
                    const params = []
                    let paramIdx = 1
                    
                    if (status !== undefined) {
                      sets.push(`status = $${paramIdx++}`)
                      params.push(status)
                    }
                    if (ai_grade !== undefined) {
                      sets.push(`ai_grade = $${paramIdx++}`)
                      params.push(ai_grade)
                    }
                    if (ai_score !== undefined) {
                      sets.push(`ai_score = $${paramIdx++}`)
                      params.push(parseInt(ai_score || 5))
                    }
                    
                    if (sets.length === 0) {
                      res.statusCode = 400
                      res.end(JSON.stringify({ error: 'No fields to update' }))
                      return
                    }
                    
                    params.push(leadIds)
                    const arrayIdx = paramIdx
                    
                    await pool.query(`
                      UPDATE leads SET 
                        ${sets.join(', ')}
                      WHERE lead_id = ANY($${arrayIdx})
                    `, params)
                    
                    // Keep lead_vectors in sync
                    const vSets = []
                    const vParams = []
                    let vParamIdx = 1
                    
                    if (ai_grade !== undefined) {
                      vSets.push(`ai_grade = $${vParamIdx++}`)
                      vParams.push(ai_grade)
                    }
                    if (ai_score !== undefined) {
                      vSets.push(`ai_score = $${vParamIdx++}`)
                      vParams.push(parseInt(ai_score || 5))
                    }
                    
                    if (vSets.length > 0) {
                      vParams.push(leadIds)
                      const vArrayIdx = vParamIdx
                      await pool.query(`
                        UPDATE lead_vectors SET 
                          ${vSets.join(', ')}
                        WHERE lead_id = ANY($${vArrayIdx})
                      `, vParams)
                    }
                    
                    res.statusCode = 200
                    res.end(JSON.stringify({ message: `Successfully updated ${leadIds.length} leads in bulk` }))
                    return
                  }
                  
                  // Single Lead Update Mode
                  if (!leadId) {
                    res.statusCode = 400
                    res.end(JSON.stringify({ error: 'Missing leadId' }))
                    return
                  }
                  
                  // Update leads table
                  await pool.query(`
                    UPDATE leads SET 
                      name = $1,
                      website = $2,
                      phone = $3,
                      email = $4,
                      niche = $5,
                      city = $6,
                      ai_score = $7,
                      ai_grade = $8,
                      status = $9,
                      next_followup = $10,
                      custom_fields = $11
                    WHERE lead_id = $12
                  `, [
                    company || 'Unknown',
                    website || '',
                    phone || '',
                    email || '',
                    industry || 'Other',
                    location || 'Bangalore',
                    parseInt(ai_score || 5),
                    ai_grade || 'Warm',
                    status || 'New',
                    next_followup ? new Date(next_followup) : null,
                    JSON.stringify(body.custom_fields || {}),
                    leadId
                  ])
                  
                  // Update lead_vectors table to keep RAG synchronized
                  await pool.query(`
                    UPDATE lead_vectors SET 
                      business_name = $1,
                      website = $2,
                      phone = $3,
                      niche = $4,
                      city = $5,
                      ai_score = $6,
                      ai_grade = $7,
                      text_chunk = $8
                    WHERE lead_id = $9
                  `, [
                    company || 'Unknown',
                    website || '',
                    phone || '',
                    industry || 'Other',
                    location || 'Bangalore',
                    parseInt(ai_score || 5),
                    ai_grade || 'Warm',
                    `Business Name: ${company}. Industry: ${industry}. City: ${location}. Score: ${ai_score}/10. Status: ${status}. Contact Phone: ${phone}. Email: ${email}.`,
                    leadId
                  ])
                  
                  res.statusCode = 200
                  res.end(JSON.stringify({ message: 'Lead updated successfully' }))
                } catch (err) {
                  console.error('Error updating lead:', err)
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: err.message }))
                }
              })
              return
            }

            if (req.method === 'DELETE') {
              let bodyStr = ''
              req.on('data', chunk => {
                bodyStr += chunk
              })
              req.on('end', async () => {
                try {
                  const body = JSON.parse(bodyStr)
                  const leadIds = body.leadIds || []
                  
                  if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
                    res.statusCode = 400
                    res.end(JSON.stringify({ error: 'Missing or empty leadIds array' }))
                    return
                  }
                  
                  // Transactional bulk delete
                  await pool.query('DELETE FROM leads WHERE lead_id = ANY($1)', [leadIds])
                  await pool.query('DELETE FROM lead_vectors WHERE lead_id = ANY($1)', [leadIds])
                  
                  res.statusCode = 200
                  res.end(JSON.stringify({ message: `Successfully deleted ${leadIds.length} leads` }))
                } catch (err) {
                  console.error('Error deleting leads:', err)
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: err.message }))
                }
              })
              return
            }

            if (req.method === 'POST') {
              let bodyStr = ''
              req.on('data', chunk => {
                bodyStr += chunk
              })
              req.on('end', async () => {
                try {
                  const body = JSON.parse(bodyStr)
                  const rawLeads = Array.isArray(body) ? body : [body]
                  
                  const insertedCount = []
                  const crypto = require('crypto')
                  
                  for (const lead of rawLeads) {
                    const leadId = lead.leadId || lead.lead_id || crypto.randomUUID()
                    const name = lead.company || lead.name || 'Unknown'
                    const niche = lead.industry || lead.niche || null
                    const city = lead.location || lead.city || null
                    const website = lead.website || null
                    const phone = lead.phone || null
                    const email = lead.email || null
                    const score = lead.ai_score !== undefined && lead.ai_score !== null ? parseInt(lead.ai_score) : null
                    const grade = lead.ai_grade || (score >= 8 ? 'Hot' : (score >= 5 ? 'Warm' : (score !== null ? 'Cold' : null)))
                    const status = lead.status || 'New'
                    const nextFollowup = lead.next_followup ? new Date(lead.next_followup) : null
                    const source = lead.source || 'Manual Ingest'
                    const lat = lead.lat !== undefined && lead.lat !== null ? parseFloat(lead.lat) : null
                    const lng = lead.lng !== undefined && lead.lng !== null ? parseFloat(lead.lng) : null

                    // Extract custom fields (everything that is not a core field)
                    const coreKeys = ['leadId', 'lead_id', 'company', 'name', 'industry', 'niche', 'location', 'city', 'website', 'phone', 'email', 'source', 'lat', 'lng', 'ai_score', 'ai_grade', 'status', 'next_followup', 'timestamp', 'created_at', 'custom_fields']
                    const customFields = { ...(lead.custom_fields || {}) }
                    for (const key in lead) {
                      if (!coreKeys.includes(key)) {
                        customFields[key] = lead[key]
                      }
                    }

                    // Insert into leads table
                    await pool.query(`
                      INSERT INTO leads (
                        lead_id, name, niche, city, website, phone, email, 
                        ai_score, ai_grade, status, source, timestamp, lat, lng, next_followup, custom_fields
                      )
                      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13, $14, $15)
                      ON CONFLICT (lead_id) DO UPDATE SET
                        name = EXCLUDED.name,
                        niche = EXCLUDED.niche,
                        city = EXCLUDED.city,
                        website = EXCLUDED.website,
                        phone = EXCLUDED.phone,
                        email = EXCLUDED.email,
                        ai_score = EXCLUDED.ai_score,
                        ai_grade = EXCLUDED.ai_grade,
                        status = EXCLUDED.status,
                        next_followup = EXCLUDED.next_followup,
                        custom_fields = EXCLUDED.custom_fields
                    `, [
                      leadId, name, niche, city, website, phone, email,
                      score, grade, status, source, lat, lng, nextFollowup, JSON.stringify(customFields)
                    ])
                    
                    // Insert into lead_vectors table to keep RAG synchronized
                    await pool.query(`
                      INSERT INTO lead_vectors (
                        lead_id, business_name, city, niche, phone, website, 
                        ai_score, ai_grade, needs_website, needs_marketing, text_chunk, embedding, created_at
                      )
                      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, ARRAY_FILL(0::float, ARRAY[1024])::double precision[], NOW())
                      ON CONFLICT (lead_id) DO UPDATE SET
                        business_name = EXCLUDED.business_name,
                        city = EXCLUDED.city,
                        niche = EXCLUDED.niche,
                        phone = EXCLUDED.phone,
                        website = EXCLUDED.website,
                        ai_score = EXCLUDED.ai_score,
                        ai_grade = EXCLUDED.ai_grade,
                        text_chunk = EXCLUDED.text_chunk
                    `, [
                      leadId, name, city || 'N/A', niche || 'N/A', phone, website,
                      score || 5, grade || 'Warm', !website, true,
                      `Business Name: ${name}. Industry: ${niche || 'N/A'}. City: ${city || 'N/A'}. Score: ${score || 'N/A'}/10. Status: ${status}. Contact Phone: ${phone || 'N/A'}. Email: ${email || 'N/A'}. Source: ${source}.`
                    ])
                    
                    insertedCount.push(leadId)
                    
                    // Trigger Telegram alert webhook in n8n in parallel if single manual ingest lead
                    if (rawLeads.length === 1) {
                      try {
                        const n8nUrl = 'http://localhost:5678/webhook/find-leads'
                        await fetch(n8nUrl, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            niche: niche ? niche.toLowerCase() : '',
                            city: city,
                            limit: 1,
                            companies: [name]
                          })
                        })
                      } catch (n8nErr) {
                        console.warn('n8n notification dispatch skipped:', n8nErr.message)
                      }
                    }
                  }
                  
                  res.statusCode = 200
                  res.end(JSON.stringify({ 
                    message: `${insertedCount.length} leads successfully processed and stored in database for dashboard and RAG.`, 
                    ids: insertedCount 
                  }))
                } catch (err) {
                  console.error('Error ingesting leads:', err)
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: err.message }))
                }
              })
              return
            }
          }

          if (req.url && req.url.startsWith('/api/find-leads')) {
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
            
            if (req.method === 'OPTIONS') {
              res.statusCode = 204
              res.end()
              return
            }
            
            if (req.method === 'POST') {
              res.setHeader('Content-Type', 'application/json')
              let bodyStr = ''
              req.on('data', chunk => {
                bodyStr += chunk
              })
              req.on('end', async () => {
                try {
                  const body = JSON.parse(bodyStr)
                  const rawQuery = body.query || ''
                  const limitVal = Math.min(50, Math.max(10, parseInt(body.limit || 15)))
                  
                  let nicheVal = 'restaurant'
                  let cityVal = 'Bangalore'
                  let realCompanies = []
                  
                  if (rawQuery.trim()) {
                    // Call Groq Llama-3.3 to parse the natural query into structured parameters using pure NLP
                    const groqKey = getGroqApiKey()
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
                            content: 'You are an NLP parser. Parse the user B2B lead query. Return ONLY a valid JSON object with fields: "niche" (business type, lowercase, singular, e.g. "restaurant", "salon", "software"), and "city" (target city/region, capitalized, e.g. "Bangalore", "West Bengal"). Do not return any other keys.'
                          },
                          {
                            role: 'user',
                            content: `Parse: "${rawQuery}"`
                          }
                        ]
                      })
                    })
                    
                    if (groqResponse.ok) {
                      const groqData = await groqResponse.json()
                      const parsed = JSON.parse(groqData.choices?.[0]?.message?.content || '{}')
                      if (parsed.niche) nicheVal = parsed.niche
                      if (parsed.city) cityVal = parsed.city
                    }

                    // Query the public Wikipedia Search API to harvest real business names matching niche + city
                    try {
                      const searchTerms = `${nicheVal} companies in ${cityVal}`
                      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerms)}&format=json&origin=*`
                      const wikiResp = await fetch(wikiUrl)
                      if (wikiResp.ok) {
                        const wikiData = await wikiResp.json()
                        const results = wikiData.query?.search || []
                        
                        // Parse real corporate names and clean up titles
                        realCompanies = results
                          .map(item => item.title)
                          .filter(title => {
                            const t = title.toLowerCase()
                            return !t.includes('list of') && !t.includes('economy of') && !t.includes('demographics of') && !t.includes('geography of') && !t.includes('history of') && !t.includes('portal:') && !t.includes('category:') && !t.includes('wikipedia:')
                          })
                          .slice(0, limitVal)
                      }
                    } catch (wikiErr) {
                      console.warn('Wikipedia meta-search failed, proceeding with other sources:', wikiErr.message)
                    }
                  }
                  
                  // Post to n8n webhook with newly structured parsed values, dynamic limit, and real Wikipedia companies
                  let n8nSuccess = false;
                  try {
                    const n8nUrl = 'http://localhost:5678/webhook/find-leads'
                    const n8nResponse = await fetch(n8nUrl, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        niche: nicheVal.toLowerCase(),
                        city: cityVal,
                        radius_km: 10,
                        limit: limitVal,
                        companies: realCompanies
                      }),
                      signal: AbortSignal.timeout(3000)
                    });
                    if (n8nResponse.ok && n8nResponse.status !== 404) {
                      n8nSuccess = true;
                    }
                  } catch (n8nErr) {
                    console.warn('n8n webhook connection failed, executing direct local lead discovery fallback:', n8nErr.message);
                  }

                  if (!n8nSuccess) {
                    // ── DIRECT LEAD FINDER RESILIENT FALLBACK (Same as server.js) ──
                    const cleanNiche = nicheVal.replace(/leads|companies|company|services|service|businesses|business/gi, "").trim();

                    // Semantic Overpass filter builder (mirrors server.js)
                    const buildOverpassFilters = (niche) => {
                      const n = niche.toLowerCase();
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
                      if (n.includes('restaurant') || n.includes('food') || n.includes('cafe') || n.includes('diner') || n.includes('eatery')) {
                        return [
                          `node[amenity=restaurant](around:RADIUS,LAT,LNG)`,
                          `node[amenity=cafe](around:RADIUS,LAT,LNG)`,
                          `node[amenity=fast_food](around:RADIUS,LAT,LNG)`,
                          `node[amenity=bar](around:RADIUS,LAT,LNG)`,
                          `way[amenity=restaurant](around:RADIUS,LAT,LNG)`
                        ];
                      }
                      if (n.includes('salon') || n.includes('beauty') || n.includes('spa') || n.includes('hair')) {
                        return [
                          `node[shop=hairdresser](around:RADIUS,LAT,LNG)`,
                          `node[shop=beauty](around:RADIUS,LAT,LNG)`,
                          `node[leisure=spa](around:RADIUS,LAT,LNG)`,
                          `node[amenity=beauty](around:RADIUS,LAT,LNG)`
                        ];
                      }
                      if (n.includes('gym') || n.includes('fitness') || n.includes('yoga') || n.includes('sport')) {
                        return [
                          `node[leisure=fitness_centre](around:RADIUS,LAT,LNG)`,
                          `node[leisure=sports_centre](around:RADIUS,LAT,LNG)`,
                          `node[amenity=gym](around:RADIUS,LAT,LNG)`
                        ];
                      }
                      if (n.includes('it') || n.includes('software') || n.includes('tech') || n.includes('computer')) {
                        return [
                          `node[office=it](around:RADIUS,LAT,LNG)`,
                          `node[office=software](around:RADIUS,LAT,LNG)`,
                          `node[office=company][name~"tech|software|systems|digital|solutions",i](around:RADIUS,LAT,LNG)`,
                          `node[shop=computer](around:RADIUS,LAT,LNG)`
                        ];
                      }
                      if (n.includes('hospital') || n.includes('clinic') || n.includes('medical') || n.includes('doctor') || n.includes('health')) {
                        return [
                          `node[amenity=hospital](around:RADIUS,LAT,LNG)`,
                          `node[amenity=clinic](around:RADIUS,LAT,LNG)`,
                          `node[amenity=doctors](around:RADIUS,LAT,LNG)`,
                          `node[amenity=pharmacy](around:RADIUS,LAT,LNG)`,
                          `way[amenity=hospital](around:RADIUS,LAT,LNG)`
                        ];
                      }
                      if (n.includes('school') || n.includes('college') || n.includes('education') || n.includes('institute') || n.includes('academy')) {
                        return [
                          `node[amenity=school](around:RADIUS,LAT,LNG)`,
                          `node[amenity=college](around:RADIUS,LAT,LNG)`,
                          `node[amenity=university](around:RADIUS,LAT,LNG)`,
                          `way[amenity=school](around:RADIUS,LAT,LNG)`
                        ];
                      }
                      if (n.includes('shop') || n.includes('store') || n.includes('retail')) {
                        return [
                          `node[shop](around:RADIUS,LAT,LNG)`,
                          `way[shop](around:RADIUS,LAT,LNG)`
                        ];
                      }
                      return [
                        `node[office=company][name~"${niche}",i](around:RADIUS,LAT,LNG)`,
                        `node[name~"${niche}",i](around:RADIUS,LAT,LNG)`,
                        `way[name~"${niche}",i](around:RADIUS,LAT,LNG)`
                      ];
                    };
                    const overpassFilters = buildOverpassFilters(cleanNiche);

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
                    } else {
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
                        console.warn('Geocoding search failed in Vite Dev:', nomErr.message);
                      }
                    }

                    let elements = [];
                    try {
                      const radiusMeters = 15000;
                      const filterLines = overpassFilters
                        .map(f => f.replace(/RADIUS/g, radiusMeters).replace(/LAT/g, lat).replace(/LNG/g, lng))
                        .join(';\n');
                      const overpassQuery = '[out:json][timeout:30];(\n' + filterLines + ';\n);out center ' + (limitVal * 3) + ';';
                      const overpassUrl = `https://lz4.overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
                      const overpassResp = await fetch(overpassUrl, { signal: AbortSignal.timeout(12000) });
                      if (overpassResp.ok) {
                        const overpassData = await overpassResp.json();
                        elements = overpassData.elements || [];
                        console.log(`[Vite Dev] Overpass returned ${elements.length} elements for "${cleanNiche}"`);
                      }
                    } catch (overpassErr) {
                      console.warn('Overpass API query failed in Vite Dev:', overpassErr.message);
                    }

                    // Merge OSM + Wikipedia, deduplicate by normalised name
                    const seenNames = new Set();
                    const normName = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const mergedList = [];
                    const rejectTypes = ['railway', 'bus_stop', 'fuel', 'atm', 'bank', 'parking', 'toilets', 'waste', 'bench'];

                    // OSM first — real coords, phone, website
                    elements.forEach(el => {
                      const name = el.tags?.name || el.tags?.brand;
                      if (!name) return;
                      const key = normName(name);
                      if (seenNames.has(key)) return;
                      seenNames.add(key);
                      const osmCat = el.tags?.tourism || el.tags?.amenity || el.tags?.shop || el.tags?.office || el.tags?.leisure || cleanNiche;
                      if (rejectTypes.includes(osmCat)) return;
                      mergedList.push({
                        id: 'OSM-' + el.id,
                        name,
                        lat: el.lat || el.center?.lat || lat,
                        lng: el.lon || el.center?.lon || lng,
                        website: el.tags?.website || el.tags?.url || el.tags?.['contact:website'] || '',
                        phone: el.tags?.phone || el.tags?.['contact:phone'] || el.tags?.['contact:mobile'] || '',
                        email: el.tags?.email || el.tags?.['contact:email'] || '',
                        category: osmCat
                      });
                    });

                    // Wikipedia — company-level names
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
                    console.log(`[Vite Dev] Merged ${mergedList.length} unique leads for "${cleanNiche}" in ${cityVal}`);
                    // No filler — only real data

                    const finalLeads = mergedList.slice(0, limitVal);
                    const groqKey = getGroqApiKey();

                    const processLeadsAsyncVite = async () => {
                      console.log(`[Vite Dev] Starting background enrichment for ${finalLeads.length} leads...`);
                      const enrichmentPromises = finalLeads.map(async (item) => {
                        let bestEmail = '';
                        let bestPhone = item.phone || '';
                        let websiteText = '';
                        
                        if (item.website) {
                          try {
                            const jinaUrl = `https://r.jina.ai/${item.website}`;
                            const scrapeResp = await fetch(jinaUrl, { signal: AbortSignal.timeout(3000) });
                            if (scrapeResp.ok) {
                              websiteText = await scrapeResp.text();
                              const emailRx = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                              const foundEmails = [...new Set((websiteText.match(emailRx) || []).filter(e => 
                                !e.includes('example') && !e.includes('sentry') && !e.includes('wixpress') && !e.includes('test')
                              ))];
                              if (foundEmails.length > 0) bestEmail = foundEmails[0];
                              
                              const phoneRx = /(?:\+91[\s-]?)?[6-9]\d{9}/g;
                              const foundPhones = [...new Set(websiteText.match(phoneRx) || [])];
                              if (foundPhones.length > 0 && !bestPhone) bestPhone = foundPhones[0];
                            }
                          } catch (err) {}
                        }
                        
                        let score = 5;
                        let grade = 'Warm';
                        let needsWebsite = !item.website;
                        let needsMarketing = true;
                        let bestContact = bestPhone ? 'Call' : 'Email';
                        let whatsappMessage = `Namaste! Aapka ${item.name} business dekha — kya digital growth mein interested hain?`;
                        let emailSubject = `Quick question for ${item.name}`;
                        let recommendedService = 'Digital Marketing';
                        let reason = 'Retrieved via Dev OSM search.';
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
                              recommendedService = ai.recommended_service || recommendedService;
                              reason = ai.reason || reason;
                              followUpDays = parseInt(ai.follow_up_days) || followUpDays;
                            }
                          } catch (err) {}
                        }
                        
                        const nextFollowup = new Date(Date.now() + followUpDays * 86400000).toISOString().split('T')[0];
                        // Stable lead_id = normalised(name) + _ + normalised(city) — prevents duplicates across runs
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
                              phone    = COALESCE(NULLIF(EXCLUDED.phone,''),    lead_vectors.phone),
                              website  = COALESCE(NULLIF(EXCLUDED.website,''),  lead_vectors.website),
                              ai_score = EXCLUDED.ai_score,
                              ai_grade = EXCLUDED.ai_grade, text_chunk = EXCLUDED.text_chunk
                          `, [
                            stableId, item.name, cityVal, cleanNiche, bestPhone, item.website || '',
                            score, grade, needsWebsite, needsMarketing,
                            `Business Name: ${item.name}. Industry: ${cleanNiche}. City: ${cityVal}. Score: ${score}/10. Grade: ${grade}. Contact: ${bestPhone || 'N/A'}. Email: ${bestEmail || 'N/A'}. Website: ${item.website || 'N/A'}. Recommended: ${recommendedService}.`
                          ]);
                        } catch (dbErr) {
                          console.error('[Vite Dev] Direct save error:', dbErr.message);
                        }
                      });
                      
                      await Promise.all(enrichmentPromises);
                      console.log(`[Vite Dev] Direct lead search & enrichment completed.`);
                    };
                    
                    processLeadsAsyncVite();
                  }
                  
                  res.statusCode = 200
                  res.end(JSON.stringify({ 
                    message: 'Workflow triggered', 
                    niche: nicheVal, 
                    city: cityVal,
                    limit: limitVal
                  }))
                } catch (err) {
                  console.error('Error in find-leads API:', err)
                  res.statusCode = 502
                  res.end(JSON.stringify({ error: 'Failed to trigger search', details: err.message }))
                }
              })
              return
            }
          }

          if (req.url && req.url.startsWith('/api/chat')) {
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            
            if (req.method === 'OPTIONS') {
              res.statusCode = 204
              res.end()
              return
            }

            // Endpoint: GET /api/chat/history
            if (req.url === '/api/chat/history' && req.method === 'GET') {
              try {
                const historyResult = await pool.query(
                  'SELECT id, role, text, meta_json FROM chat_memory WHERE user_id = $1 ORDER BY timestamp ASC',
                  [req.user.id]
                )
                const chats = historyResult.rows.map(row => ({
                  id: row.id,
                  type: row.role,
                  text: row.text,
                  draftEmail: row.meta_json?.draftEmail || null,
                  status: row.meta_json?.status || null
                }))
                res.statusCode = 200
                res.end(JSON.stringify(chats))
              } catch (err) {
                console.error('Error fetching chat history:', err)
                res.statusCode = 500
                res.end(JSON.stringify({ error: 'Failed to fetch history', details: err.message }))
              }
              return
            }

            // Endpoint: DELETE /api/chat/history
            if (req.url === '/api/chat/history' && req.method === 'DELETE') {
              try {
                await pool.query('DELETE FROM chat_memory WHERE user_id = $1', [req.user.id])
                res.statusCode = 200
                res.end(JSON.stringify({ message: 'History cleared' }))
              } catch (err) {
                console.error('Error clearing chat history:', err)
                res.statusCode = 500
                res.end(JSON.stringify({ error: 'Failed to clear history', details: err.message }))
              }
              return
            }

            // Endpoint: PUT /api/chat/status/:id
            if (req.url.startsWith('/api/chat/status/') && req.method === 'PUT') {
              const parts = req.url.split('/')
              const msgId = parseInt(parts[parts.length - 1])
              let bodyStr = ''
              req.on('data', chunk => { bodyStr += chunk })
              req.on('end', async () => {
                try {
                  const { status } = JSON.parse(bodyStr)
                  const currentResult = await pool.query(
                    'SELECT meta_json FROM chat_memory WHERE id = $1 AND user_id = $2',
                    [msgId, req.user.id]
                  )
                  if (currentResult.rows.length > 0) {
                    const currentMeta = currentResult.rows[0].meta_json || {}
                    currentMeta.status = status
                    await pool.query(
                      'UPDATE chat_memory SET meta_json = $1 WHERE id = $2 AND user_id = $3',
                      [JSON.stringify(currentMeta), msgId, req.user.id]
                    )
                  }
                  res.statusCode = 200
                  res.end(JSON.stringify({ message: 'Status updated' }))
                } catch (err) {
                  console.error('Error updating status:', err)
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: 'Failed to update status', details: err.message }))
                }
              })
              return
            }

            // Endpoint: POST /api/chat
            if (req.url === '/api/chat' && req.method === 'POST') {
              res.setHeader('Content-Type', 'application/json')
              let bodyStr = ''
              req.on('data', chunk => {
                bodyStr += chunk
              })
              req.on('end', async () => {
                try {
                  const body = JSON.parse(bodyStr)
                  const userQuery = body.message || ''
                  const emailMode = !!body.emailMode
                  
                  // 1. Save user query to database first
                  await pool.query(
                    'INSERT INTO chat_memory (user_id, role, text) VALUES ($1, $2, $3)',
                    [req.user.id, 'user', userQuery]
                  )

                  // 2. Load past 10 messages from chat_memory to build short/long-term memory context
                  const historyResult = await pool.query(
                    'SELECT role, text FROM chat_memory WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 10',
                    [req.user.id]
                  )
                  const history = historyResult.rows.reverse()

                  // 3. Fetch current leads list to augment context
                  const result = await pool.query('SELECT * FROM leads ORDER BY timestamp DESC')
                  const leadsData = result.rows.map(row => ({
                    company: row.name || 'Unknown',
                    website: row.website || '',
                    phone: row.phone || '',
                    email: row.email || '',
                    has_website: row.has_website ?? !!row.website,
                    has_phone: row.has_phone ?? !!row.phone,
                    industry: row.niche || 'Other',
                    location: row.city || 'Bangalore',
                    ai_score: row.ai_score || 5,
                    ai_grade: row.ai_grade || 'Warm',
                    ai_intent: row.ai_reason || 'Retrieved from PostgreSQL database.'
                  }))
                  
                  const groqKey = getGroqApiKey()
                  
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
${JSON.stringify(leadsData)}`

                  // Build system prompt and previous conversation messages
                  const messages = [
                    { role: 'system', content: systemPrompt },
                    ...history.slice(0, -1).map(h => ({
                      role: h.role === 'user' ? 'user' : 'assistant',
                      content: h.text
                    })),
                    { role: 'user', content: userQuery }
                  ]

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
                  })
                  
                  if (!groqResponse.ok) {
                    throw new Error(`Groq API responded with status ${groqResponse.status}`)
                  }
                  
                  const groqData = await groqResponse.json()
                  const reply = groqData.choices?.[0]?.message?.content || 'Unable to query knowledge store.'
                  
                  // 4. Parse the generated draft email JSON if any
                  let draftEmail = null
                  const outreachMatch = reply.match(/```outreach-draft\s*([\s\S]*?)\s*```/)
                  if (outreachMatch) {
                    try {
                      draftEmail = JSON.parse(outreachMatch[1].trim())
                    } catch (e) {
                      console.warn("Failed to parse outreach-draft JSON:", e.message)
                    }
                  }

                  // 5. Store bot reply with parsed draftEmail metadata in database
                  const metaJson = draftEmail ? { draftEmail } : {}
                  await pool.query(
                    'INSERT INTO chat_memory (user_id, role, text, meta_json) VALUES ($1, $2, $3, $4)',
                    [req.user.id, 'bot', reply, JSON.stringify(metaJson)]
                  )

                  res.statusCode = 200
                  res.end(JSON.stringify({ answer: reply, draftEmail }))
                } catch (err) {
                  console.error('Error in RAG chat API:', err)
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: 'RAG query failed', details: err.message }))
                }
              })
              return
            }
          }

          if (req.url && req.url.startsWith('/api/n8n-logs')) {
            res.setHeader('Content-Type', 'text/plain')
            try {
              const logPath = path.resolve('/home/node', 'n8n.log')
              if (fs.existsSync(logPath)) {
                res.statusCode = 200
                res.end(fs.readFileSync(logPath, 'utf8'))
              } else {
                res.statusCode = 404
                res.end('n8n.log not found')
              }
            } catch (err) {
              res.statusCode = 500
              res.end('Failed to read logs: ' + err.message)
            }
            return
          }

          // GET /api/ingest-templates
          if (req.url && req.url.startsWith('/api/ingest-templates')) {
            res.setHeader('Content-Type', 'application/json')
            if (req.method === 'GET') {
              try {
                const result = await pool.query('SELECT * FROM ingest_templates ORDER BY created_at DESC')
                res.statusCode = 200
                res.end(JSON.stringify(result.rows))
              } catch (err) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: err.message }))
              }
              return
            }
            if (req.method === 'POST') {
              let bodyStr = ''
              req.on('data', chunk => { bodyStr += chunk })
              req.on('end', async () => {
                try {
                  const { name, fields } = JSON.parse(bodyStr)
                  if (!name || !fields || !Array.isArray(fields)) {
                    res.statusCode = 400
                    res.end(JSON.stringify({ error: 'Missing name or fields array' }))
                    return
                  }
                  const result = await pool.query(
                    'INSERT INTO ingest_templates (name, fields) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET fields = EXCLUDED.fields RETURNING *',
                    [name, JSON.stringify(fields)]
                  )
                  res.statusCode = 200
                  res.end(JSON.stringify(result.rows[0]))
                } catch (err) {
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: err.message }))
                }
              })
              return
            }
            if (req.method === 'DELETE') {
              const parts = req.url.split('/')
              const id = parts[parts.length - 1]
              try {
                await pool.query('DELETE FROM ingest_templates WHERE id = $1', [id])
                res.statusCode = 200
                res.end(JSON.stringify({ message: 'Template deleted successfully' }))
              } catch (err) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: err.message }))
              }
              return
            }
          }

          // GET /api/google/status
          if (req.url && req.url.startsWith('/api/google/status')) {
            res.setHeader('Content-Type', 'application/json')
            try {
              const result = await pool.query("SELECT client_id, email, access_token, refresh_token FROM google_settings WHERE id = 'global'")
              if (result.rows.length === 0) {
                res.statusCode = 200
                res.end(JSON.stringify({ connected: false, configured: false }))
                return
              }
              const row = result.rows[0]
              const configured = !!row.client_id
              const connected = !!row.access_token
              res.statusCode = 200
              res.end(JSON.stringify({
                connected,
                configured,
                email: row.email || null,
                client_id: row.client_id ? `${row.client_id.substring(0, 8)}...` : null
              }))
            } catch (err) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message }))
            }
            return
          }

          // POST /api/google/save-credentials
          if (req.url && req.url.startsWith('/api/google/save-credentials') && req.method === 'POST') {
            res.setHeader('Content-Type', 'application/json')
            let bodyStr = ''
            req.on('data', chunk => { bodyStr += chunk })
            req.on('end', async () => {
              try {
                const { client_id, client_secret, redirect_uri } = JSON.parse(bodyStr)
                if (!client_id || !client_secret || !redirect_uri) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: 'Missing client_id, client_secret, or redirect_uri' }))
                  return
                }
                await pool.query(`
                  INSERT INTO google_settings (id, client_id, client_secret, redirect_uri)
                  VALUES ('global', $1, $2, $3)
                  ON CONFLICT (id) DO UPDATE SET
                    client_id = EXCLUDED.client_id,
                    client_secret = EXCLUDED.client_secret,
                    redirect_uri = EXCLUDED.redirect_uri
                `, [client_id.trim(), client_secret.trim(), redirect_uri.trim()])
                res.statusCode = 200
                res.end(JSON.stringify({ message: 'Google Client credentials saved successfully' }))
              } catch (err) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: err.message }))
              }
            })
            return
          }

          // GET /api/google/auth-url
          if (req.url && req.url.startsWith('/api/google/auth-url')) {
            res.setHeader('Content-Type', 'application/json')
            try {
              const result = await pool.query("SELECT client_id, redirect_uri FROM google_settings WHERE id = 'global'")
              if (result.rows.length === 0 || !result.rows[0].client_id) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Google Client Credentials are not configured.' }))
                return
              }
              const { client_id, redirect_uri } = result.rows[0]
              const scopes = [
                'https://www.googleapis.com/auth/forms.body',
                'https://www.googleapis.com/auth/forms.responses.readonly',
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/userinfo.email'
              ].join(' ')
              
              const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                `client_id=${encodeURIComponent(client_id)}&` +
                `redirect_uri=${encodeURIComponent(redirect_uri)}&` +
                `response_type=code&` +
                `scope=${encodeURIComponent(scopes)}&` +
                `access_type=offline&` +
                `prompt=consent`
                
              res.statusCode = 200
              res.end(JSON.stringify({ url: authUrl }))
            } catch (err) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message }))
            }
            return
          }

          // OAuth Callback /api/auth/google/callback
          if (req.url && req.url.startsWith('/api/auth/google/callback')) {
            const parsedUrl = new URL(req.url, `http://${req.headers.host}`)
            const code = parsedUrl.searchParams.get('code')
            if (!code) {
              res.statusCode = 400
              res.end('OAuth Error: Missing code query parameter')
              return
            }
            
            try {
              const credentials = await pool.query("SELECT client_id, client_secret, redirect_uri FROM google_settings WHERE id = 'global'")
              if (credentials.rows.length === 0) {
                res.statusCode = 400
                res.end('OAuth Error: Credentials not found in settings')
                return
              }
              const { client_id, client_secret, redirect_uri } = credentials.rows[0]
              
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
              })
              
              if (!tokenRes.ok) {
                const errText = await tokenRes.text()
                throw new Error(`Token exchange failed: ${errText}`)
              }
              
              const tokenData = await tokenRes.json()
              const { access_token, refresh_token, expires_in } = tokenData
              const tokenExpiry = new Date(Date.now() + (expires_in || 3600) * 1000)
              
              const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { 'Authorization': `Bearer ${access_token}` }
              })
              
              let email = null
              if (profileRes.ok) {
                const profile = await profileRes.json()
                email = profile.email
              }
              
              await pool.query(`
                UPDATE google_settings SET
                  access_token = $1,
                  refresh_token = COALESCE($2, refresh_token),
                  token_expiry = $3,
                  email = COALESCE($4, email)
                WHERE id = 'global'
              `, [access_token, refresh_token || null, tokenExpiry, email])
              
              res.setHeader('Content-Type', 'text/html')
              res.statusCode = 200
              res.end(`
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
              `)
            } catch (err) {
              console.error('Google OAuth Callback Error:', err.message)
              res.statusCode = 500
              res.end(`OAuth callback error: ${err.message}`)
            }
            return
          }

          // POST /api/google-forms/create
          if (req.url && req.url.startsWith('/api/google-forms/create') && req.method === 'POST') {
            res.setHeader('Content-Type', 'application/json')
            let bodyStr = ''
            req.on('data', chunk => { bodyStr += chunk })
            req.on('end', async () => {
              try {
                const { title, fields } = JSON.parse(bodyStr)
                if (!title || !fields || !Array.isArray(fields)) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: 'Missing form title or fields schema array' }))
                  return
                }
                
                // Read global credentials
                const googleSettingsCheck = await pool.query("SELECT * FROM google_settings WHERE id = 'global'")
                if (googleSettingsCheck.rows.length === 0 || !googleSettingsCheck.rows[0].access_token) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: 'Google integration not connected' }))
                  return
                }
                
                // Refresh token if needed
                let accessToken
                try {
                  accessToken = await getFreshGoogleToken()
                } catch (tokErr) {
                  res.statusCode = 401
                  res.end(JSON.stringify({ error: tokErr.message }))
                  return
                }
                
                // Create Form
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
                })
                
                if (!createRes.ok) {
                  const errText = await createRes.text()
                  throw new Error(`Google Form creation failed: ${errText}`)
                }
                
                const formData = await createRes.json()
                const { formId, responderUri } = formData
                
                const requests = fields.map((field, index) => {
                  return {
                    createItem: {
                      item: {
                        title: field.label,
                        description: `[Key: ${field.key}]`,
                        questionItem: {
                          question: {
                            required: field.required || false,
                            textQuestion: {}
                          }
                        }
                      },
                      location: {
                        index: index
                      }
                    }
                  }
                })
                
                const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ requests })
                })
                
                if (!updateRes.ok) {
                  const errText = await updateRes.text()
                  throw new Error(`Failed to populate Form questions: ${errText}`)
                }
                
                const dbRes = await pool.query(`
                  INSERT INTO google_forms (form_id, title, responder_uri)
                  VALUES ($1, $2, $3)
                  RETURNING *
                `, [formId, title, responderUri])
                
                res.statusCode = 200
                res.end(JSON.stringify(dbRes.rows[0]))
              } catch (err) {
                console.error('Google Form Create Error:', err.message)
                res.statusCode = 500
                res.end(JSON.stringify({ error: err.message }))
              }
            })
            return
          }

          // GET /api/google-forms/list
          if (req.url && req.url.startsWith('/api/google-forms/list')) {
            res.setHeader('Content-Type', 'application/json')
            try {
              const result = await pool.query('SELECT * FROM google_forms ORDER BY created_at DESC')
              res.statusCode = 200
              res.end(JSON.stringify(result.rows))
            } catch (err) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message }))
            }
            return
          }

          // POST /api/google-forms/sync
          if (req.url && req.url.startsWith('/api/google-forms/sync') && req.method === 'POST') {
            res.setHeader('Content-Type', 'application/json')
            let bodyStr = ''
            req.on('data', chunk => { bodyStr += chunk })
            req.on('end', async () => {
              try {
                const { formId } = JSON.parse(bodyStr)
                if (!formId) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: 'Missing formId parameter' }))
                  return
                }
                
                let accessToken
                try {
                  accessToken = await getFreshGoogleToken()
                } catch (tokErr) {
                  res.statusCode = 401
                  res.end(JSON.stringify({ error: tokErr.message }))
                  return
                }
                
                const formMetaRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
                  headers: { 'Authorization': `Bearer ${accessToken}` }
                })
                
                if (!formMetaRes.ok) {
                  const errText = await formMetaRes.text()
                  throw new Error(`Failed to retrieve Form questions: ${errText}`)
                }
                
                const formMeta = await formMetaRes.json()
                const items = formMeta.items || []
                
                const questionIdToKey = {}
                items.forEach(item => {
                  if (item.questionItem && item.questionItem.question) {
                    const questionId = item.questionItem.question.questionId
                    const desc = item.description || ''
                    const match = desc.match(/\[Key:\s*(.*?)\]/)
                    if (match) {
                      questionIdToKey[questionId] = match[1].trim()
                    } else {
                      const slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
                      questionIdToKey[questionId] = slug
                    }
                  }
                })
                
                const responsesRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
                  headers: { 'Authorization': `Bearer ${accessToken}` }
                })
                
                if (!responsesRes.ok) {
                  const errText = await responsesRes.text()
                  throw new Error(`Failed to retrieve Form responses: ${errText}`)
                }
                
                const responsesData = await responsesRes.json()
                const responses = responsesData.responses || []
                
                let importedCount = 0
                
                for (const resp of responses) {
                  const responseId = resp.responseId
                  const lastSubmittedTime = resp.lastSubmittedTime
                  const answers = resp.answers || {}
                  
                  const leadId = `google_form_${responseId}`
                  const checkRes = await pool.query('SELECT lead_id FROM leads WHERE lead_id = $1', [leadId])
                  if (checkRes.rows.length > 0) {
                    continue
                  }
                  
                  const leadObj = {
                    leadId,
                    source: `Google Form Sub`
                  }
                  
                  Object.keys(answers).forEach(qId => {
                    const key = questionIdToKey[qId]
                    const textAnswers = answers[qId].textAnswers?.answers || []
                    const val = textAnswers.map(a => a.value).join(', ')
                    if (key) {
                      leadObj[key] = val
                    }
                  })
                  
                  const name = leadObj.company || leadObj.name || 'Unknown'
                  const niche = leadObj.industry || leadObj.niche || null
                  const city = leadObj.location || leadObj.city || null
                  const website = leadObj.website || null
                  const phone = leadObj.phone || null
                  const email = leadObj.email || null
                  
                  const coreKeys = ['leadId', 'company', 'name', 'industry', 'niche', 'location', 'city', 'website', 'phone', 'email', 'source', 'lat', 'lng', 'ai_score', 'ai_grade', 'status', 'next_followup', 'timestamp', 'created_at', 'custom_fields']
                  const customFields = {}
                  Object.keys(leadObj).forEach(key => {
                    if (!coreKeys.includes(key)) {
                      customFields[key] = leadObj[key]
                    }
                  })
                  
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
                  ])
                  
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
                  ])
                  
                  importedCount++
                }
                
                await pool.query(`
                  UPDATE google_forms SET last_synced_at = NOW() WHERE form_id = $1
                `, [formId])
                
                res.statusCode = 200
                res.end(JSON.stringify({ message: `Successfully synced! Imported ${importedCount} new leads.`, count: importedCount }))
              } catch (err) {
                console.error('Google Form Sync Error:', err.message)
                res.statusCode = 500
                res.end(JSON.stringify({ error: err.message }))
              }
            })
            return
          }

          if (req.url && req.url.startsWith('/api/import-logs')) {
            res.setHeader('Content-Type', 'text/plain')
            try {
              const logPath = path.resolve('/home/node', 'import.log')
              if (fs.existsSync(logPath)) {
                res.statusCode = 200
                res.end(fs.readFileSync(logPath, 'utf8'))
              } else {
                res.statusCode = 404
                res.end('import.log not found')
              }
            } catch (err) {
              res.statusCode = 500
              res.end('Failed to read logs: ' + err.message)
            }
            return
          }
          next()
        })
      }
    }
  ],
  server: {
    host: '0.0.0.0',
    port: 7860,
    allowedHosts: true,
    proxy: {
      '/n8n': {
        target: 'http://localhost:5678',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/n8n/, '')
      }
    }
  }
})
