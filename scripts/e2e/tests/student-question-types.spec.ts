// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { expect, Page, test } from '@playwright/test';
import { onNonExamComputer } from '../support/db';
import { accept, login } from '../support/session';

// Answering each auto-scored question type and the automatic grade (seeded exam "E2E Auto-graded
// Exam"). Multiple choice, weighted and claim choice answers save on click; the cloze blanks are
// inputs the server generates from the cloze editor's markup when the exam starts. Auto-evaluation
// with immediate release grades the exam on submit.
//
// Expected score: multiple choice 2/2 + weighted 2/2 + claim 1/1 + cloze 1/2 (one blank wrong)
// = 6/7 = 85.7 %, which is grade 4 (grade limits 50/60/70/80/90 %).

const EXAM_URL = /\/exam\/[0-9a-f]{32}$/;

async function answerSaved(page: Page): Promise<void> {
    await expect(page.getByText('The exam paper is saved').first()).toBeVisible();
}

test('every question type can be answered and the exam is graded automatically on submit', async ({ page }) => {
    await login(page, 'e2e-answers');
    await expect(page).toHaveURL(EXAM_URL);
    await page.getByText('Move to Exam section 1').click();

    await page.getByRole('radio', { name: 'Right answer' }).check();
    await answerSaved(page);
    await page.getByRole('checkbox', { name: 'Good answer A' }).check();
    await page.getByRole('checkbox', { name: 'Good answer B' }).check();
    await page.getByRole('radio', { name: 'True' }).check();

    // The text blank renders as a text input, the numeric one as a number input (the only cloze
    // question and the only Save button on the page)
    const textBlank = page.getByRole('textbox', { name: 'cloze test answer' });
    const numberBlank = page.getByRole('spinbutton', { name: 'cloze test answer' });
    // The collapse button is named after the question, for a cloze question too (once read "null")
    await expect(page.getByRole('button', { name: /^Collapse Question The capital of Finland is\b/ })).toBeVisible();
    await textBlank.fill('helsinki');
    await numberBlank.fill('5');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await answerSaved(page);

    // Everything was saved, not just shown: reload (the exam view asks "Leave site?")
    page.on('dialog', (dialog) => dialog.accept());
    await page.reload();
    await page.getByText('Move to Exam section 1').click();
    await expect(page.getByRole('radio', { name: 'Right answer' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Good answer A' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Good answer B' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Bad answer' })).not.toBeChecked();
    await expect(page.getByRole('radio', { name: 'True' })).toBeChecked();
    await expect(textBlank).toHaveValue('helsinki');
    await expect(numberBlank).toHaveValue('5');

    await page.getByRole('button', { name: 'Save and submit' }).click();
    await accept(page);
    await expect(page).toHaveURL(/\/examination\/logout/);

    // On the exam machine every page leads back to the waiting room, so look from elsewhere
    await onNonExamComputer(async () => {
        await login(page, 'e2e-answers');
        await page.getByText('Study attainments', { exact: true }).filter({ visible: true }).click();
        await page.getByRole('button', { name: 'Show feedback' }).click();
        await expect(page.getByText(/The grade is generated automatically and is not final/)).toBeVisible();
        await expect(feedbackValue(page, 'Exam grade')).toHaveText('4');
        await expect(feedbackValue(page, 'Total score')).toHaveText('6 / 7');
    });
});

function feedbackValue(page: Page, label: string) {
    return page
        .locator('.exam-feedback-field')
        .filter({ has: page.locator('.exam-feedback-label', { hasText: `${label}:` }) })
        .locator('.exam-feedback-value');
}
