// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { defineConfig, devices } from '@playwright/test';

// Runs against a freshly seeded stack, one test at a time (the exam-day steps depend on each
// other). Use run.sh rather than calling this directly, unless the stack is already up and
// freshly seeded.
export default defineConfig({
    testDir: './tests',
    outputDir: './test-results',
    workers: 1,
    fullyParallel: false,
    retries: 0,
    // The exam-day test waits for autosave, which runs once a minute
    timeout: 180_000,
    expect: { timeout: 15_000 },
    reporter: [['list'], ['html', { outputFolder: './playwright-report', open: 'never' }]],
    use: {
        baseURL: process.env.E2E_BASE_URL ?? 'http://localhost',
        locale: 'en-US',
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
