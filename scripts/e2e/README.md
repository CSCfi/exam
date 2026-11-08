<!--
SPDX-FileCopyrightText: 2026 The members of the EXAM Consortium

SPDX-License-Identifier: EUPL-1.2
-->

# Exam-day GUI test

A Playwright test of the student's exam day, run against the docker compose stack before
releases: [tests/student-exam-day.spec.ts](tests/student-exam-day.spec.ts).

It covers what unit and integration tests cannot: the redirects driven by the session
reservation headers (see "Session response headers" in CLAUDE.md). A student with an ongoing
reservation must land in the exam without the dashboard ever showing, an early login to an
Aquarium exam must stay on the early-login page, a login shortly before the start must wait in
the waiting room and move into the exam on time, a login on the wrong machine or in the wrong
room or on a computer that is not an exam machine must show where the reservation is, an ongoing
Safe Exam Browser exam opened in a plain browser must show the SEB notice, and an exam machine
without an exam today must show the empty waiting room. Along the way it checks autosave, reloading during the exam, and submitting.

Other flows (grading, booking, publishing) were tried as GUI tests too, but the integration
tests cover them better and the GUI versions were costly to keep working, so only this one is
kept. IOP, a real SEB client and exploratory testing stay manual.

## Running

Once per machine: `pnpm install` and `pnpm exec playwright install chromium`. Docker Compose v2
(`docker compose`) is needed.

```bash
scripts/e2e/run.sh
```

This rebuilds the image from the current checkout, recreates the database, seeds it and runs the
test (under three minutes, mostly waiting for autosave, which runs once a minute, plus the
image build). `E2E_NO_BUILD=1 scripts/e2e/run.sh` reuses the existing image when only the test
or the seed changed. Extra
arguments go to Playwright, e.g. `scripts/e2e/run.sh --headed` to watch, or `--ui` to step
through. On a failure, `pnpm exec playwright show-report scripts/e2e/playwright-report` shows the
trace, screenshot and video.

- **Database port.** The stack's Postgres is published on `EXAM_DB_PORT` (default 5433 in
  `run.sh`), so it can run next to a local Postgres on 5432. The seed and the tests reach the
  database through the container (`docker exec exam-postgres psql`), never through a host port,
  so a local development database cannot be touched.
- **Timing.** Reservations are seeded relative to `now()` (the ongoing ones started 5 minutes
  ago, the upcoming ones start in 90 minutes; the waiting-room test moves its own start to 20
  seconds after its login). Don't run within ~2 hours of midnight.
- **Machine IP.** The seeded exam machine E2E-PC-01 has the nginx container's IP, which is what
  Play sees for browser requests, so the browser counts as being on that machine. E2E-PC-02 (same
  room) and E2E-PC-03 (*E2E Other Room*) have unused documentation IPs and only carry
  reservations. The not-an-exam-machine tests move E2E-PC-01 to another IP for their duration.
- **App restart.** The last test (a visitor from another organisation) needs
  `homeOrganisations` set, which is only read at startup: it copies `visitor.conf` into the
  container as `/app/conf/e2e-override.conf` and restarts the app (about 10 seconds). The
  stack stays in that state after the run; the next `run.sh` recreates it. For this, `run.sh`
  adds `compose.yml`, which starts the app with `app.conf`: the normal `conf/docker.conf` plus
  that file when present, so the shipped configuration has no test hooks.

## Seeded accounts

All passwords are `e2e`. DEBUG login with the username only (the app appends `@funet.fi`).

| Username | Role | State |
|---|---|---|
| `e2e-admin` | admin | — |
| `e2e-teacher` | teacher | owns *E2E Published Exam* and *E2E SEB Exam* |
| `e2e-ongoing` | student | reservation in progress now |
| `e2e-waiting` | student | reservation the test moves to start right after login, with a 5 s start delay |
| `e2e-upcoming` | student | reservation later today |
| `e2e-wrongmachine` | student | reservation in progress on E2E-PC-02 |
| `e2e-wrongroom` | student | reservation in progress in *E2E Other Room* |
| `e2e-elsewhere` | student | reservation in progress on E2E-PC-02, logs in from a non-exam computer (as a local user, then as a visitor) |
| `e2e-early-elsewhere` | student | reservation on E2E-PC-02 later today, logs in from a non-exam computer |
| `e2e-seb` | student | SEB exam event in progress |
| `e2e-booker` | student | enrolled, no reservation |

## Changing the test

- Select by role, label or visible English text (`getByRole('button', { name: 'Save changes' })`),
  or by an element id where the form has one. Add a `data-testid` only when nothing else is
  unambiguous.
- Wait for what the user would wait for (a notice, a route, the autosave text), never a fixed
  sleep, except where waiting itself is the point (the early-login page must not redirect).
- After logging out, `login()` reloads the page: the form a logout leaves behind has no CSRF
  token, and a login from it fails silently.

## Findings from the first full run (2026-11-07)

Application issues seen while writing the GUI tests (including the ones no longer kept):

- **Settings creation fails on a fresh database.** Evolution 58 inserts `general_settings` rows
  1 and 2 with explicit ids without advancing `general_settings_seq`, so the first two settings
  the application creates collide (`pk_general_settings`); the calendar fails twice before
  working. Affects new installations only. Fix: an evolution advancing the sequence past
  `max(id)`. Until then `seed.sql` does that itself.
- **DEBUG login after logout fails silently** until the page is reloaded (no CSRF token on the
  left-behind form). Development login only; Haka login reloads the page anyway.
- **Editor placeholder in Finnish** with an `EN` suffix (*Kirjoita tai lisää tekstisisältö
  tänne EN*) in the English UI: exam answer, assessment feedback and question editors.
- **A room without a mail address breaks booking:** `selected-room.component.ts` reads
  `room().mailAddress.street` without a null check; the template error stops the calendar from
  rendering. Rooms created in admin get an address, so mostly a robustness issue.
- **Typo in a notice:** *Results have been sent succesfully* (`i18n_results_send_ok`).
- **"Your exam time has ended."** is the heading after submitting early; the text below
  (*Your exam paper has been submitted*) is right.
