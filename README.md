---
title: Smart Lead Bot
emoji: 🤖
colorFrom: yellow
colorTo: red
sdk: docker
app_port: 7860
pinned: false
---

# B2B Lead Intelligence Dashboard & n8n Automation Engine

This repository hosts a fully self-contained, unprivileged B2B Lead Intelligence and Workflow Automation system deployed as a Hugging Face Space Docker container.

## 🚀 Architecture and Components

- **React Vite Dashboard**: Serves the user interface on port `7860`, allowing searching, sorting, and analyzing leads. Exposes reverse proxies routing `/n8n` to the automation server.
- **n8n Automation Engine**: Exposes complex lead processing pipelines under `/n8n/` powered by Groq and Cohere.
- **PostgreSQL Database**: A local, unprivileged PostgreSQL instance with `pgvector` enabled for indexing and vector search.

---

## 🔑 Required Secrets

Add these keys in your Hugging Face Space Settings under **Variables and Secrets**:
- `GROQ_API_KEY`: Groq API Key (for lead scoring and chat RAG).
- `COHERE_API_KEY`: Cohere API Key (for vector embeddings).
- `TELEGRAM_BOT_TOKEN`: Telegram bot token (for alerts).
- `TELEGRAM_CHAT_ID`: Telegram chat ID (for alerts).
