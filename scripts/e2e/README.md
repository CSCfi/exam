<!--
SPDX-FileCopyrightText: 2026 The members of the EXAM Consortium

SPDX-License-Identifier: EUPL-1.2
-->

# GUI playbooks

Scenario-level GUI regression tests, written so that either a human or a browser agent
(Claude in Chrome) can execute them against a running EXAM instance. They replace the
repeatable part of manual pre-release clicking. They do **not** cover IOP, SEB/BYOD or
exploratory testing of new features — those stay manual.

| Playbook | Role | Covers |
|---|---|---|
| [student-exam-day](playbooks/student-exam-day.md) | student | login redirect headers → exam / waiting room → submit → logout |
| [student-booking](playbooks/student-booking.md) | student | enrolment → calendar → reservation on dashboard |
| [teacher-create-publish](playbooks/teacher-create-publish.md) | teacher | new exam → editor tabs → publish |
| [teacher-grade](playbooks/teacher-grade.md) | teacher | review a submitted exam → grade → lock |

## Setup

1. Start a fresh stack (the seed refuses to run twice; `down -v` wipes the database):

    ```bash
    docker compose down -v && docker compose up -d --build
    ```

    If a local Postgres already listens on 5432 (e.g. your dev database), give the stack another
    port, and use that port in every `psql` command below and in the playbooks:

    ```bash
    EXAM_DB_PORT=5433 docker compose up -d --build
    ```

    Never run the seed against your dev database.

    Wait until `exam-app` is healthy, so that evolutions have been applied.

2. Find the IP address Play sees for browser requests. Behind nginx this is the nginx
   container, not your browser, because Play only trusts forwarded headers from localhost:

    ```bash
    docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' exam-nginx
    ```

3. Seed (machine IP from step 2):

    ```bash
    psql -h localhost -p ${EXAM_DB_PORT:-5432} -U exam -d exam --single-transaction \
        -v ON_ERROR_STOP=1 -v machine_ip=<ip> -f scripts/e2e/seed.sql
    ```

    Reservations are created relative to `now()`: the ongoing one started 5 minutes ago and
    the upcoming one starts in 90 minutes. Run the exam-day playbook within ~50 minutes of
    seeding and do not seed within ~2 hours of midnight.

4. Open <http://localhost> — the DEBUG login form appears.

After logging out, **reload the page before the next login.** The form left behind by a logout
has no CSRF token, and a login from it fails silently (403 in the app log).

## Seeded accounts

All passwords are `e2e`. Log in with the username only (the app appends `@funet.fi`).

| Username | Role | State |
|---|---|---|
| `e2e-admin` | admin | — |
| `e2e-teacher` | teacher | owns *E2E Published Exam* |
| `e2e-ongoing` | student | reservation in progress now |
| `e2e-upcoming` | student | reservation later today |
| `e2e-booker` | student | enrolled, no reservation |

## Running with Claude in Chrome

Ask Claude to "run scripts/e2e/playbooks/<name>.md against http://localhost and record a GIF".
For each step the agent should report PASS/FAIL against the **Expect** line and stop at the
first FAIL with a screenshot and the browser console. Expected results are the contract: when
the UI changes on purpose, update the playbook in the same commit.

## Writing playbooks

- One user journey per file, with numbered steps and an explicit **Expect** for each step
  (URL, visible text or state). Without an Expect a step cannot fail.
- Refer to buttons by their English label and say where on the page they are; don't rely on
  CSS selectors.
- State preconditions as seeded accounts, or as the playbook that must run first.

## Findings from the first full run (2026-11-07)

All four playbooks pass after updating them to the current UI. Application issues seen on the
way, not fixed by the playbooks:

- **Settings creation fails on a fresh database.** Evolution 58 inserts `general_settings` rows
  1 and 2 with explicit ids without advancing `general_settings_seq`, so the first two settings
  the application creates collide (`pk_general_settings`); the calendar fails twice before
  working. Affects new installations only. Fix: an evolution advancing the sequence past
  `max(id)`.
- **DEBUG login after logout fails silently** until the page is reloaded (no CSRF token on the
  left-behind form). Development login only; Haka login reloads the page anyway.
- **Editor placeholder in Finnish** with an `EN` suffix (*Kirjoita tai lisää tekstisisältö
  tänne EN*) in the English UI: exam answer, assessment feedback and question editors.
- **"Your exam time has ended."** is the heading after submitting early; the text below
  (*Your exam paper has been submitted*) is right.
