-- Seed users
INSERT INTO users (id, first_name, last_name, email, company, password_hash, role) VALUES ('U-1780484015153-1', 'Satish', 'Verma Admin', 'satishverma62044@gmail.com', 'LeadGen Admin', '7997d23540aa93826faa67c1809a6262236973226b0f7bc182d32f47f46c966166009e148ae60873608db8b4f02fffd846611113d0ca629b63dc141848cd978c', 'admin') ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, role = EXCLUDED.role, password_hash = EXCLUDED.password_hash;
INSERT INTO users (id, first_name, last_name, email, company, password_hash, role) VALUES ('U-1780484015153-2', 'Satish', 'Verma User', 'satishverma0870@gmail.com', 'LeadGen Staff', '7997d23540aa93826faa67c1809a6262236973226b0f7bc182d32f47f46c966166009e148ae60873608db8b4f02fffd846611113d0ca629b63dc141848cd978c', 'user') ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, role = EXCLUDED.role, password_hash = EXCLUDED.password_hash;
INSERT INTO users (id, first_name, last_name, email, company, password_hash, role) VALUES ('U-1780484015153-3', 'John', 'Doe', 'john.doe@example.com', 'Acme Corp', '7997d23540aa93826faa67c1809a6262236973226b0f7bc182d32f47f46c966166009e148ae60873608db8b4f02fffd846611113d0ca629b63dc141848cd978c', 'user') ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, role = EXCLUDED.role, password_hash = EXCLUDED.password_hash;
INSERT INTO users (id, first_name, last_name, email, company, password_hash, role) VALUES ('U-1780484015153-4', 'Jane', 'Smith', 'jane.smith@example.com', 'Acme Corp', '7997d23540aa93826faa67c1809a6262236973226b0f7bc182d32f47f46c966166009e148ae60873608db8b4f02fffd846611113d0ca629b63dc141848cd978c', 'admin') ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, role = EXCLUDED.role, password_hash = EXCLUDED.password_hash;

-- Seed default tasks
INSERT INTO tasks (id, lead_id, assigned_to, title, description, priority, status, due_date, team_name)
VALUES 
  (1, 'PUNE-001', 'U-1780484015153-1', 'Initial outreach call', 'Introduce our services to the operations head and schedule a demo.', 'High', 'In Progress', '2026-06-10', 'Sales Team'),
  (2, 'PUNE-002', 'U-1780484015153-2', 'Send custom WhatsApp copy', 'Use the generated AI copy to reach out via WhatsApp.', 'Medium', 'Pending', '2026-06-12', 'Outreach Team')
ON CONFLICT (id) DO UPDATE SET lead_id = EXCLUDED.lead_id, assigned_to = EXCLUDED.assigned_to, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, status = EXCLUDED.status, due_date = EXCLUDED.due_date, team_name = EXCLUDED.team_name;

-- Restart sequence
SELECT setval(pg_get_serial_sequence('tasks', 'id'), coalesce(max(id), 1)) FROM tasks;

-- Seed task assignments
INSERT INTO task_assignments (task_id, user_id) VALUES 
  (1, 'U-1780484015153-1'),
  (1, 'U-1780484015153-2'),
  (2, 'U-1780484015153-2')
ON CONFLICT DO NOTHING;

-- Seed task milestones
INSERT INTO task_milestones (id, task_id, title, completed, completed_at) VALUES 
  (1, 1, 'Draft email outreach template', true, '2026-06-03 10:00:00+00'),
  (2, 1, 'Conduct phone outreach', false, NULL),
  (3, 1, 'Schedule presentation demo', false, NULL),
  (4, 2, 'Prepare WhatsApp message body', false, NULL),
  (5, 2, 'Send message and log feedback', false, NULL)
ON CONFLICT (id) DO UPDATE SET task_id = EXCLUDED.task_id, title = EXCLUDED.title, completed = EXCLUDED.completed, completed_at = EXCLUDED.completed_at;

-- Restart milestones sequence
SELECT setval(pg_get_serial_sequence('task_milestones', 'id'), coalesce(max(id), 1)) FROM task_milestones;

-- Seed task comments
INSERT INTO task_comments (id, task_id, user_id, comment, created_at) VALUES 
  (1, 1, 'U-1780484015153-1', 'Status updated to: In Progress', '2026-06-03 10:05:00+00'),
  (2, 1, 'U-1780484015153-1', 'Milestone "Draft email outreach template" marked as Completed.', '2026-06-03 10:10:00+00'),
  (3, 1, 'U-1780484015153-2', 'I have prepared the draft template and it is ready for review.', '2026-06-03 10:15:00+00')
ON CONFLICT (id) DO UPDATE SET task_id = EXCLUDED.task_id, user_id = EXCLUDED.user_id, comment = EXCLUDED.comment, created_at = EXCLUDED.created_at;

-- Restart comments sequence
SELECT setval(pg_get_serial_sequence('task_comments', 'id'), coalesce(max(id), 1)) FROM task_comments;

