// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { CDPSession, expect, Page, test } from '@playwright/test';
import { createWriteStream } from 'node:fs';
import { sql } from '../support/db';
import { login } from '../support/session';

// Memory probe, not a pass/fail test of behaviour: a student answers a two-section exam full of
// essay questions, switching sections back and forth, and after every round the page's memory
// is measured after a forced garbage collection. A page that only costs what its editors cost
// levels off after the first round or two; a leak keeps climbing round after round.
//
// The figures come from Chrome DevTools (Performance.getMetrics): JS heap, DOM nodes (all live
// ones, including detached nodes nothing has freed), documents and event listeners. Nodes that
// are alive but not in the page are reported separately as "detached", which is the usual
// fingerprint of a component or editor that was destroyed but is still referenced.

const SECTIONS = 2;
const ESSAYS_PER_SECTION = 12;
const ROUNDS = Number(process.env.PROBE_ROUNDS ?? 8);

test.setTimeout(15 * 60_000);

test.beforeAll(() => {
    if (sql(`SELECT count(*) FROM exam WHERE id = 990200`) !== '0') return; // seeded by an earlier run
    // On top of the release seed (run.sh recreates the database each run), with ids of its own
    sql(`
        BEGIN;
        INSERT INTO app_user (id, email, eppn, first_name, last_name, password, user_agreement_accepted,
                              object_version, language_id, user_identifier)
        VALUES (990200, 'e2e-memory@example.org', 'e2e-memory@funet.fi', 'Mikko', 'Muisti', md5('e2e'), true, 1,
                'en', 'e2e-0200');
        INSERT INTO app_user_role (app_user_id, role_id) VALUES (990200, 2);

        INSERT INTO exam (id, created, creator_id, modified, modifier_id, name, course_id, exam_type_id,
                          instruction, hash, period_start, period_end, duration,
                          object_version, grade_scale_id, execution_type_id, trial_count, state,
                          implementation, anonymous, grading_type, enroll_instruction, shared)
        VALUES (990200, now(), 990002, now(), 990002, 'E2E Essay Memory Exam', 990001, 2,
                '<p>Answer every essay.</p>', md5('e2e-exam-990200'), now() - interval '1 day',
                now() + interval '30 days', 180, 1, 1, 1, 1, 3, 1, false, 1, NULL, false);
        INSERT INTO exam_owner (exam_id, user_id) VALUES (990200, 990002);
        INSERT INTO exam_language (exam_id, language_code) VALUES (990200, 'en');

        INSERT INTO exam_section (id, created, creator_id, name, exam_id, object_version, sequence_number,
                                  lottery_on, lottery_item_count, optional, expanded)
        SELECT 990200 + s, now(), 990002, 'Essays ' || (s + 1), 990200, 1, s, false, 1, false, false
        FROM generate_series(0, ${SECTIONS - 1}) AS s;

        INSERT INTO question (id, created, creator_id, modified, modifier_id, question, state, default_max_score,
                              default_expected_word_count, object_version, type, default_evaluation_type, shared,
                              default_negative_score_allowed, default_option_shuffling_on)
        SELECT 990200 + q, now(), 990002, now(), 990002, '<p>Essay question ' || (q + 1) || '.</p>', 'SAVED', 10,
               100, 1, 2, 1, false, false, true
        FROM generate_series(0, ${SECTIONS * ESSAYS_PER_SECTION - 1}) AS q;
        INSERT INTO question_owner (question_id, user_id)
        SELECT 990200 + q, 990002 FROM generate_series(0, ${SECTIONS * ESSAYS_PER_SECTION - 1}) AS q;

        INSERT INTO exam_section_question (id, exam_section_id, question_id, sequence_number, creator_id, created,
                                           max_score, expected_word_count, evaluation_type, object_version,
                                           negative_score_allowed, option_shuffling_on)
        SELECT 990200 + q, 990200 + q / ${ESSAYS_PER_SECTION}, 990200 + q, q % ${ESSAYS_PER_SECTION}, 990002, now(),
               10, 100, 1, 1, false, true
        FROM generate_series(0, ${SECTIONS * ESSAYS_PER_SECTION - 1}) AS q;

        INSERT INTO reservation (id, start_at, end_at, machine_id, user_id, object_version, reminder_sent,
                                 sent_as_no_show)
        VALUES (990200, now() - interval '5 minutes', now() + interval '175 minutes', 990001, 990200, 1, false, false);
        INSERT INTO exam_enrolment (id, user_id, exam_id, reservation_id, enrolled_on, object_version,
                                    reservation_canceled, retrial_permitted, no_show, delay)
        VALUES (990200, 990200, 990200, 990200, now(), 1, false, false, false, 0);
        COMMIT;
    `);
});

