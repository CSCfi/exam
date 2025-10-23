# Docker Setup for EXAM PostgreSQL

This guide explains how to use Docker to run PostgreSQL for the EXAM application instead of installing it locally.

## Prerequisites

- Docker Desktop or Docker Engine installed
- Docker Compose (included with Docker Desktop)

## Quick Start

1. **Start PostgreSQL**

   ```bash
   docker compose up -d postgres
   ```

   This will:
   - Download PostgreSQL 16 Alpine image
   - Create `exam` database with user `exam` and password `exam`
   - Create `exam_test` database for tests
   - Expose PostgreSQL on port 5432 (same as local installation)
   - Store data in a persistent Docker volume

2. **Verify it's running**

   ```bash
   docker compose ps
   ```

   You should see `exam-postgres` with status "Up".

3. **View logs**

   ```bash
   docker compose logs -f postgres
   ```

4. **Stop PostgreSQL**

   ```bash
   docker compose down
   ```

   Note: This stops containers but keeps data. To remove data volumes, use:
   
   ```bash
   docker compose down -v
   ```

## Make Commands (Shortcuts)

For convenience, a `Makefile` is included with shorter commands:

```bash
make db-start     # Start PostgreSQL
make db-stop      # Stop PostgreSQL
make db-restart   # Restart PostgreSQL
make db-logs      # View logs
make db-shell     # Open psql CLI
make db-backup    # Create timestamped backup
make db-restore BACKUP=file.sql  # Restore from backup
make db-reset     # Reset database (deletes all data)
make db-status    # Check status
make help         # Show all commands
```

These are just shortcuts for Docker Compose commands - use whichever you prefer!

## Using the Application

Once PostgreSQL is running in Docker, you can start the application normally:

```bash
# Terminal 1: Start backend
sbt -Dconfig.file=conf/dev.conf -jvm-debug 9999 -mem 2048
[exam] $ run

# Terminal 2: Start frontend
npm start
```

The application will connect to the Dockerized PostgreSQL automatically on `localhost:5432`.

## Optional: pgAdmin (Database Management UI)

To enable pgAdmin for a web-based database management interface:

1. Uncomment the `pgadmin` section in `docker-compose.yml`
2. Start services:
   ```bash
   docker compose up -d
   ```
3. Access pgAdmin at http://localhost:5050
   - Email: `admin@exam.local`
   - Password: `admin`

4. Add PostgreSQL server in pgAdmin:
   - Host: `postgres` (Docker service name)
   - Port: `5432`
   - Username: `exam`
   - Password: `exam`

## Useful Commands

### Connect to PostgreSQL CLI

```bash
make db-shell
# Or: docker compose exec postgres psql -U exam -d exam
```

### Create a database backup

```bash
make db-backup
# Or: docker compose exec postgres pg_dump -U exam exam > backup.sql
```

### Restore from backup

```bash
make db-restore BACKUP=backup.sql
# Or: docker compose exec -T postgres psql -U exam exam < backup.sql
```

### Reset database (warning: deletes all data)

```bash
make db-reset
# Or: docker compose down -v && docker compose up -d postgres
```

## Switching from Local PostgreSQL to Docker

If you currently have PostgreSQL installed locally:

1. Stop your local PostgreSQL service:
   ```bash
   # macOS with Homebrew
   brew services stop postgresql
   
   # Or if using launchctl
   launchctl unload ~/Library/LaunchAgents/homebrew.mxcl.postgresql*.plist
   ```

2. Start Docker PostgreSQL:
   ```bash
   make db-start
   # Or: docker compose up -d postgres
   ```

3. No configuration changes needed - Docker exposes the same port (5432)

## Switching Back to Local PostgreSQL

1. Stop Docker PostgreSQL:
   ```bash
   make db-stop
   # Or: docker compose down
   ```

2. Start local PostgreSQL:
   ```bash
   brew services start postgresql
   # Or: launchctl load ~/Library/LaunchAgents/homebrew.mxcl.postgresql*.plist
   ```

## Troubleshooting

### Port 5432 already in use

If you get a port conflict error, your local PostgreSQL is still running:

```bash
# Check what's using port 5432
lsof -i :5432

# Stop local PostgreSQL
brew services stop postgresql
# Or: launchctl unload ~/Library/LaunchAgents/homebrew.mxcl.postgresql*.plist
```

### Can't connect to database

Check if container is running:
```bash
make db-status
# Or: docker compose ps
# Or: docker compose logs postgres
```

### Performance issues

Allocate more resources to Docker Desktop:
- Go to Docker Desktop → Settings → Resources
- Increase Memory and CPU allocation

## Data Persistence

Database data is stored in a Docker volume named `exam_postgres_data`. This persists between container restarts. To view volumes:

```bash
docker volume ls
```

To inspect volume:
```bash
docker volume inspect exam_postgres_data
```

