<!--
SPDX-FileCopyrightText: 2026 The members of the EXAM Consortium

SPDX-License-Identifier: EUPL-1.2
-->

# Student exam day

Covers the redirects driven by the session reservation headers (`x-exam-start-exam` and
`x-exam-upcoming-exam`, see `SystemFilter` and `examination.interceptor.ts`), the exam itself,
and submitting it. Unit tests cannot catch this class of regression: the header can be
correct while a competing navigation still sends the student to the dashboard.

**Preconditions:** fresh seed, run within ~50 minutes of seeding, browser on the seeded
machine IP (the default when going through nginx). Seeded exam hash:
`ccd815f473c4e8e6ac6ebc1fbf42dadd`.

## A. Ongoing reservation goes straight into the exam

1. Open <http://localhost>, log in as `e2e-ongoing` / `e2e`.
    - **Expect:** URL becomes `/exam/<hash>` within a few seconds. The dashboard must not
      be shown at all, not even briefly; if it is, note how long it stayed.
2. Look at the exam view; it opens on the instructions page. Open *Section 1*.
    - **Expect:** title *E2E Published Exam*, section *Section 1*, the essay question
      *Describe what a GUI playbook is.* and a running clock with roughly 55 minutes left
      (less if time has passed since seeding).
3. Type `Playbook answer 1` in the essay answer field. Wait until the line *The exam paper is
   automatically saved: HH:mm* appears (autosave runs every 60 seconds), then reload the page.
   The browser asks *Leave site?* on every reload during an exam; that is by design. Leave.
    - **Expect:** you are still in the exam after the reload (the URL now has the student's
      own exam hash), and after opening *Section 1* the answer text is still there.
4. Click **Save and submit** at the end of the exam and confirm the dialog.
    - **Expect:** URL becomes `/examination/logout` and the page says *Your exam paper has
      been submitted*. The session has ended.
5. Reload, and log in again as `e2e-ongoing`.
    - **Expect:** the exam does not re-open; the waiting room says *You have no exams for
      today*. Log out.

## B. Upcoming reservation lands in the waiting room

6. Log in as `e2e-upcoming` / `e2e`.
    - **Expect:** URL becomes `/early/990002/<hash>` (early login to an Aquarium exam), the
      page says *Your next exam is about to start* and gives the start time, about 90 minutes
      from when the seed ran.
7. Wait 60 seconds on the page.
    - **Expect:** you stay in the waiting room, with no redirect to the dashboard or the
      exam.
8. Log out.

## C. Exam machine with no exam today

9. Log in as `e2e-booker` / `e2e` (enrolled, but has no reservation).
    - **Expect:** URL becomes `/waitingroom` with no ids. This is the
      `x-exam-upcoming-exam: none` case.
10. Log out.

## Notes for the runner

- If step 1 shows the dashboard first and only redirects about 30 s later, that matches
  the `PING_INTERVAL` session check. In other words, the header was missing on login or the
  navigation was cancelled. Report it as FAIL even though the student eventually got in.
- Step 3 depends on autosave. If the answer is lost, also capture the network log for the
  answer save request.
