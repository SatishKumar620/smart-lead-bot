# Smart Lead Bot - Comprehensive Technical Documentation & Blueprint

Welcome to the comprehensive technical documentation for the **Smart Lead Bot** project. This document serves as the architectural blueprint and operational manual for the platform, detailing core configurations, backend/frontend layouts, n8n automations, security protocols, and deployment architecture.

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [Project Objectives](#2-project-objectives)
3. [System Architecture & Tech Stack](#3-system-architecture--tech-stack)
4. [Core Features Overview](#4-core-features-overview)
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

## 4. Core Features Overview

The dashboard coordinates five primary functional areas to manage B2B intelligence and team operations:

### 1. Dynamic Ingest Templates & Custom Fields
CRM administrators are no longer locked into static form fields. The **Custom Field Creator** allows definition of custom database fields (types: `text`, `number`, `url`, `email`, `date`) and mandatory switches. Administrators can save their configurations as named **Ingestion Templates**, which dynamically render inputs on the Quick Ingest card.

### 2. B2B Leads Directory & Opportunity Meters
The B2B Leads Directory lists all crawled leads, custom field tags, and assignment states. A horizontal **Opportunity Meter** aggregates leads data to visualize website, social, and marketing gaps in real time. The directory has a stable, memoized **Map Viewport** that renders B2B locations with custom pulsing markers.

### 3. Interactive Task Board (Kanban Mode)
Tasks are split into Pending, In Progress, and Completed columns. The Kanban cards feature custom priority badges, scheduled clock icons, overdue alerts, and an inline **Milestone Progress Bar** displaying completion counts (e.g., `3/5 Milestones`). Teammates can cycle task status with a single click.

### 4. Task Board Calendar View
Toggling the **Calendar View** button swaps the Kanban grid for a premium monthly interactive calendar. Designed for scheduling clarity:
- **Date Layout**: Displays a 7-column monthly grid with previous/next month navigation buttons and a "Today" quick-jump button.
- **Date Matching**: Dynamically places tasks on cells corresponding to their assign date (`created_at`), schedule start date (`scheduled_at`), due date (`due_date`), or completion date (`completed_at`).
- **Compact Cell Render**: Shows at most two task badges per day cell to avoid layout clutter, displaying `+ N more` indicators for extra tasks.
- **Date Detail Panel**: Clicking any day cell renders a sleek, details list of all tasks on that day, showing task metadata (exact start/due/complete times, milestone progress trackers, assignees) and quick action buttons (In Progress, Done, Reopen, Delete).

### 5. Unified Settings & Communication Hub
To streamline setup, all integration controls are centralized under the **Account Settings (Profile)** tab:
- **Google Workspace**: Configure Client Credentials, perform OAuth login, and enable dynamic Google Forms creation and sync.
- **Telegram Bot Link**: Pair your dashboard user profile with the Telegram Bot by deep-linking to `@Smart_leadintel_bot` or inputting your Chat ID manually.
- **Business Email Sync**: Sync your Gmail account to enable a multi-folder sync client (Inbox, Drafts, Outbox, Copilot Outbox, Spam) and review sent outreach emails directly in the Outbox Drawer.
- **Locked State Security**: When Gmail is unlinked, the mail client displays a clean locked screen, preventing access until authorized via Google OAuth.

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
