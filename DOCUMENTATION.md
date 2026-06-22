# Smart Lead Bot - Comprehensive Technical Documentation & Blueprint

Welcome to the comprehensive technical documentation for the **Smart Lead Bot** project. This document serves as the architectural blueprint and operational manual for the platform, detailing core configurations, backend/frontend layouts, n8n automations, security protocols, and deployment architecture.

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [Project Objectives](#2-project-objectives)
3. [System Architecture & Tech Stack](#3-system-architecture--tech-stack)
4. [Comprehensive Features Blueprint](#4-comprehensive-features-blueprint)
5. [End-to-End System Workflow](#5-end-to-end-system-workflow)
6. [n8n Automation Engine & Webhooks](#6-n8n-automation-engine--webhooks)
7. [Security Considerations & Storage Parity](#7-security-considerations--storage-parity)
8. [Deployment Architecture & Build Parity](#8-deployment-architecture--build-parity)
9. [Limitations & Future Scope](#9-limitations--future-scope)
10. [Conclusion & Business Value](#10-conclusion--business-value)

---

## 1. Introduction

In today's high-velocity B2B marketplace, lead generation remains one of the primary drivers of organizational growth. However, manual lead collection, data validation, team routing, and multichannel follow-up constitute major operational bottlenecks. The **Smart Lead Bot** project represents an integrated, state-of-the-art enterprise solution designed to fully automate and scale these workflows.

By combining modern web technologies, AI-powered enrichment, and the n8n automation engine, the system ingests raw leads, cleans and qualifies them, structures delegation tasks, and automates outreach channels. This document provides a complete technical blueprint of the application, detailing the system architecture, core UI components, webhook automation, security designs, and deployment configurations.

---

## 2. Project Objectives

The primary objectives of the Smart Lead Bot project are to modernize B2B lead workflows, eliminate manual administrative steps, and optimize pipeline visibility. Specifically, the system is engineered to achieve the following:

- **Automated Ingestion**: Allow seamless single-entry lead ingestion, dynamic bulk file parsing (CSV, Excel, JSON), and automated public survey intakes via Google Forms integration.
- **Dynamic Schema Adaptability**: Enable CRM administrators to create, edit, and save custom database fields and ingestion templates directly from the client interface, adapting dynamically to niche industries.
- **Intelligent Enrichment**: Validate company details, scrape website telemetry, and analyze B2B market gaps using integrated AI models with resilient local rules fallbacks.
- **Modern Delegation Pipeline**: Streamline lead assignment to sales teammates using an interactive Kanban board and a premium monthly calendar view showing schedule dates, due dates, and completion status.
- **Integrated Communication Sync**: Centralize communication setup and email synchronization in a single settings portal, supporting Google Workspace OAuth, real-time Gmail sync, and Telegram notifications.

---

## 3. System Architecture & Tech Stack

The Smart Lead Bot architecture relies on a highly responsive, secure, and modular layer system. The primary layers include:

### Database (Data Layer)
- **PostgreSQL** acts as the core relational data store. It contains schemas for leads, users, tasks, task milestones, task assignments, lead activities, Google Workspace config, and sent email outbox logs. Startup migration logic dynamically seeds missing tables and adds scheduling fields.

### Backend API (Service Layer)
- A **Node.js & Express** backend processes API requests, manages authentication, performs database CRUD actions, executes Google OAuth token refreshes, and runs webhook handlers. The Vite development server config (`vite.config.js`) duplicates all backend API endpoints, maintaining **full dev-to-prod parity** when running locally.

### Frontend Client (Presentation Layer)
- A **Vite/React** application builds a premium B2B cockpit dashboard. Built with rich styling (vibrant color palettes, HSL borders, backdrop-blur card glow transitions, and responsive sidebars), the UI is optimized for both desktop and mobile layouts.

### Automation & Webhooks (Integration Layer)
- An **n8n Automation Engine** coordinates complex external workflows (like sending telemetry triggers and parsing webhook payloads), while the **Telegram Bot API** and **Google Gmail API** handle outbound notifications and email communications.

---

## 4. Comprehensive Features Blueprint

The Smart Lead Bot dashboard coordinates an extensive suite of B2B features to manage leads, tasks, and sales communications:

### 1. Lead Ingestion & Parsing Engine
- **Single Intake**: The Quick Ingest card allows manual input of core details (company name, city, industry, site, etc.) and custom variables.
- **Dynamic Bulk File Parser**: Accepts file uploads in CSV, Excel, and JSON formats. It dynamically extracts all columns, mapping custom attributes to the lead's JSON store.
- **Null-Handling Integrity**: Avoids filling empty or missing spreadsheet cells with arbitrary default values (like "Other" or "Bangalore"), writing them strictly as `null` in the database to preserve data accuracy.

### 2. Custom Fields & Ingestion Templates
- **Schema Creator**: Allows administrators to define custom B2B fields (types: `text`, `number`, `url`, `email`, `date`) and toggle required switches.
- **Ingestion Templates**: Schemas can be saved as named templates. Selecting a template dynamically updates the Quick Ingest form layout.
- **Leads Directory Display**: Custom field attributes render dynamically as compact badges next to website URLs in the directory lists.
- **Inline Editor Integration**: Supports inline editing of custom fields alongside core attributes within the Lead details modal.

### 3. Real-time Opportunity Meters & Analytics
- **B2B Opportunity Gaps**: Aggregates database stats to identify gaps in B2B website quality, social media presence, and local marketing.
- **Horizontal Progress Gauges**: Displays percentage opportunity scores via HSL color-coded horizontal bars (Website gap: Orange, Social gap: Yellow, Marketing gap: Blue) to instantly guide outbound outreach priorities.

### 4. Geocoded Mapping Viewport
- **Stable Viewport Zoom**: Memoizes B2B markers using React's `useMemo` and tracks initialization states with reference flags. Clicking markers or editing details does not trigger unwanted zoom changes or map jumps.
- **Custom Pulse Markers**: Displays B2B opportunities on the map with color-coded pulsing dots indicating lead temperatures (Hot: Red, Warm: Gold, Cold: Blue).

### 5. Resilient B2B Crawler Fallback
- **Public API Scrapers**: Crawler endpoints query Wikipedia and OpenStreetMap nodes based on niche and city inputs.
- **Rules-Based Mock Fallback**: When API rate-limits or blocks occur (e.g. from sandboxed cloud IPs), the server dynamically invokes a mock crawler generator matching the exact city and sector to seed the database with high-fidelity, realistic fallback leads.

### 6. Interactive Kanban Task Board
- **Three-Column Status Pipeline**: Splits tasks into Pending, In Progress, and Completed columns.
- **Milestone Progress Tracking**: Task cards feature compact progress bars and completed milestone indicators (e.g. `2/5 Milestones`).
- **Overdue & Schedule Badges**: Displays custom priority colors, scheduled start dates, and pulsing red overdue flags on active cards.
- **Status Change Handlers**: Teammates can click quick status action buttons to cycle tasks through progress states.

### 7. Task Board Calendar View
- **7-Column Monthly Layout**: Toggles the task pipeline into an interactive monthly grid with previous/next month controls and a "Today" quick-jump button.
- **Date Matching Engine**: Places tasks on day cells corresponding to their assign date (`created_at`), scheduled start date (`scheduled_at`), due date (`due_date`), or completion date (`completed_at`).
- **Compact List Rendering**: Day cells limit tasks shown directly to a maximum of two, showing a trailing count (e.g. `+ 3 more`) for dates with extra tasks.
- **Sleek Date Detail Drawer**: Clicking any date cell opens a details pane showing full metadata for all tasks on that day, including assignees, milestone progress percentages, and action controls to update status or delete tasks.

### 8. Unified Integration Settings (Profile Tab)
- **Settings Relocation**: Centralizes Google OAuth, Telegram Bot pairing, and Business Email sync settings under the Profile settings tab, keeping them out of main directory navigation views.
- **Google Workspace API Configuration**: Allows configuration of Client ID, Secret, and Redirect URIs. If pre-configured in system environment variables, credentials forms are collapsed by default with an active configuration banner shown.
- **Credentials Validation**: Validates client secrets, refresh tokens, and linked account profiles.

### 9. Real-time Gmail Multi-folder Sync Client
- **Google OAuth Login**: Syncs users via Google consent screen, passing encrypted user IDs through the OAuth `state` parameter to prevent CSRF hijacking.
- **Multi-folder Sync Client**: Once authorized, the Outbox sliding drawer loads real-time Gmail messages (Inbox, Drafts, Outbox (Sent), and Spam folders).
- **Offline Mock Warnings**: If credentials are not linked, the client displays a locked screen with descriptive prompts, falling back to local database backups with warning banners.
- **Outbox History Drawer**: Houses search bars, keyword filters, sent-status badges, and monospace email content viewers.

### 10. Telegram Bot Dispatcher
- **Deep-link Bot Pairing**: Deep-links users directly to `@Smart_leadintel_bot` with base64 encoded user ID payloads.
- **bot Start Webhook**: The bot webhook endpoint parses interactions, pairs chat IDs to user accounts in the database, and returns confirmation messages.
- **MarkdownV2 Parse Formats**: Converts alert payloads to MarkdownV2 formatting, ensuring special characters are escaped and payloads are successfully dispatched.

### 11. Comprehensive Lead Reports Exporter
- **Data Formats**: Supports exporting B2B leads data in Excel, CSV, and JSON formats.
- **Date Range Filters**: Allows report filtering by Daily, Weekly, Monthly, Yearly, and All-Time ranges.

### 12. Activity Timeline Drawer
- **Timeline Feed**: Slides out from the viewport edge to display historical activities (Leads Assigned, Status updates, Notes added, Tasks logged).
- **Interactive Notes**: Teammates can post custom text notes directly onto a lead's activity history.

### 13. Signup/Signin & User Role Lockdown
- **Secure Authentication**: Restricts dashboard access to authenticated users.
- **Role Lockdown**: Disables the "Admin" role option in the sign-up page, defaulting registrations to standard team "User" status.

### 14. Database Cascade Integrity
- **Lead Deletion Cascade**: Deleting a lead automatically clears associated entries in `tasks`, `task_assignments`, `task_milestones`, `task_comments`, and `lead_activities` to prevent foreign key errors.
- **Task Deletion Cascade**: Deleting a task clears milestones, comments, and assignments.

### 15. Mobile Layout & Responsive Sidebar
- **Responsive Navigation**: Transitions the dashboard menu on mobile into a vertical, touch-accessible icon sidebar.
- **Laptop Height Locking**: Locks the viewport wrapper to `height: 100vh; overflow: hidden;` to prevent layout clipping.
- **internal Scrollbars & Padding**: Pushes scroll containers up by applying bottom offsets to guarantee scrollbars remain visible and interactive inside frames.

---

## 5. End-to-End System Workflow

The life cycle of a lead in the Smart Lead Bot pipeline follows a structured, automated path:

1. **Ingestion**: Leads enter the database via CSV bulk ingest, Google Form sync, or manual intake.
2. **Enrichment & Gap Analysis**: n8n triggers fetch business data, analyze social gaps, and compute a priority lead score.
3. **Assignment**: The administrator assigns the lead to a teammate, posting an activity note.
4. **Task Delegation & Scheduling**: A task is created with dynamic milestones, priority, a schedule date, and a due date. This task instantly shows up in the Kanban and Calendar views.
5. **Multichannel Outreach**: Teammates draft Copilot pitches and email them via Gmail. Telegram bot webhook posts alert logs on the linked chat feed.
6. **Close & Archive**: Teammates check milestones, complete the task (updating `completed_at`), and export XLSX reports.

---

## 6. n8n Automation Engine & Webhooks

The **n8n Automation Engine** manages background jobs and webhook notifications, declared in `workflow.json`:

### Webhook Routing
The project defines webhook trigger nodes that receive B2B lead updates, Google Form submissions, and Telegram pairing requests. These webhooks parse JSON payloads, route them to Postgres nodes, and return structured JSON responses.

### AI Lead Qualification (Groq / LLM Integration)
When a new lead is ingested, n8n passes the company niche and details to a Groq Llama LLM Node. The model classifies the lead's growth needs (e.g. Website development, marketing outreach) and outputs a numeric score to update the database.

### Telegram Bot Alerts Webhook
An automated Telegram webhook listens to chat interactions. When a user sends `/start <userId>` to `@Smart_leadintel_bot`, n8n extracts the `userId`, queries the Postgres database to set `telegram_chat_id` and `telegram_linked = true`, and returns a confirmation message to the chat feed.

---

## 7. Security Considerations & Storage Parity

Operating a B2B CRM in cross-origin environments and sandboxed clouds requires tight security controls:

### 1. Sandboxed iframe localStorage Fallback
In hosting environments like Hugging Face Spaces, applications are served inside a sandboxed cross-origin `<iframe>`. Direct access to the browser's `localStorage` throws a `SecurityError: Access is denied` browser exception, which crashes React mounts. The project uses a safe storage utility wrapper (`src/utils/storage.js`) that traps these exceptions and falls back to an in-memory session dictionary, ensuring uninterrupted execution.

### 2. CSRF & State-Parameter OAuth Validation
To protect Google OAuth logins, the backend appends the user's encrypted `userId` inside the OAuth `state` query parameter. Upon authorization callback, the server reads the `state` parameter to verify the callback origin and link the resulting token directly to the correct user row, preventing OAuth hijack attempts.

### 3. Hashed Credentials & Safe Token Seeding
Access tokens, refresh tokens, and database passwords are encrypted at rest. Frontend settings configuration inputs mask secret keys by default, allowing connections only from pre-configured environment credentials or manually submitted tokens.

---

## 8. Deployment Architecture & Build Parity

Smart Lead Bot implements a Dockerized dual-target deployment framework, guaranteeing seamless parity between development, staging, and production environments.

### Docker Containerization
The project defines a single multi-stage `Dockerfile` that compiles the React application using Vite, copies the backend files, and exposes port `7860`. The Node.js application serves the static compiled `dist` directory on the root path and registers all API endpoints on `/api`.

### Dual-Target Git Remotes
Two remote git repositories are configured on the development workspace:
- **GitHub (origin)**: Hosts the primary open-source code repository (`https://github.com/SatishKumar620/smart-lead-bot`), executing version control, code merges, and backup.
- **Hugging Face (huggingface)**: Direct deployment repository (`https://huggingface.co/spaces/satishverma0870/smart-lead-bot`). A push to `huggingface main` triggers Hugging Face's build engine to construct the Docker image and deploy the active container online.

### Vite Development Server Parity
To allow local developers to test features without running a separate production server process, the Vite configuration file (`vite.config.js`) integrates custom API middleware handlers. All database migration scripts, lead update operations, OAuth callbacks, and tasks endpoints are kept in full parity between `vite.config.js` and `server.js`.

---

## 9. Limitations & Future Scope

While the current release (v2.1.0) provides a highly resilient and automated pipeline, certain limitations present opportunities for future enhancements:

### Current Limitations
- **API Rate Limits**: Scraping and AI enrichment depend on external APIs (like Groq and public geocoding nodes). Rate limits or service blocks can delay lead scoring updates.
- **In-Memory Storage Lifetime**: In sandboxed browser iframes where `localStorage` is blocked, session tokens are lost upon a page refresh, requiring users to log back in.

### Future Scope
- **WhatsApp Cloud API Sync**: Expand the Telegram bot integration to include WhatsApp Business API support for automated client chat dispatching.
- **Real-time WebSockets Sync**: Replace manual API polling with active WebSockets, enabling real-time notification pushes and Kanban board updates across multiple active CRM sessions.
- **Multi-Agent CRM Coordination**: Deploy a network of subagents tasked with negotiating with leads via mock emails, reporting back summaries directly.

---

## 10. Conclusion & Business Value

The **Smart Lead Bot** project bridges the gap between raw data collection and strategic sales management. By integrating a dynamic, adaptable database schema, a visual Opportunity Meter, a dual-mode Task Board (Kanban and Calendar), and automated outreach channels (Gmail & Telegram settings), the platform empowers teams to focus on relationship-building rather than repetitive manual work.

The system's deployment-ready, Dockerized design ensures it can be hosted in minutes on environments like GitHub and Hugging Face, delivering a premium, secure, and resilient tool for modern B2B organizations.
