// SPDX-FileCopyrightText: 2026 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { APIRequestContext } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

// Restarts the app with extra configuration from a file in scripts/e2e (e.g. visitor.conf), for
// settings that are read once at startup.
// The tests' app configuration (scripts/e2e/app.conf) includes /app/conf/e2e-override.conf when
// it exists; the file lives in the container only. Undo with restoreAppConfig() so later tests
// run with the normal configuration.
export async function restartAppWith(request: APIRequestContext, confFile: string): Promise<void> {
    docker('cp', join(__dirname, '..', confFile), 'exam-app:/app/conf/e2e-override.conf');
    await restart(request);
}

export async function restoreAppConfig(request: APIRequestContext): Promise<void> {
    docker('exec', 'exam-app', 'rm', '-f', '/app/conf/e2e-override.conf');
    await restart(request);
}

async function restart(request: APIRequestContext): Promise<void> {
    // Play refuses to start while the pid file of the previous start is still there
    docker('exec', 'exam-app', 'rm', '-f', '/app/RUNNING_PID');
    docker('restart', 'exam-app');

    const deadline = Date.now() + 120_000;
    for (;;) {
        const ok = await request
            .get('/app/attributes', { failOnStatusCode: false, timeout: 5_000 })
            .then((response) => response.ok())
            .catch(() => false);
        if (ok) return;
        if (Date.now() > deadline) throw new Error('exam-app did not come back within 2 minutes');
        await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
}

function docker(...args: string[]): void {
    execFileSync('docker', args, { stdio: ['ignore', 'ignore', 'inherit'] });
}
