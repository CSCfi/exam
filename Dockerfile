# SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
#
# SPDX-License-Identifier: EUPL-1.2

# Multi-stage build combining Frontend (Angular) and Backend (Play Framework)

# Stage 1: Build Frontend
FROM node:24-alpine AS frontend-builder

WORKDIR /app

# Copy frontend dependencies
COPY package*.json ./
COPY angular.json .
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --ignore-scripts

# Copy frontend source
COPY ui ui

# Build frontend for production
RUN npm run build

# Stage 2: Build Backend
FROM eclipse-temurin:25-jdk AS backend-builder

# Install sbt
RUN apt-get update && \
    apt-get install -y curl gnupg && \
    echo "deb https://repo.scala-sbt.org/scalasbt/debian all main" | tee /etc/apt/sources.list.d/sbt.list && \
    echo "deb https://repo.scala-sbt.org/scalasbt/debian /" | tee /etc/apt/sources.list.d/sbt_old.list && \
    curl -sL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x2EE0EA64E40A89B84B2DF73499E82A75642AC823" | apt-key add && \
    apt-get update && \
    apt-get install -y sbt && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy backend dependencies
COPY build.sbt .
COPY project ./project

# Download dependencies
RUN sbt update

# Copy backend source
COPY app ./app
COPY conf ./conf    

# Build backend
RUN sbt stage

# Stage 3: Runtime with nginx + backend
FROM eclipse-temurin:25-jre

# Install nginx and wget
RUN apt-get update && \
    apt-get install -y nginx wget && \
    rm -rf /var/lib/apt/lists/*

# Copy backend from builder
WORKDIR /app
COPY --from=backend-builder /build/target/universal/stage /app

# Copy frontend build to nginx directory
COPY --from=frontend-builder /app/public /usr/share/nginx/html

# Copy nginx configuration
COPY docker/nginx-combined.conf /etc/nginx/sites-available/default

# Create directories
RUN mkdir -p /app/data/attachments && \
    mkdir -p /var/log/nginx && \
    mkdir -p /run

# Expose port 80 (nginx)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/app/attributes || exit 1

# Start script
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]

