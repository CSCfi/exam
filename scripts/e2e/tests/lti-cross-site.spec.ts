// SPDX-FileCopyrightText: 2026 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { expect, FrameLocator, Page, test, TestInfo } from '@playwright/test';
import { onNonExamComputer } from '../support/db';
import { login } from '../support/session';

// An LTI question launching a tool on another site than EXAM, as a university's Moodle is
// (lti.conf, lti-tool/server.mjs). Runs in Chromium, Firefox and WebKit: browsers differ in how
// they treat the cookies of a tool framed by another site, and EXAM's own session cookie on the
// tool's redirect back to EXAM.
//
// What EXAM promises in every browser:
// - The frame never shows an EXAM error: EXAM's part of the login works without its session
//   cookie (Firefox leaves it out of the tool's cross-site redirect back to EXAM), and the user
//   stays logged in to EXAM afterwards.
// - The frame shows the tool, or the tool's own "Cookies are blocked" notice when the browser
//   blocks the tool's cookies in a frame (Safari).
// - The launch in a new window, offered under the question, always works: there the tool is
//   first-party.
// Which of the two the frame shows is recorded as an annotation of the test, see the report.

const ToolFrame = 'iframe.lti-frame';

type FrameOutcome = 'launched' | 'cookies blocked';

async function frameOutcome(frame: FrameLocator): Promise<FrameOutcome> {
    const launched = frame.getByText(/^Launched as /);
    const blocked = frame.getByText('Cookies are blocked by your browser');
    await expect(launched.or(blocked)).toBeVisible();
    return (await launched.isVisible()) ? 'launched' : 'cookies blocked';
}

async function checkFrame(page: Page, testInfo: TestInfo, name: string, role: string): Promise<void> {
    const frame = page.frameLocator(ToolFrame);
    const outcome = await frameOutcome(frame);
    testInfo.annotations.push({ type: 'frame', description: `${testInfo.project.name}: ${outcome}` });
    if (outcome === 'launched') {
        await expect(frame.locator('#user')).toHaveText(`Launched as ${name}`);
        await expect(frame.locator('#roles')).toHaveText(`Roles: ${role}`);
        await expect(frame.locator('#target')).toHaveText('Shown in: iframe');
        await expect(frame.locator('#resource')).toHaveText('Resource: e2e-resource');
        const cookies = await frame.locator('#cookies').textContent();
        testInfo.annotations.push({
            type: 'tool cookies in frame',
            description: `${testInfo.project.name}: ${cookies}`,
        });
    }
    // The launch must not end the user's EXAM session: Firefox sends the tool's redirect back to
    // EXAM without EXAM's cookie, and once applied EXAM's answer clearing it (SystemFilter).
    const session = await page.request.get('/app/session');
    expect(session.status()).toBe(200);
    expect(await session.text()).toBe('');
}

async function checkWindow(page: Page, name: string, role: string): Promise<void> {
    const opened = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'Open in a new window' }).click();
    const popup = await opened;
    await expect(popup.locator('#user')).toHaveText(`Launched as ${name}`);
    await expect(popup.locator('#roles')).toHaveText(`Roles: ${role}`);
    await expect(popup.locator('#target')).toHaveText('Shown in: window');
    await expect(popup.locator('#resource')).toHaveText('Resource: e2e-resource');
    await popup.close();
}

test.describe.serial('LTI tool on another site', () => {
    test('a teacher previews the exam: the tool in the frame or a new window', async ({ page }, testInfo) => {
        await login(page, 'e2e-teacher');
        await expect(page).toHaveURL(/\/staff/);
        await page.goto('/staff/exams/990005/preview');
        await page.getByRole('button', { name: 'Move to Exam section 1: Section 1' }).click();
        await checkFrame(page, testInfo, 'Tiina Teacher', 'Instructor');
        await checkWindow(page, 'Tiina Teacher', 'Instructor');
    });

    test('a student in a home exam: the tool in the frame or a new window', async ({ page }, testInfo) => {
        await onNonExamComputer(async () => {
            await login(page, 'e2e-lti');
            await expect(page).toHaveURL(/\/exam\/[0-9a-f]{32}$/);
            await page.getByRole('button', { name: 'Move to Exam section 1: Section 1' }).click();
            await checkFrame(page, testInfo, 'Liisa Lti', 'Learner');
            await checkWindow(page, 'Liisa Lti', 'Learner');
        });
    });
});
