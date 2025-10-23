<!--
SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium

SPDX-License-Identifier: EUPL-1.2
-->
# Docker Setup Files

This directory contains Docker configuration files for the EXAM application.

## Files

- **`Dockerfile`** - Multi-stage build combining frontend (Angular) and backend (Play Framework) with nginx
- **`nginx.conf`** - Nginx configuration for serving the Angular frontend and proxying API requests to the backend
- **`start.sh`** - Container startup script that runs both nginx and the Play backend
- **`init-db.sh`** - Creates the main `exam` database when PostgreSQL starts
- **`init-test-db.sh`** - Creates the `exam_test` database when PostgreSQL starts

## Usage

These files are used by `docker-compose.yml` to provide a complete application stack (PostgreSQL + Backend + Frontend).

## Documentation

See [DOCKER.md](../DOCKER.md) for setup instructions.

