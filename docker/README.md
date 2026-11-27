<!--
SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium

SPDX-License-Identifier: EUPL-1.2
-->
# Docker Setup Files

This directory contains Docker configuration files for the EXAM application.

## Files

- **`Dockerfile`** - Multi-stage build for the backend (Play Framework) with frontend assets packaged during build
- **`nginx.conf`** - Nginx configuration for proxying requests to the backend (used by separate nginx container)
- **`init-test-db.sh`** - Creates the `exam_test` database when PostgreSQL starts

## Architecture

The Docker setup uses a multi-container architecture:

- **nginx container** - Serves static assets and proxies all requests to the backend for CSRF token handling
- **exam container** - Play Framework backend with packaged frontend assets
- **postgres container** - PostgreSQL database

These files are used by `docker-compose.yml` to provide the complete application stack.

## Documentation

See [DOCKER.md](../DOCKER.md) for setup instructions.

