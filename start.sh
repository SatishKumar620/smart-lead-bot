#!/bin/bash
set -e

echo "=== Starting B2B Lead Intelligence Coordinator ==="

# Resolve PostgreSQL binary path dynamically since apt installs it under a versioned path
POSTGRES_BIN=$(find /usr/lib/postgresql/ -maxdepth 2 -type d -name bin | head -n 1)
if [ -n "$POSTGRES_BIN" ]; then
    echo "Found PostgreSQL binaries at: $POSTGRES_BIN"
    export PATH="$POSTGRES_BIN:$PATH"
else
    echo "Warning: PostgreSQL bin folder not found in /usr/lib/postgresql/. Trying default PATH."
fi

# Set up user directories
mkdir -p "$HOME/postgres/data"
mkdir -p "$HOME/.n8n"

# Set up PostgreSQL permissions and initialize
if [ ! -f "$HOME/postgres/data/PG_VERSION" ]; then
    echo "Initializing new PostgreSQL database..."
    initdb -D "$HOME/postgres/data"
fi

echo "Starting PostgreSQL..."
pg_ctl -D "$HOME/postgres/data" -o "-p 5432 -k $HOME/postgres" start

# Wait for PostgreSQL to become ready
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if pg_isready -h localhost -p 5432; then
        echo "PostgreSQL is ready!"
        break
    fi
    sleep 1
done

# Create DB and tables if needed
echo "Initializing leads database schema..."
psql -h localhost -p 5432 -d postgres -c "CREATE ROLE admin WITH SUPERUSER LOGIN PASSWORD 'password123';" || echo "admin role already exists."
createdb -h localhost -p 5432 -O admin leads || echo "leads database already exists."
psql -h localhost -p 5432 -d postgres -c "ALTER DATABASE leads OWNER TO admin;" || echo "Failed to alter database owner."
psql -h localhost -p 5432 -U admin -d leads -f /app/schema.sql
psql -h localhost -p 5432 -U admin -d leads -f /app/seed_leads.sql && echo "✅ Pune leads seeded!"
psql -h localhost -p 5432 -U admin -d leads -f /app/seed_users.sql && echo "✅ Users seeded!"

# Configure n8n environment
export N8N_INSTANCE_OWNER_MANAGED_BY_ENV=true
export N8N_INSTANCE_OWNER_EMAIL=admin@smartleadbot.com
export N8N_INSTANCE_OWNER_FIRST_NAME=Admin
export N8N_INSTANCE_OWNER_LAST_NAME=User
export N8N_INSTANCE_OWNER_PASSWORD_HASH='$2b$10$EixZaYVK1fsYi1wsewU.aedCqO7791k/6oR8QWq.0tV2d9lWq/K26'
export N8N_PORT=5678
export N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false
export N8N_BASIC_AUTH_ACTIVE=false
# Remove N8N_PATH — internal webhook calls use the root path directly
unset N8N_PATH

# Start n8n in the background
echo "Starting n8n Automation Engine..."
n8n start > "$HOME/n8n.log" 2>&1 &
N8N_PID=$!

# Wait for n8n to be truly ready — use /healthz not /n8n/healthz
echo "Waiting for n8n to become ready..."
N8N_READY=false
for i in {1..60}; do
    if curl -s -f http://localhost:5678/healthz > /dev/null 2>&1; then
        echo "✅ n8n is up and healthy (attempt $i)"
        N8N_READY=true
        break
    fi
    sleep 2
done

if [ "$N8N_READY" = "false" ]; then
    echo "⚠️  n8n did not start in time — check $HOME/n8n.log"
fi

# Run environment preprocessor to inject secrets before importing
echo "Preprocessing workflow and credentials..."
python3 /app/preprocess_env.py

# Import workflow and credentials using CLI
echo "Importing n8n credentials and workflow..." > "$HOME/import.log"
n8n import:credentials --input=/app/credentials.json >> "$HOME/import.log" 2>&1 || echo "Warning: credentials import failed." >> "$HOME/import.log"
n8n import:workflow --input=/app/workflow.json >> "$HOME/import.log" 2>&1 || echo "Warning: workflow import failed." >> "$HOME/import.log"
echo "Import done." >> "$HOME/import.log"

# Give n8n a moment to settle after import before calling the REST API
sleep 3

# Activate the workflow via REST API using the admin owner JWT
# We use the n8n public API to find the workflow by name and activate it
echo "Activating workflow via n8n REST API..."
python3 /app/activate_workflow.py >> "$HOME/import.log" 2>&1 && echo "✅ Workflow activated." || echo "⚠️  Workflow activation failed — see $HOME/import.log"

# Update workflow nodes with real secrets from HF environment
echo "Injecting runtime secrets into workflow nodes..."
python3 /app/update_n8n.py >> "$HOME/import.log" 2>&1 && echo "✅ Secrets injected." || echo "⚠️  Secret injection failed — see $HOME/import.log"

# Start production Express server
echo "Launching Production Express server on Port 7860..."
cd /app
exec npm start
