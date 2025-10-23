<!--
SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium

SPDX-License-Identifier: EUPL-1.2
-->
# Docker Setup for EXAM

This guide explains how to use Docker to run the EXAM application.

## Prerequisites

- Docker Desktop or Docker Engine installed
- Docker Compose (included with Docker Desktop)
- At least 4GB RAM allocated to Docker

## Quick Start - Full Application

Run the complete EXAM application (frontend + backend + database):

```bash
docker compose up --build
```

Access at: **http://localhost**

This will:
- Build the application (frontend with npm, backend with sbt)
- Start PostgreSQL database
- Start nginx container (port 80)
- Start EXAM backend container with packaged frontend assets
- Create test database and users

### Architecture

The Docker setup uses three containers:
- **nginx** container on port 80 - Proxies all requests to backend for CSRF token handling
- **exam** container on port 9000 (internal) - Play Framework backend with packaged frontend assets
- **postgres** container on port 5432 - PostgreSQL database

### Authentication

By default, uses **DEBUG login mode** (no SSO required).

## Development - PostgreSQL Only

If you want to run frontend/backend locally but use Docker for PostgreSQL:

```bash
docker compose up -d postgres
```

Then run:
```bash
npm start          # Terminal 1 - Frontend
sbt run           # Terminal 2 - Backend  
```

## Useful Commands

### View Logs

```bash
# All containers
docker compose logs -f

# Specific container
docker compose logs -f exam      # Backend
docker compose logs -f nginx     # Web server
docker compose logs -f postgres  # Database
```

### Stop Application

```bash
docker compose down
```

Keep data (default) or remove data:
```bash
docker compose down -v  # Removes database data
```

### Rebuild After Code Changes

```bash
docker compose up --build
```

### Access Database Shell

```bash
docker compose exec postgres psql -U exam -d exam
```

### Database Backup

```bash
docker compose exec postgres pg_dump -U exam exam > backup.sql
```

### Database Restore

```bash
docker compose exec -T postgres psql -U exam exam < backup.sql
```

## Configuration

### Environment Variables

Create `.env` file to customize:

```bash
APP_HOSTNAME=http://localhost
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASSWORD=password
```

### Configuration Files

- `conf/docker.conf` - Backend configuration for Docker
- `docker/nginx.conf` - nginx proxy configuration

### Ports

- **80** - nginx web server (public access)
- **9000** - Play Framework backend (internal, not exposed to host)
- **5432** - PostgreSQL (exposed for direct access if needed)

## Docker Files Structure

```
docker/
├── Dockerfile           # Backend build with packaged frontend assets
├── nginx.conf          # nginx proxy configuration
├── init-test-db.sh     # Database initialization
└── README.md           # Docker setup documentation

docker-compose.yml       # Container orchestration (3 services)
conf/docker.conf        # Backend configuration
```

## Troubleshooting

### Container won't start

Check logs:
```bash
docker compose logs exam   # Backend logs
docker compose logs nginx  # Web server logs
```

Common issues:
- Port 80 already in use (stop other web servers)
- Insufficient Docker memory (increase in Docker Desktop settings)
- Backend not healthy (nginx waits for exam service health check)

### Database connection errors

Verify PostgreSQL is running:
```bash
docker compose ps postgres
```

Check health:
```bash
docker compose exec postgres pg_isready -U exam
```

### Build fails

Clear Docker cache and rebuild:
```bash
docker compose down
docker system prune -a
docker compose up --build
```

## Production Deployment

For production:

1. **Change `exam.login` in `conf/docker.conf`** to your SSO provider (e.g., "HAKA")
2. **Set secure secrets** using environment variables or Docker secrets
3. **Enable HTTPS** by configuring SSL certificates in nginx
4. **Use external PostgreSQL** instead of container
5. **Set up backups** for database and attachments

## Makefile Commands

Quick shortcuts:

```bash
make db-start      # Start PostgreSQL only
make db-stop       # Stop all containers  
make db-restart    # Restart PostgreSQL
make db-logs       # View PostgreSQL logs
make db-shell      # Open PostgreSQL shell
make db-backup     # Create database backup
make db-restore    # Restore from backup (BACKUP=file.sql)
make db-reset      # Reset database (WARNING: deletes data)
make db-status     # Check PostgreSQL status
```

## Development Workflow

1. **Make code changes**
2. **Rebuild and restart:**
   ```bash
   docker compose up --build
   ```
3. **View logs:**
   ```bash
   docker compose logs -f exam
   ```
4. **Test at http://localhost**

## Next Steps

- Review `conf/docker.conf` for configuration options
- Check `docker/nginx.conf` for proxy configuration
- See `docker/README.md` for detailed Docker setup information
