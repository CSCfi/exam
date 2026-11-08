// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { expect, type Page, test } from '@playwright/test';
import { sql } from '../support/db';
import { accept, login, logout } from '../support/session';
import { restartAppWith } from '../support/stack';

// The redirects driven by the session reservation headers (x-exam-start-exam,
// x-exam-upcoming-exam, x-exam-aquarium-login, x-exam-wrong-machine, x-exam-wrong-room,
// x-exam-wrong-agent-config; see SystemFilter and examination.interceptor.ts), the exam itself
// and submitting it. Unit tests cannot catch this class of regression: the header can be right
// while a competing navigation still sends the student to the dashboard.
// Seeded exam hash: ccd815f473c4e8e6ac6ebc1fbf42dadd.

const EXAM_URL = /\/exam\/[0-9a-f]{32}$/;

// Every browser request comes from E2E-PC-01's IP; moving that machine elsewhere makes the browser
// a computer that is not an exam machine
// A row of the where-you-are / your-reservation table on the wrong-location page
async function expectLocationRow(
    page: Page,
    label: 'Computer' | 'Exam room',
    here: string,
    reserved: string,
    mismatch: boolean,
): Promise<void> {
    const cells = page.getByRole('row', { name: new RegExp(`^${label}`) }).getByRole('cell');
    await expect(cells.nth(0)).toContainText(here);
    await expect(cells.nth(1)).toContainText(reserved);
    const marker = 'Does not match your reservation';
    await (mismatch ? expect(cells.nth(0)).toContainText(marker) : expect(cells.nth(0)).not.toContainText(marker));
}

async function onNonExamComputer(run: () => Promise<void>): Promise<void> {
    const machineIp = sql(`SELECT ip_address FROM exam_machine WHERE id = 990001`);
    sql(`UPDATE exam_machine SET ip_address = '192.0.2.1' WHERE id = 990001`);
    try {
        await run();
    } finally {
        sql(`UPDATE exam_machine SET ip_address = '${machineIp}' WHERE id = 990001`);
    }
}

