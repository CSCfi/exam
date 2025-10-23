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

# Copy frontend build from frontend-builder stage
# This must be done BEFORE sbt stage so assets are packaged into the JAR
COPY --from=frontend-builder /app/public ./public

# Build backend
RUN sbt stage

# Stage 3: Runtime - Backend only
FROM eclipse-temurin:25-jre

# Install wget for health checks
RUN apt-get update && \
    apt-get install -y wget && \
    rm -rf /var/lib/apt/lists/*

# Copy backend from builder (includes packaged frontend assets)
WORKDIR /app
COPY --from=backend-builder /build/target/universal/stage /app

# Create directories
RUN mkdir -p /app/data/attachments

# Expose Play Framework port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9000/app/attributes || exit 1

# Start Play Framework backend directly
CMD ["/app/bin/exam", "-Dconfig.file=/app/conf/docker.conf"]

