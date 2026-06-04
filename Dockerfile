FROM node:20-bullseye

# Install PostgreSQL, build-essential (for pgvector compilation), git, python3, pip, curl
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql \
    postgresql-contrib \
    postgresql-server-dev-all \
    build-essential \
    python3 \
    python3-pip \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Clone and compile pgvector extension from source
RUN git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git /tmp/pgvector \
    && cd /tmp/pgvector \
    && make \
    && make install \
    && rm -rf /tmp/pgvector

# Pre-install n8n globally during build phase to avoid slow filesystem extraction failures at runtime
RUN npm install -g n8n --unsafe-perm

# Set up Hugging Face unprivileged user (using pre-existing node user with UID 1000)
ENV HOME=/home/node

# Set up Vite frontend directory
WORKDIR /app

# Copy package configurations and install node modules
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy all repository files
COPY --chown=node:node . .

# Build Vite frontend static files
RUN npm run build

# Set up permissions for unprivileged execution of PostgreSQL and n8n
RUN mkdir -p /home/node/postgres/data /home/node/.n8n && \
    chown -R node:node /home/node /app && \
    chmod -R 777 /home/node /app

# Run as default non-root user (node)
USER node

# Expose Hugging Face Space port
EXPOSE 7860

# Run coordinator script
CMD ["/app/start.sh"]

# rebuild Tue Jun  2 02:52:36 IST 2026
