// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Measurement probes (probes/), kept out of the release test run. Run with
//   E2E_CONFIG=scripts/e2e/playwright.probe.config.ts scripts/e2e/run.sh
export default defineConfig({
    ...base,
    testDir: './probes',
    timeout: 15 * 60_000,
    use: {
        ...base.use,
        trace: 'off',
        video: 'off',
        launchOptions: { args: ['--js-flags=--expose-gc'] },
    },
});
