import re
import os
import sys
from fpdf import FPDF

class SystemDocPDF(FPDF):
    def header(self):
        # Header is suppressed on page 1 (cover page)
        if self.page_no() > 1:
            self.set_font('helvetica', 'I', 8)
            self.set_text_color(100, 116, 139) # slate-500
            self.cell(0, 10, 'Smart Lead Bot - Comprehensive Technical Documentation & Blueprint', 0, 0, 'R')
            self.set_draw_color(226, 232, 240) # slate-200
            self.set_line_width(0.5)
            self.line(20, 20, 190, 20)
            self.ln(12)

    def footer(self):
        # Footer is suppressed on page 1
        if self.page_no() > 1:
            self.set_y(-15)
            self.set_font('helvetica', 'I', 8)
            self.set_text_color(100, 116, 139) # slate-500
            self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', 0, 0, 'C')

def clean_text(text):
    text = text.replace('\u201c', '"').replace('\u201d', '"').replace('\u2018', "'").replace('\u2019', "'")
    text = text.replace('\u2014', '-').replace('\u2013', '-')
    text = text.replace('\u2192', '->')
    text = text.replace('✔', '[PASS]')
    text = text.replace('✘', '[FAIL]')
    text = text.replace('•', '-')
    return text.encode('latin-1', 'ignore').decode('latin-1')

def write_rich_paragraph(pdf, text):
    text = clean_text(text)
    parts = re.split(r'(\*\*.*?\*\*|`.*?`)', text)
    pdf.set_text_color(51, 65, 85) # slate-700
    for part in parts:
        if part.startswith('**') and part.endswith('**'):
            pdf.set_font('helvetica', 'B', 10.5)
            pdf.write(6, part[2:-2])
        elif part.startswith('`') and part.endswith('`'):
            pdf.set_font('Courier', 'B', 9.5)
            pdf.set_text_color(220, 38, 38)
            pdf.write(6, part[1:-1])
            pdf.set_text_color(51, 65, 85)
        else:
            pdf.set_font('helvetica', '', 10.5)
            pdf.write(6, part)
    pdf.ln(7.5)

def write_bullet_item(pdf, text):
    pdf.set_font('helvetica', 'B', 10.5)
    pdf.set_text_color(197, 160, 89) # Gold color
    pdf.write(6, '   -   ')
    write_rich_paragraph(pdf, text)

def add_chapter_header(pdf, title):
    if pdf.get_y() > (pdf.h - 40):
        pdf.add_page()
    pdf.ln(6)
    pdf.set_font('helvetica', 'B', 18)
    pdf.set_text_color(15, 23, 42) # Slate-900
    pdf.cell(0, 10, clean_text(title), 0, 1, 'L')
    # Draw gold border line
    pdf.set_draw_color(197, 160, 89) # Gold
    pdf.set_line_width(1.5)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(6)

def add_section_header(pdf, title):
    if pdf.get_y() > (pdf.h - 30):
        pdf.add_page()
    pdf.ln(4)
    pdf.set_font('helvetica', 'B', 13)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 8, clean_text(title), 0, 1, 'L')
    pdf.ln(2)

