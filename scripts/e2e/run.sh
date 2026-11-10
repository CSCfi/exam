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

# LTI keys for the stand-in tool (lti.conf, lti-tool/server.mjs): EXAM's signing key pair and the
# tool's TLS certificate. Generated once, kept out of git.
lti=scripts/e2e/.lti
if [ ! -f "$lti/tool-cert.pem" ]; then
    mkdir -p "$lti"
    openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$lti/platform-private.pem" 2>/dev/null
    openssl pkey -in "$lti/platform-private.pem" -pubout -out "$lti/platform-public.pem"
    openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -subj /CN=127.0.0.1 \
        -addext subjectAltName=IP:127.0.0.1 -keyout "$lti/tool-key.pem" -out "$lti/tool-cert.pem" 2>/dev/null
    # The app runs as another user in its container
    chmod 644 "$lti"/*.pem
fi
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