test.describe.serial('Student exam day', () => {
    test('a login shortly before the start waits in the waiting room, then enters the exam', async ({ page }) => {
        // Starts shortly after login, so the wait is about 15 seconds (login itself takes a few).
        // Each enrolment gets a random start delay of up to 30 s to spread the load
        // (ExamEnrolment.setRandomDelay); a fixed 5 s here.
        sql(`UPDATE reservation SET start_at = now() + interval '20 seconds' WHERE id = 990005`);
        sql(`UPDATE exam_enrolment SET delay = 5000 WHERE id = 990006`);
        await login(page, 'e2e-waiting');
        await expect(page).toHaveURL(/\/waitingroom\/990006\/[0-9a-f]{32}$/);
        await expect(page.getByText('Your next exam is about to start')).toBeVisible();
        await expect(page.getByText('E2E Published Exam')).toBeVisible();
        await expect(page.getByText('You will be directed to the exam when the exam time starts')).toBeVisible();

        // At the reservation start the page counts down the delay, then checks the session, whose
        // x-exam-start-exam header moves the student into the exam
        await expect(page.getByText(/\d+ seconds until exam starts/)).toBeVisible({ timeout: 30_000 });
        const countdownShown = Date.now();
        await expect(page).toHaveURL(/\/waitingroom\//);
        await expect(page).toHaveURL(EXAM_URL, { timeout: 20_000 });
        expect(Date.now() - countdownShown, 'entered the exam before the delay was over').toBeGreaterThan(3_500);
        await expect(page.getByText('Move to Exam section 1')).toBeVisible();
    });

    test('an ongoing reservation goes straight into the exam, which autosaves and submits', async ({ page }) => {
        const visited: string[] = [];
        page.on('framenavigated', (frame) => {
            if (frame === page.mainFrame()) visited.push(frame.url());
        });

        await login(page, 'e2e-ongoing');
        await expect(page).toHaveURL(EXAM_URL);
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
        await expect(page).toHaveURL(EXAM_URL);
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

    test('a login on the wrong machine of the reserved room shows the reserved machine', async ({ page }) => {
        await login(page, 'e2e-wrongmachine');
        await expect(page).toHaveURL(/\/wrongmachine\/990004\/990001$/);
        await expect(page.getByText('You have logged in to a wrong computer')).toBeVisible();
        await expectLocationRow(page, 'Computer', 'E2E-PC-01', 'E2E-PC-02', true);
        await expectLocationRow(page, 'Exam room', 'E2E Aquarium (E2E-1)', 'E2E Aquarium (E2E-1)', false);
        await expect(page.getByRole('alert').getByRole('button', { name: 'Log out' })).toBeVisible();
    });

    test('a login in the wrong room shows the reserved room', async ({ page }) => {
        await login(page, 'e2e-wrongroom');
        await expect(page).toHaveURL(/\/wrongroom\/990005\/990001$/);
        await expect(page.getByText('You have logged in to a wrong computer')).toBeVisible();
        await expectLocationRow(page, 'Computer', 'E2E-PC-01', 'E2E-PC-03', true);
        await expectLocationRow(page, 'Exam room', 'E2E Aquarium (E2E-1)', 'E2E Other Room (E2E-2)', true);
    });

    test('a login on a computer that is not an exam machine shows where the exam is', async ({ page }) => {
        await onNonExamComputer(async () => {
            await login(page, 'e2e-elsewhere');
            // A local user gets a notice (WrongLocationService.display); others go to /unknownlocation
            await expect(
                page.getByText(
                    'You have an ongoing exam at: Test campus, Test building in E2E-1 on computer E2E-PC-02',
                ),
            ).toBeVisible();
            await expect(page).not.toHaveURL(EXAM_URL);
        });
    });

    test('a login on a computer that is not an exam machine before the exam shows when and where', async ({ page }) => {
        // The toast shows the start in the room's time zone, hour without a leading zero or with one
        const [hour, minute] = sql(
            `SELECT to_char(start_at AT TIME ZONE 'Europe/Helsinki', 'FMHH24:MI') FROM reservation WHERE id = 990007`,
        ).split(':');
        await onNonExamComputer(async () => {
            await login(page, 'e2e-early-elsewhere');
            // The other branch of WrongLocationService.display: a warning, since the exam is ahead
            await expect(
                page.getByText(
                    new RegExp(
                        `^Your exam starts at 0?${hour}:${minute} \\(Europe/Helsinki\\) at Test campus: Test building, ` +
                            'in E2E-1 on computer E2E-PC-02$',
                    ),
                ),
            ).toBeVisible();
            await expect(page).not.toHaveURL(/\/(exam|early|waitingroom)\//);
        });
    });

    test('an ongoing SEB exam in a plain browser shows the SEB notice and does not open', async ({ page }) => {
        await login(page, 'e2e-seb');
        // No SEB config key header, so the server withholds x-exam-start-exam
        await expect(page.getByText(/You have a Safe Exam Browser exam going on/)).toBeVisible();
        await expect(page).not.toHaveURL(EXAM_URL);
    });

    test('an exam machine with no exam today shows the empty waiting room', async ({ page }) => {
        await login(page, 'e2e-booker');
        await expect(page).toHaveURL(/\/waitingroom$/);
        await expect(page.getByText('You have no exams for today')).toBeVisible();
        await logout(page);
    });

    // Last: it restarts the app with a setting the other tests must not see
    test('a non-local user on a computer that is not an exam machine is sent to /unknownlocation', async ({ page }) => {
        // Every user counts as a visitor from another organisation from here on (see visitor.conf)
        await restartAppWith(page.request, 'visitor.conf');
        await onNonExamComputer(async () => {
            await login(page, 'e2e-elsewhere');
            // A visitor first confirms logging in to another organisation's EXAM
            await expect(page.getByText('You are logging into service: EXAM (e2e.invalid)')).toBeVisible();
            await accept(page);
            await expect(page).toHaveURL(/\/unknownlocation\/990008$/);
            await expect(page.getByText('You have logged in to a wrong computer')).toBeVisible();
            await expectLocationRow(page, 'Computer', 'Unknown machine', 'E2E-PC-02', true);
            await expectLocationRow(page, 'Exam room', '–', 'E2E Aquarium (E2E-1)', false);
        });
    });
});