def generate_pdf():
    pdf_path = "/home/satish/Desktop/Frontend/smart_lead_bot_documentation.pdf"
    
    pdf = SystemDocPDF()
    pdf.alias_nb_pages()
    pdf.set_margins(20, 25, 20)
    pdf.set_auto_page_break(auto=True, margin=20)
    
    # ── COVER PAGE ──
    pdf.add_page()
    # Left decorative stripes
    pdf.set_fill_color(15, 23, 42) # Deep Navy
    pdf.rect(0, 0, 15, 297, 'F')
    pdf.set_fill_color(197, 160, 89) # Gold
    pdf.rect(15, 0, 4, 297, 'F')
    
    pdf.set_y(60)
    pdf.set_x(30)
    pdf.set_font('helvetica', 'B', 13)
    pdf.set_text_color(197, 160, 89)
    pdf.cell(0, 8, 'SYSTEM DOCUMENTATION & TECHNICAL BLUEPRINT', 0, 1)
    
    pdf.set_x(30)
    pdf.ln(2)
    pdf.set_font('helvetica', 'B', 38)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 15, 'Smart Lead Bot', 0, 1)
    
    pdf.ln(4)
    pdf.set_draw_color(197, 160, 89)
    pdf.set_line_width(2)
    pdf.line(30, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(8)
    
    pdf.set_x(30)
    pdf.set_font('helvetica', '', 13)
    pdf.set_text_color(71, 85, 105) # Slate-600
    pdf.multi_cell(160, 7, 'A Modern B2B Lead Generation Pipeline, Intelligent AI Enrichment, n8n Workflow Automation, and Integrated Communication Hub.')
    
    # Project Details Box
    pdf.set_y(180)
    pdf.set_x(30)
    pdf.set_fill_color(248, 250, 252) # Light slate box
    pdf.set_draw_color(226, 232, 240)
    pdf.set_line_width(0.5)
    pdf.rect(30, 180, 160, 65, 'FD')
    
    details = [
        ('PREPARED FOR:', 'Satish Kumar'),
        ('PREPARED BY:', 'Antigravity AI Coding Assistant'),
        ('DATE:', 'June 2026'),
        ('VERSION:', '2.1.0 (Calendar & Settings Update)')
    ]
    
    pdf.set_y(185)
    for label, val in details:
        pdf.set_x(35)
        pdf.set_font('helvetica', 'B', 9.5)
        pdf.set_text_color(100, 116, 139) # slate-500
        pdf.cell(40, 6.5, label)
        
        pdf.set_font('helvetica', 'B' if 'VERSION' in label or 'PREPARED' in label else '', 10)
        pdf.set_text_color(197, 160, 89) if 'VERSION' in label else pdf.set_text_color(15, 23, 42)
        pdf.cell(0, 6.5, val, 0, 1)
        
    # ── TABLE OF CONTENTS ──
    pdf.add_page()
    pdf.ln(10)
    pdf.set_font('helvetica', 'B', 22)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 12, 'Table of Contents', 0, 1)
    
    pdf.set_draw_color(197, 160, 89)
    pdf.set_line_width(1.5)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(10)
    
    toc_items = [
        ('1. Introduction', '3'),
        ('2. Project Objectives', '3'),
        ('3. System Architecture & Tech Stack', '4'),
        ('4. Core Features Overview', '4'),
        ('5. End-to-End System Workflow', '6'),
        ('6. n8n Automation Engine & Webhooks', '6'),
        ('7. Security Considerations & Storage Parity', '7'),
        ('8. Deployment Architecture & Build Parity', '8'),
        ('9. Limitations & Future Scope', '9'),
        ('10. Conclusion & Business Value', '9')
    ]
    
    pdf.set_font('helvetica', '', 11)
    pdf.set_text_color(51, 65, 85)
    for title, page in toc_items:
        # Draw dot leaders
        dots = '.' * (80 - len(title))
        pdf.cell(140, 8.5, title)
        pdf.set_font('helvetica', 'I', 10)
        pdf.set_text_color(148, 163, 184) # slate-400
        pdf.cell(10, 8.5, dots)
        pdf.set_font('helvetica', 'B', 11)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(20, 8.5, page, 0, 1, 'R')
        pdf.set_font('helvetica', '', 11)
        pdf.set_text_color(51, 65, 85)
        
    # ── 1. INTRODUCTION ──
    pdf.add_page()
    add_chapter_header(pdf, '1. Introduction')
    write_rich_paragraph(pdf, 'In today\'s high-velocity B2B marketplace, lead generation remains one of the primary drivers of organizational growth. However, manual lead collection, data validation, team routing, and multichannel follow-up constitute major operational bottlenecks. The **Smart Lead Bot** project represents an integrated, state-of-the-art enterprise solution designed to fully automate and scale these workflows.')
    write_rich_paragraph(pdf, 'By combining modern web technologies, AI-powered enrichment, and the n8n automation engine, the system ingests raw leads, cleans and qualifies them, structures delegation tasks, and automates outreach channels. This document provides a complete technical blueprint of the application, detailing the system architecture, core UI components, webhook automation, security designs, and deployment configurations.')

    # ── 2. PROJECT OBJECTIVES ──
    add_chapter_header(pdf, '2. Project Objectives')
    write_rich_paragraph(pdf, 'The primary objectives of the Smart Lead Bot project are to modernize B2B lead workflows, eliminate manual administrative steps, and optimize pipeline visibility. Specifically, the system is engineered to achieve the following:')
    
    write_bullet_item(pdf, '**Automated Ingestion**: Allow seamless single-entry lead ingestion, dynamic bulk file parsing (CSV, Excel, JSON), and automated public survey intakes via Google Forms integration.')
    write_bullet_item(pdf, '**Dynamic Schema Adaptability**: Enable CRM administrators to create, edit, and save custom database fields and ingestion templates directly from the client interface, adapting dynamically to niche industries.')
    write_bullet_item(pdf, '**Intelligent Enrichment**: Validate company details, scrape website telemetry, and analyze B2B market gaps using integrated AI models with resilient local rules fallbacks.')
    write_bullet_item(pdf, '**Modern Delegation Pipeline**: Streamline lead assignment to sales teammates using an interactive Kanban board and a premium monthly calendar view showing schedule dates, due dates, and completion status.')
    write_bullet_item(pdf, '**Integrated Communication Sync**: Centralize communication setup and email synchronization in a single settings portal, supporting Google Workspace OAuth, real-time Gmail sync, and Telegram notifications.')

    # ── 3. SYSTEM ARCHITECTURE & TECH STACK ──
    pdf.add_page()
    add_chapter_header(pdf, '3. System Architecture & Tech Stack')
    write_rich_paragraph(pdf, 'The Smart Lead Bot architecture relies on a highly responsive, secure, and modular layer system. The primary layers include:')
    
    add_section_header(pdf, 'Database (Data Layer)')
    write_rich_paragraph(pdf, '**PostgreSQL** acts as the core relational data store. It contains schemas for leads, users, tasks, task milestones, task assignments, lead activities, Google Workspace config, and sent email outbox logs. Startup migration logic dynamically seeds missing tables and adds scheduling fields.')
    
    add_section_header(pdf, 'Backend API (Service Layer)')
    write_rich_paragraph(pdf, 'A **Node.js & Express** backend processes API requests, manages authentication, performs database CRUD actions, executes Google OAuth token refreshes, and runs webhook handlers. The Vite development server config (`vite.config.js`) duplicates all backend API endpoints, maintaining **full dev-to-prod parity** when running locally.')
    
    add_section_header(pdf, 'Frontend Client (Presentation Layer)')
    write_rich_paragraph(pdf, 'A **Vite/React** application builds a premium B2B cockpit dashboard. Built with rich styling (vibrant color palettes, HSL borders, backdrop-blur card glow transitions, and responsive sidebars), the UI is optimized for both desktop and mobile layouts.')
    
    add_section_header(pdf, 'Automation & Webhooks (Integration Layer)')
    write_rich_paragraph(pdf, 'An **n8n Automation Engine** coordinates complex external workflows (like sending telemetry triggers and parsing webhook payloads), while the **Telegram Bot API** and **Google Gmail API** handle outbound notifications and email communications.')

    # ── 4. CORE FEATURES OVERVIEW ──
    pdf.add_page()
    add_chapter_header(pdf, '4. Core Features Overview')
    write_rich_paragraph(pdf, 'The dashboard coordinates five primary functional areas to manage B2B intelligence and team operations:')
    
    add_section_header(pdf, '1. Dynamic Ingest Templates & Custom Fields')
    write_rich_paragraph(pdf, 'CRM administrators are no longer locked into static form fields. The **Custom Field Creator** allows definition of custom database fields (types: `text`, `number`, `url`, `email`, `date`) and mandatory switches. Administrators can save their configurations as named **Ingestion Templates**, which dynamically render inputs on the Quick Ingest card.')
    
    add_section_header(pdf, '2. B2B Leads Directory & Opportunity Meters')
    write_rich_paragraph(pdf, 'The B2B Leads Directory lists all crawled leads, custom field tags, and assignment states. A horizontal **Opportunity Meter** aggregates leads data to visualize website, social, and marketing gaps in real time. The directory has a stable, memoized **Map Viewport** that renders B2B locations with custom pulsing markers.')
    
    add_section_header(pdf, '3. Interactive Task Board (Kanban Mode)')
    write_rich_paragraph(pdf, 'Tasks are split into Pending, In Progress, and Completed columns. The Kanban cards feature custom priority badges, scheduled clock icons, overdue alerts, and an inline **Milestone Progress Bar** displaying completion counts (e.g., `3/5 Milestones`). Teammates can cycle task status with a single click.')
    
    # ── CORE FEATURES PART 2 ──
    pdf.add_page()
    add_section_header(pdf, '4. Task Board Calendar View')
    write_rich_paragraph(pdf, 'Toggling the **Calendar View** button swaps the Kanban grid for a premium monthly interactive calendar. Designed for scheduling clarity:')
    write_bullet_item(pdf, '**Date Layout**: Displays a 7-column monthly grid with previous/next month navigation buttons and a "Today" quick-jump button.')
    write_bullet_item(pdf, '**Date Matching**: Dynamically places tasks on cells corresponding to their assign date (`created_at`), schedule start date (`scheduled_at`), due date (`due_date`), or completion date (`completed_at`).')
    write_bullet_item(pdf, '**Compact Cell Render**: Shows at most two task badges per day cell to avoid layout clutter, displaying `+ N more` indicators for extra tasks.')
    write_bullet_item(pdf, '**Date Detail Panel**: Clicking any day cell renders a sleek, details list of all tasks on that day, showing task metadata (exact start/due/complete times, milestone progress trackers, assignees) and quick action buttons (In Progress, Done, Reopen, Delete).')
    
    add_section_header(pdf, '5. Unified settings & Communication Hub')
    write_rich_paragraph(pdf, 'To streamline setup, all integration controls are centralized under the **Account settings (Profile)** tab:')
    write_bullet_item(pdf, '**Google Workspace**: Configure Client Credentials, perform OAuth login, and enable dynamic Google Forms creation and sync.')
    write_bullet_item(pdf, '**Telegram Bot Link**: Pair your dashboard user profile with the Telegram Bot by deep-linking to `@Smart_leadintel_bot` or inputting your Chat ID manually.')
    write_bullet_item(pdf, '**Business Email Client Sync**: Sync your Gmail account to enable a multi-folder sync client (Inbox, Drafts, Outbox, Copilot Outbox, Spam) and review sent outreach emails directly in the Outbox Drawer.')
    write_bullet_item(pdf, '**Locked State Security**: When Gmail is unlinked, the mail client displays a clean locked screen, preventing access until authorized via Google OAuth.')

    # ── 5. END-TO-END SYSTEM WORKFLOW ──
    pdf.add_page()
    add_chapter_header(pdf, '5. End-to-End System Workflow')
    write_rich_paragraph(pdf, 'The life cycle of a lead in the Smart Lead Bot pipeline follows a structured, automated path:')
    
    write_bullet_item(pdf, '**1. Ingestion**: Leads enter the database via CSV bulk ingest, Google Form sync, or manual intake.')
    write_bullet_item(pdf, '**2. Enrichment & Gap Analysis**: n8n triggers fetch business data, analyze social gaps, and compute a priority lead score.')
    write_bullet_item(pdf, '**3. Assignment**: The administrator assigns the lead to a teammate, posting an activity note.')
    write_bullet_item(pdf, '**4. Task Delegation & Scheduling**: A task is created with dynamic milestones, priority, a schedule date, and a due date. This task instantly shows up in the Kanban and Calendar views.')
    write_bullet_item(pdf, '**5. Multichannel Outreach**: Teammates draft Copilot pitches and email them via Gmail. Telegram bot webhook posts alert logs on the linked chat feed.')
    write_bullet_item(pdf, '**6. Close & Archive**: Teammates check milestones, complete the task (updating `completed_at`), and export XLSX reports.')

    # ── 6. N8N AUTOMATION ENGINE & WEBHOOKS ──
    add_chapter_header(pdf, '6. n8n Automation Engine & Webhooks')
    write_rich_paragraph(pdf, 'The **n8n Automation Engine** manages background jobs and webhook notifications, declared in `workflow.json`:')
    
    add_section_header(pdf, 'Webhook Routing')
    write_rich_paragraph(pdf, 'The project defines webhook trigger nodes that receive B2B lead updates, Google Form submissions, and Telegram pairing requests. These webhooks parse JSON payloads, route them to Postgres nodes, and return structured JSON responses.')
    
    add_section_header(pdf, 'AI Lead Qualification (Groq / LLM Integration)')
    write_rich_paragraph(pdf, 'When a new lead is ingested, n8n passes the company niche and details to a Groq Llama LLM Node. The model classifies the lead\'s growth needs (e.g. Website development, marketing outreach) and outputs a numeric score to update the database.')
    
    add_section_header(pdf, 'Telegram Bot Alerts Webhook')
    write_rich_paragraph(pdf, 'An automated Telegram webhook listens to chat interactions. When a user sends `/start <userId>` to `@Smart_leadintel_bot`, n8n extracts the `userId`, queries the Postgres database to set `telegram_chat_id` and `telegram_linked = true`, and returns a confirmation message to the chat feed.')

    # ── 7. SECURITY CONSIDERATIONS & STORAGE PARITY ──
    pdf.add_page()
    add_chapter_header(pdf, '7. Security Considerations & Storage Parity')
    write_rich_paragraph(pdf, 'Operating a B2B CRM in cross-origin environments and sandboxed clouds requires tight security controls:')
    
    add_section_header(pdf, '1. Sandboxed iframe localStorage Fallback')
    write_rich_paragraph(pdf, 'In hosting environments like Hugging Face Spaces, applications are served inside a sandboxed cross-origin `<iframe>`. Direct access to the browser\'s `localStorage` throws a `SecurityError: Access is denied` browser exception, which crashes React mounts. The project uses a safe storage utility wrapper (`src/utils/storage.js`) that traps these exceptions and falls back to an in-memory session dictionary, ensuring uninterrupted execution.')
    
    add_section_header(pdf, '2. CSRF & State-Parameter OAuth Validation')
    write_rich_paragraph(pdf, 'To protect Google OAuth logins, the backend appends the user\'s encrypted `userId` inside the OAuth `state` query parameter. Upon authorization callback, the server reads the `state` parameter to verify the callback origin and link the resulting token directly to the correct user row, preventing OAuth hijack attempts.')
    
    add_section_header(pdf, '3. Hashed Credentials & Safe Token Seeding')
    write_rich_paragraph(pdf, 'Access tokens, refresh tokens, and database passwords are encrypted at rest. Frontend settings configuration inputs mask secret keys by default, allowing connections only from pre-configured environment credentials or manually submitted tokens.')

    # ── 8. DEPLOYMENT ARCHITECTURE & BUILD PARITY ──
    pdf.add_page()
    add_chapter_header(pdf, '8. Deployment Architecture & Build Parity')
    write_rich_paragraph(pdf, 'Smart Lead Bot implements a Dockerized dual-target deployment framework, guaranteeing seamless parity between development, staging, and production environments.')
    
    add_section_header(pdf, 'Docker Containerization')
    write_rich_paragraph(pdf, 'The project defines a single multi-stage `Dockerfile` that compiles the React application using Vite, copies the backend files, and exposes port `7860`. The Node.js application serves the static compiled `dist` directory on the root path and registers all API endpoints on `/api`.')
    
    add_section_header(pdf, 'Dual-Target Git Remotes')
    write_rich_paragraph(pdf, 'Two remote git repositories are configured on the development workspace:')
    write_bullet_item(pdf, '**GitHub (origin)**: Hosts the primary open-source code repository (`https://github.com/SatishKumar620/smart-lead-bot`), executing version control, code merges, and backup.')
    write_bullet_item(pdf, '**Hugging Face (huggingface)**: Direct deployment repository (`https://huggingface.co/spaces/satishverma0870/smart-lead-bot`). A push to `huggingface main` triggers Hugging Face\'s build engine to construct the Docker image and deploy the active container online.')
    
    add_section_header(pdf, 'Vite Development Server Parity')
    write_rich_paragraph(pdf, 'To allow local developers to test features without running a separate production server process, the Vite configuration file (`vite.config.js`) integrates custom API middleware handlers. All database migration scripts, lead update operations, OAuth callbacks, and tasks endpoints are kept in full parity between `vite.config.js` and `server.js`.')

    # ── 9. LIMITATIONS & FUTURE SCOPE ──
    pdf.add_page()
    add_chapter_header(pdf, '9. Limitations & Future Scope')
    write_rich_paragraph(pdf, 'While the current release (v2.1.0) provides a highly resilient and automated pipeline, certain limitations present opportunities for future enhancements:')
    
    add_section_header(pdf, 'Current Limitations')
    write_bullet_item(pdf, '**API Rate Limits**: Scraping and AI enrichment depend on external APIs (like Groq and public geocoding nodes). Rate limits or service blocks can delay lead scoring updates.')
    write_bullet_item(pdf, '**In-Memory Storage Lifetime**: In sandboxed browser iframes where `localStorage` is blocked, session tokens are lost upon a page refresh, requiring users to log back in.')
    
    add_section_header(pdf, 'Future Scope')
    write_bullet_item(pdf, '**WhatsApp Cloud API Sync**: Expand the Telegram bot integration to include WhatsApp Business API support for automated client chat dispatching.')
    write_bullet_item(pdf, '**Real-time WebSockets Sync**: Replace manual API polling with active WebSockets, enabling real-time notification pushes and Kanban board updates across multiple active CRM sessions.')
    write_bullet_item(pdf, '**Multi-Agent CRM Coordination**: Deploy a network of subagents tasked with negotiating with leads via mock emails, reporting back summaries directly.')

    # ── 10. CONCLUSION & BUSINESS VALUE ──
    add_chapter_header(pdf, '10. Conclusion & Business Value')
    write_rich_paragraph(pdf, 'The **Smart Lead Bot** project bridges the gap between raw data collection and strategic sales management. By integrating a dynamic, adaptable database schema, a visual Opportunity Meter, a dual-mode Task Board (Kanban and Calendar), and automated outreach channels (Gmail & Telegram settings), the platform empowers teams to focus on relationship-building rather than repetitive manual work.')
    write_rich_paragraph(pdf, 'The system\'s deployment-ready, Dockerized design ensures it can be hosted in minutes on environments like GitHub and Hugging Face, delivering a premium, secure, and resilient tool for modern B2B organizations.')
    
    # Generate Output File
    pdf.output(pdf_path)
    print("✔ Successfully generated documentation PDF at:", pdf_path)
    return True

if __name__ == "__main__":
    success = generate_pdf()
    sys.exit(0 if success else 1)
