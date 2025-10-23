#!/bin/bash
# SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
#
# SPDX-License-Identifier: EUPL-1.2

set -e

echo "Starting EXAM application..."

# Start nginx in the background
echo "Starting nginx..."
nginx

# Start Play backend
echo "Starting Play Framework backend..."
exec /app/bin/exam -Dconfig.file=/app/conf/docker.conf

