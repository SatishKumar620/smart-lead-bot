-- Enable pgvector extension
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Drop tables if they exist (for clean initialization)
DROP TABLE IF EXISTS lead_vectors CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    company VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create leads table
CREATE TABLE leads (
    lead_id VARCHAR(255) PRIMARY KEY,
    place_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255),
    niche VARCHAR(255),
    city VARCHAR(255),
    phone VARCHAR(255),
    phone_intl VARCHAR(255),
    whatsapp_number VARCHAR(255),
    whatsapp_link TEXT,
    email VARCHAR(255),
    contact_name VARCHAR(255),
    contact_title VARCHAR(255),
    all_emails TEXT,
    address TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    google_maps_url TEXT,
    website TEXT,
    rating DOUBLE PRECISION,
    total_ratings INTEGER,
    opening_hours TEXT,
    business_status VARCHAR(255),
    website_description TEXT,
    has_website BOOLEAN,
    has_phone BOOLEAN,
    has_email BOOLEAN,
    has_whatsapp BOOLEAN,
    ai_score INTEGER,
    ai_grade VARCHAR(50),
    ai_needs_website BOOLEAN,
    ai_needs_social BOOLEAN,
    ai_needs_software BOOLEAN,
    ai_needs_marketing BOOLEAN,
    ai_business_stage VARCHAR(100),
    ai_best_contact VARCHAR(100),
    ai_whatsapp_message TEXT,
    ai_email_subject TEXT,
    ai_recommended_service TEXT,
    ai_reason TEXT,
    next_followup VARCHAR(50),
    status VARCHAR(50) DEFAULT 'New',
    source VARCHAR(100) DEFAULT 'Google Maps',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create lead_vectors table for RAG semantic search
CREATE TABLE lead_vectors (
    lead_id VARCHAR(255) PRIMARY KEY REFERENCES leads(lead_id) ON DELETE CASCADE,
    business_name VARCHAR(255),
    city VARCHAR(255),
    niche VARCHAR(255),
    phone VARCHAR(255),
    website TEXT,
    ai_score INTEGER,
    ai_grade VARCHAR(50),
    needs_website BOOLEAN,
    needs_marketing BOOLEAN,
    text_chunk TEXT,
    embedding double precision[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_niche ON leads(niche);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_ai_score ON leads(ai_score);

-- CRM EXTENSIONS (Assignments, Tasks, & Timelines)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    lead_id VARCHAR(255) REFERENCES leads(lead_id) ON DELETE CASCADE,
    assigned_to VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(50) DEFAULT 'Medium',
    status VARCHAR(50) DEFAULT 'Pending', -- Pending | In Progress | Completed
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
    action_type VARCHAR(100) NOT NULL, -- Assigned | Status Updated | Note Added | Task Logged
    description TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_activities_lead ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_assignments_task ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_milestones_task ON task_milestones(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_task ON task_comments(task_id);
