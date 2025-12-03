# SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
#
# SPDX-License-Identifier: EUPL-1.2
#
# Makefile for EXAM Docker operations

.PHONY: help db-start db-stop db-restart db-logs db-shell db-backup db-restore db-reset

help: ## Show this help message
	@echo "EXAM Docker Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

db-start: ## Start PostgreSQL in Docker
	docker compose up -d postgres
	@echo "Waiting for PostgreSQL to be ready..."
	@until docker compose exec postgres pg_isready -U exam > /dev/null 2>&1; do sleep 1; done
	@echo "PostgreSQL is ready!"

db-stop: ## Stop PostgreSQL Docker container
	docker compose down

db-restart: ## Restart PostgreSQL Docker container
	docker compose restart postgres

db-logs: ## View PostgreSQL logs
	docker compose logs -f postgres

db-shell: ## Open PostgreSQL shell
	docker compose exec postgres psql -U exam -d exam

db-backup: ## Create database backup (saves to backup.sql)
	docker compose exec postgres pg_dump -U exam exam > backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backup created: backup_$$(date +%Y%m%d_%H%M%S).sql"

db-restore: ## Restore from backup (requires BACKUP=filename.sql)
	@if [ -z "$(BACKUP)" ]; then \
		echo "Error: Please specify backup file with BACKUP=filename.sql"; \
		exit 1; \
	fi
	docker compose exec -T postgres psql -U exam exam < $(BACKUP)
	@echo "Database restored from $(BACKUP)"

db-reset: ## Reset database (WARNING: deletes all data)
	@echo "WARNING: This will delete all data. Press Ctrl+C to cancel, Enter to continue..."
	@read confirm
	docker compose down -v
	docker compose up -d postgres
	@echo "Database reset complete"

db-status: ## Check PostgreSQL status
	@docker compose ps postgres
	@echo ""
	@echo "Health check:"
	@docker compose exec postgres pg_isready -U exam || echo "PostgreSQL is not ready"

