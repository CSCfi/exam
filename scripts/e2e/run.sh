#!/bin/sh
# SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
#
# SPDX-License-Identifier: EUPL-1.2
#
# Runs the GUI tests against a fresh stack: rebuilds the image from the current checkout, recreates
# the database, seeds it and runs Playwright. Extra arguments go to Playwright, e.g.
#   scripts/e2e/run.sh --headed
# EXAM_DB_PORT (default 5433) only decides where the stack's Postgres is published on the host;
# the seed and the tests reach the database through the container, never through that port.
set -eu

cd "$(dirname "$0")/../.."
export EXAM_DB_PORT="${EXAM_DB_PORT:-5433}"
# The test override (compose.yml) gives the app the tests' configuration, see app.conf
export COMPOSE_FILE="docker-compose.yml:scripts/e2e/compose.yml"

docker compose down -v
# E2E_NO_BUILD=1 reuses the existing image, e.g. when only the tests or the seed changed
if [ "${E2E_NO_BUILD:-0}" = "1" ]; then
    docker compose up -d --wait
else
    docker compose up -d --build --wait
fi

machine_ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' exam-nginx)
docker exec -i exam-postgres psql -U exam -d exam -v ON_ERROR_STOP=1 -v machine_ip="$machine_ip" \
    < scripts/e2e/seed.sql > /dev/null

pnpm exec playwright test -c scripts/e2e/playwright.config.ts "$@"
