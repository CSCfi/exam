<!--
SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium

SPDX-License-Identifier: EUPL-1.2
-->

# IOP protocol versions

EXAM installations exchange JSON with each other through XM: collaborative exams and their
attempts, visiting students' exams, attempts sent back home, facilities and reservations.
Organisations upgrade EXAM on their own schedule, so installations of different versions talk to
each other all the time. This document describes how changes to that JSON (the *wire format*) are
caught, versioned and bridged.

Epic: CSCEXAM-1733.

## The pieces

| What | Where | Role |
|---|---|---|
| `IopProtocol.Version` | `app/services/iop/IopProtocol.scala` | Number of the current wire format. Bumped only when a payload changes shape. |
| Version headers | `IopAwareWSClient`, `SystemFilter` | Every request to XM and every `/integration/iop` response carries `X-Iop-Protocol`, `X-Exam-Version` and `X-Exam-Org`. |
| `IopPayloads` | `app/services/iop/IopPayloads.scala` | Builds everything EXAM sends to other installations. Changing its output changes the protocol. |
| Payload fixtures | `test/resources/iop-fixtures/v<N>/` | What installations running protocol N send. One directory per version. |
| `IopPayloadFixturesSpec` | `test/iop/` | Compares the current payloads with the current version's fixtures, and parses every version's fixtures the way a receiving installation does. |
| Version record | XM, `organisations/versions` CouchDB view | Which protocol and EXAM version each organisation last announced. |
| Translation steps | XM, `src/migration/` | Convert payloads between versions, so old and new installations understand each other. |
| XM fixture tests | XM, `src/test/fixtures/`, `src/test/ut/fixtures.spec.ts` | The same fixtures run through XM's translations, with the results kept as snapshots. |

An installation that sends no version header (anything older than EXAM 7.1) counts as protocol 0.

## What counts as a wire format change

Anything that changes what `IopPayloads` produces, for example:

- renaming, removing or retyping a field of a model that is sent (`Exam`, `ExamSection`,
  `Question`, `ExamParticipation`, `ExamRoom`, `ExternalExam`, …)
- adding or removing a relation in one of the path properties in `IopPayloads`
- changing a hand-built payload such as the reservation request

Adding a field is a change too: older installations ignore it, but it is still part of what newer
ones send and rely on.

You don't need to spot these yourself. `IopPayloadFixturesSpec` fails when one happens.

## When `IopPayloadFixturesSpec` fails

The failure says which payload no longer matches its fixture. First decide whether the change was
intended.

**Not intended** (for example, a relation added to a path property without thinking of IOP): fix
the code so the payload matches the fixture again. Nothing else to do.

**Intended:** follow these steps.

1. **Bump the version.** In `IopProtocol.scala`, increase `Version` by one (say 1 → 2).

2. **Generate the new fixtures.**

   ```bash
   IOP_FIXTURES_UPDATE=1 sbt "testOnly iop.IopPayloadFixturesSpec"
   ```

   In fish: `env IOP_FIXTURES_UPDATE=1 sbt "testOnly iop.IopPayloadFixturesSpec"`.

   This runs only the fixture spec, in write mode: it writes the current payloads to
   `test/resources/iop-fixtures/v2/` and then fails on purpose, so the new files can't slip
   through unnoticed. `v1/` is left untouched.

3. **Review the change.** `diff -r test/resources/iop-fixtures/v1 test/resources/iop-fixtures/v2`
   shows exactly how the wire format changed. This is the protocol's change log.

4. **Commit and rerun.** Commit `v2/` together with the code change and the version bump. A
   normal run of the spec is green again.

5. **Copy the fixtures to XM.** Once the branch is pushed, in the XM repository:

   ```bash
   pnpm run sync-fixtures <branch>     # without a branch: EXAM's dev
   ```

   This copies `v2/` into XM's `src/test/fixtures/`. It never changes a version XM already has.

6. **Add the translation step in XM** (`src/migration/`), so that protocol 1 and protocol 2
   installations understand each other. XM's `fixtures.spec.ts` picks up `v2/` automatically and
   writes snapshots for it on the first run; review them like code.

7. **Deploy XM before the EXAM release.** The translation must be live before any organisation
   upgrades to the new EXAM.

## Write modes of the fixture spec

| `IOP_FIXTURES_UPDATE` | Behaviour |
|---|---|
| not set | Compare the payloads with the current version's fixtures. The normal test run. |
| `1` | Write the fixtures of the current version, then fail on purpose. Refuses if that version already has fixtures: bump `IopProtocol.Version` first. |
| `overwrite` | Replace the current version's fixtures. Only for a version that has not been released yet, e.g. while still working on v2 before its release. |

## Why old fixture directories are kept

Each `v<N>/` directory records what installations still running protocol N send. They are never
regenerated:

- EXAM's spec parses every version's fixtures, proving that newer code still reads payloads from
  older installations.
- XM tests each translation step against real payloads from both ends of the step.

A directory is removed together with its translation step in XM, once no organisation has
announced that version for a long time and the consortium's upgrade deadline has passed
(CSCEXAM-1738). Check the `organisations/versions` view in XM's CouchDB for which versions are
still in use:

```
GET /<database>/_design/organisations/_view/versions
```

Rows are keyed by `[protocol, organisation id]`; organisations that never announced a version
sort first as protocol 0.

## Known limits

- The inbound check verifies structure (the exam's name, sections and questions survive parsing),
  not every field. The outbound comparison is what catches field-level changes.
- Copying fixtures to XM is a manual step (`pnpm run sync-fixtures`), done when the version is
  bumped.
