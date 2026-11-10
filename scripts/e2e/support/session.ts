// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { expect, Page } from '@playwright/test';

// DEBUG login form. Always starts from a clean slate and a fresh page load:
// - the form a logout leaves behind has no CSRF token, and a login from it fails silently
// - the frontend keeps the user in sessionStorage, so after a session ends server-side (e.g. on
//   submitting an exam) a stale entry makes the app act logged in and render a blank page
// Waits for the app to finish starting: clicking earlier submits the form natively (CSP blocks it).
export async function login(page: Page, username: string): Promise<void> {
    await page.context().clearCookies();
    await page.goto('/');
    await page.evaluate(() => {
        sessionStorage.clear();
        localStorage.clear();
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('Username').fill(username);
    await page.getByPlaceholder('Password').fill('e2e');
    await page.getByRole('button', { name: 'Log in' }).click();
}

export async function logout(page: Page): Promise<void> {
    // The menu exists twice (desktop and mobile); only one is visible
    await page.getByText('Log out', { exact: true }).filter({ visible: true }).click();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
}

// The app's own confirmation dialog (not a browser dialog)
export async function accept(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'Accept' }).click();
}
