// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { expect, test } from '@playwright/test';
import { onNonExamComputer, sql } from '../support/db';
import { login } from '../support/session';

// A home exam (seeded "E2E Home Exam", taken on the student's own computer) with one exam event:
// registering picks the event in a dialog, and on the day the student waits in the waiting room
// from 5 minutes before the event until it starts. No exam machine is involved, so the browser is
// a non-exam computer throughout (on an exam machine, a student without an exam today only ever
// sees the empty waiting room).

test.describe.serial('Home exam', () => {
    test('registering for a home exam picks the exam event', async ({ page }) => {
        await onNonExamComputer(async () => {
            await login(page, 'e2e-home');
            await page.getByText('Exams', { exact: true }).filter({ visible: true }).click();
            await page.getByPlaceholder('Search').fill('E2E Home');
            const result = page
                .locator('xm-exam-search-result')
                .filter({ has: page.getByRole('heading', { name: 'E2E Home Exam' }) });
            await result.getByRole('button', { name: 'Register for the exam' }).click();

            const dialog = page.getByRole('dialog');
            await expect(dialog.getByText('Choose the exam event')).toBeVisible();
            await expect(dialog.getByText('E2E home event')).toBeVisible();
            await dialog.getByRole('button', { name: 'Select' }).click();

            await expect(page).toHaveURL(/\/dashboard$/);
            await expect(page.getByText('E2E Home Exam').first()).toBeVisible();
            await expect(page.getByText('E2E home event').first()).toBeVisible();
        });
    });

    test('on the day, the student waits for the event to start and then enters the exam', async ({ page }) => {
        // The event starts shortly after login. Registration gave the enrolment a random start delay
        // of up to 30 s; a fixed 3 s here.
        sql(`UPDATE examination_event SET start = now() + interval '20 seconds' WHERE id = 990002`);
        sql(`UPDATE exam_enrolment SET delay = 3000 WHERE user_id = 990014 AND exam_id = 990004`);
        await onNonExamComputer(async () => {
            await login(page, 'e2e-home');
            await expect(page).toHaveURL(/\/waitingroom\/\d+\/[0-9a-f]{32}$/);
            await expect(page.getByText('E2E Home Exam')).toBeVisible();
            await expect(page.getByText(/\d+ seconds until exam starts/)).toBeVisible({ timeout: 30_000 });
            await expect(page).toHaveURL(/\/exam\/[0-9a-f]{32}$/, { timeout: 20_000 });
            await expect(page.getByText('Move to Exam section 1')).toBeVisible();
        });
    });
});
