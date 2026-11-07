// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { expect, test } from '@playwright/test';
import { accept, login, logout } from '../support/session';

// The redirects driven by the session reservation headers (x-exam-start-exam,
// x-exam-upcoming-exam, x-exam-aquarium-login; see SystemFilter and examination.interceptor.ts),
// the exam itself and submitting it. Unit tests cannot catch this class of regression: the header
// can be right while a competing navigation still sends the student to the dashboard.
// Seeded exam hash: ccd815f473c4e8e6ac6ebc1fbf42dadd. Runs within ~50 minutes of seeding.

test.describe.serial('Student exam day', () => {
    test('an ongoing reservation goes straight into the exam, which autosaves and submits', async ({ page }) => {
        const visited: string[] = [];
        page.on('framenavigated', (frame) => {
            if (frame === page.mainFrame()) visited.push(frame.url());
        });

        await login(page, 'e2e-ongoing');
        await expect(page).toHaveURL(/\/exam\/[0-9a-f]{32}$/);
        expect(
            visited.filter((url) => url.includes('/dashboard')),
            'dashboard shown before the exam',
        ).toEqual([]);

        // The exam opens on its instructions page
        await expect(page.getByText('E2E Published Exam').first()).toBeVisible();
        await page.getByText('Move to Exam section 1').click();
        await expect(page.getByText('Describe what a GUI playbook is.')).toBeVisible();

        await page.locator('.ck-editor__editable').first().click();
        await page.keyboard.type('Playbook answer 1');
        // Autosave runs once a minute
        await expect(page.getByText(/The exam paper is automatically saved/)).toBeVisible({ timeout: 75_000 });

        // The exam view always asks "Leave site?" on reload, by design
        page.on('dialog', (dialog) => dialog.accept());
        await page.reload();
        await expect(page).toHaveURL(/\/exam\/[0-9a-f]{32}$/);
        await page.getByText('Move to Exam section 1').click();
        await expect(page.locator('.ck-editor__editable').first()).toContainText('Playbook answer 1');

        await page.getByRole('button', { name: 'Save and submit' }).click();
        await accept(page);
        await expect(page).toHaveURL(/\/examination\/logout/);
        // Shown both on the page and as a notice
        await expect(page.locator('p', { hasText: 'Your exam paper has been submitted' })).toBeVisible();

        // The session has ended; logging in again must not reopen the exam
        await login(page, 'e2e-ongoing');
        await expect(page).toHaveURL(/\/waitingroom$/);
        await expect(page.getByText('You have no exams for today')).toBeVisible();
        await logout(page);
    });

    test('an early login to an Aquarium exam lands on the early-login page and stays there', async ({ page }) => {
        await login(page, 'e2e-upcoming');
        await expect(page).toHaveURL(/\/early\/990002\/[0-9a-f]{32}$/);
        await expect(page.getByText('Your next exam is about to start')).toBeVisible();
        // Longer than one session check (PING_INTERVAL, 30 s): no redirect may follow
        await page.waitForTimeout(35_000);
        await expect(page).toHaveURL(/\/early\/990002\/[0-9a-f]{32}$/);
        await logout(page);
    });

    test('an exam machine with no exam today shows the empty waiting room', async ({ page }) => {
        await login(page, 'e2e-booker');
        await expect(page).toHaveURL(/\/waitingroom$/);
        await expect(page.getByText('You have no exams for today')).toBeVisible();
        await logout(page);
    });
});
