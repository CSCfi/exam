<!--
SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium

SPDX-License-Identifier: EUPL-1.2
-->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

EXAM is an electronic exam platform for higher education built as a full-stack monolith:

- **Backend**: Scala 3 + Play Framework 3 + Ebean ORM, served on port 9000
- **Frontend**: Angular 21 + TypeScript, served on port 4200 in dev, built to `./public` for production
- **Database**: PostgreSQL 16 with HikariCP connection pooling

## Code style

Follow the project formatters exactly — run them to verify if unsure.

- **Frontend** (Prettier, `.prettierrc.yaml`): single quotes, semicolons, trailing commas, 4-space indent, 120-char line width, imports organized via `prettier-plugin-organize-imports`.
- **Backend** (ScalaFmt, `.scalafmt.conf`): Scala 3 dialect, 100-char line width, `align.preset = more`, newlines preserved as written.

## Commands

### Backend (run from repo root)

```bash
sbt test                                    # all backend tests
sbt "testOnly assessment.ReviewControllerSpec"  # single test class
sbt "testOnly *ReviewControllerSpec"        # wildcard test match
sbt scalafmtAll                             # format Scala
sbt scalafmtCheckAll                        # check formatting (CI)
sbt "scalafixAll --check"                   # lint check (CI)
```

Start backend in dev mode (port 9000, debugger on 9999):

```bash
sbt -Dconfig.file=conf/dev.conf -jvm-debug 9999 -mem 2048
# Then at the sbt prompt:
[exam] $ run
```

### Frontend (run from repo root)

```bash
pnpm install           # install dependencies
pnpm start             # dev server on port 4200
pnpm build             # production build to ../public
pnpm test              # run Vitest tests (headless)
pnpm run check-format  # Prettier check (CI)
pnpm run check-lint    # ESLint check (CI)
pnpm run lint          # ESLint with --fix
pnpm run format        # Prettier format
```

Run a single frontend test file:

```bash
pnpm test --run -- path/to/file.spec.ts
```

## Architecture

### Backend structure (`app/`)

Organized into **features** (controllers + business logic) and **services** (shared utilities):

- `app/backend/` — main package root
    - `controllers/` — Play HTTP controllers, one subdirectory per feature (`exam/`, `assessment/`, `enrolment/`, `examination/`, `question/`, `user/`, `facility/`, `iop/`, etc.)
    - `models/` — Ebean entity classes shared across features
    - `services/` — shared utilities: email, CSV/Excel export, datetime, file handling, caching
    - `security/` — authentication and authorization filters
    - `system/` — Play module wiring and lifecycle hooks

Key config files: `conf/application.conf`, `conf/dev.conf`, `conf/routes`.  
Database migrations live in `conf/evolutions/default/`.

### Frontend structure (`ui/src/app/`)

Feature modules under `ui/src/app/`:

- `exam/` — exam creation, editing, publishing
- `examination/` — student exam-taking experience (hash-based enrollment)
- `enrolment/` — student enrollment and calendar scheduling
- `assessment/` — teacher grading and feedback
- `question/` — question bank management (library, preview)
- `facility/` — room and facility management
- `calendar/` — examination event scheduling (FullCalendar)
- `iop/` — inter-organizational protocol (external/collaborative exams)
- `shared/` — reusable components, pipes, directives

Global concerns:

- `app.interceptor.ts` — CSRF token injection on all mutating requests
- `app.module.ts` — root module, route guards, providers
- Translations: `assets/i18n/{en,fi,sv}.json`

### Data flow

The Angular frontend calls Play REST endpoints defined in `conf/routes`. Controllers validate and delegate to services; Ebean models map to PostgreSQL via JPA-style annotations. JSON serialization uses Gson on the backend with custom serializers for complex types.

### IOP (Inter-Organizational Protocol)

The `iop/` feature on both ends supports collaborative and external exams between institutions. External exam state is synchronized via REST calls to partner institutions. Models for this are prefixed `External*` (e.g. `ExternalExam`, `ExternalReservation`).

### CKEditor custom plugins

Two custom CKEditor plugins live in `ui/src/app/shared/ckeditor/plugins/`: `clozetest` (fill-in-the-blank questions) and `math` (formula editing).

**Translations**: Angular's `@angular/build:application` uses esbuild and has no loader for `.po` files, so CKEditor's standard `.po`-based translation pipeline doesn't work here. Translations for custom plugins are instead exported as plain TypeScript objects in `plugins/<name>/lang/translations/{en,fi,sv}.ts`. The app's general i18n strings live in `assets/i18n/{en,fi,sv}.json` as usual.

## Dev setup notes

The quickest local setup uses Docker Compose (see `DOCKER.md`) to get PostgreSQL running, then start the backend and frontend separately. Dev database credentials: `exam`/`exam`.

The backend auto-applies Ebean evolutions on startup in dev mode. If evolution conflicts arise, check `conf/evolutions/default/`.