type Sample = {
    round: number;
    heapMb: number;
    nodes: number;
    detachedNodes: number;
    documents: number;
    listeners: number;
    editors: number;
    ckBodies: number;
};

async function measure(page: Page, cdp: CDPSession, round: number): Promise<Sample> {
    // Let pending autosaves, timers and editor teardown settle before collecting
    await page.waitForTimeout(1_500);
    for (let i = 0; i < 3; i++) await cdp.send('HeapProfiler.collectGarbage');
    const { metrics } = await cdp.send('Performance.getMetrics');
    const metric = (name: string) => metrics.find((m) => m.name === name)?.value ?? 0;
    const inPage = await page.evaluate(() => ({
        attached: document.getElementsByTagName('*').length,
        editors: document.querySelectorAll('.ck-editor__editable').length,
        // CKEditor 5 puts each editor's floating UI (balloons, dropdowns) into the body collection
        ckBodies: document.querySelectorAll('.ck-body-wrapper > .ck-body').length,
    }));
    const nodes = metric('Nodes');
    return {
        round,
        heapMb: Math.round((metric('JSHeapUsedSize') / 1024 / 1024) * 10) / 10,
        nodes,
        detachedNodes: nodes - inPage.attached,
        documents: metric('Documents'),
        listeners: metric('JSEventListeners'),
        editors: inPage.editors,
        ckBodies: inPage.ckBodies,
    };
}

async function openSection(page: Page, index: number): Promise<void> {
    await page.locator('.toolbar-sections button').nth(index).click();
    await expect(page.locator('.ck-editor__editable')).toHaveCount(ESSAYS_PER_SECTION);
}

async function answerAll(page: Page, round: number): Promise<void> {
    const editors = page.locator('.ck-editor__editable');
    for (let i = 0; i < ESSAYS_PER_SECTION; i++) {
        const editor = editors.nth(i);
        await editor.click();
        await page.keyboard.press('End');
        await page.keyboard.type(` r${round}q${i}`, { delay: 15 });
    }
}

test('memory while answering essays and switching sections', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');

    await login(page, 'e2e-memory');
    await expect(page).toHaveURL(/\/exam\/[0-9a-f]{32}$/);
    const samples: Sample[] = [await measure(page, cdp, 0)];

    for (let round = 1; round <= ROUNDS; round++) {
        for (let s = 0; s < SECTIONS; s++) {
            await openSection(page, s);
            await answerAll(page, round);
        }
        samples.push(await measure(page, cdp, round));
    }

    console.table(samples);
    // PROBE_SNAPSHOT=<file> also writes a heap snapshot at the end, for finding what retains a leak
    if (process.env.PROBE_SNAPSHOT) {
        const out = createWriteStream(process.env.PROBE_SNAPSHOT);
        cdp.on('HeapProfiler.addHeapSnapshotChunk', ({ chunk }) => out.write(chunk));
        await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
        await new Promise((resolve) => out.end(resolve));
    }
    await test
        .info()
        .attach('memory.json', { body: JSON.stringify(samples, null, 2), contentType: 'application/json' });
});
