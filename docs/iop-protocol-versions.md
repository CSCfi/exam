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
| Write stamp | XM, `iopProtocol` on stored exams and assessments | Which protocol last wrote each stored document, so it can be translated from the right version. Unstamped (older) documents count as 0. |
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

**Except changes of meaning.** The fixtures catch changes in a payload's *shape*, not in what its
values mean. If a field keeps its name and type but changes its unit or interpretation (a
`duration` in seconds instead of minutes, a new meaning for a `state`, a new markup inside an HTML
field), the spec stays green. Such changes have to be recognised in code review, and the protocol
version bumped by hand.

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

## Changes that can't be translated

Some changes can't be bridged by a translation step at all. They come in three degrees:

1. **Untranslatable for some payloads only.** Example: a new grading type that an older version
   has no equivalent for. The step's lossy check refuses *starting* such an interaction ("the
   other organisation must upgrade"), while everything else between the two organisations keeps
   working and interactions already under way are still delivered (CSCEXAM-1737).

2. **A feature older versions don't have.** Example: a new question type in a collaborative exam.
   Translating is pointless; the feature is offered only where every party can handle it. Since
   XM records every organisation's protocol, EXAM can ask for the lowest protocol among the
   participants and hide or refuse the feature when someone is too old. This switches on by
   itself as organisations upgrade, unlike a hand-set feature flag. (Not built yet: it needs a
   small XM endpoint returning the lowest protocol of given organisations.)

3. **A change of meaning that older versions can't understand.** No translation or hiding helps;
   this needs control outside the wire format:
   - a cut-over date and upgrade deadline agreed in the consortium, aligned with the upgrade
     windows
   - the new behaviour shipped behind a feature flag, off by default (like `lti.active`), so it
     can be installed everywhere first and switched on together
   - if needed, a transition period with the old and new behaviour side by side

   **Example: math markup in EXAM 7.0.** 7.0 writes math in HTML content (question texts and
   answers) in a new syntax that installations before 7.0 cannot render. A collaborative exam or
   an exam taken at another organisation can therefore show raw markup to a 6.x installation's
   users. This is invisible to every safeguard described here: the payloads keep their shape, so
   the fixtures stay green, and 7.0 predates the protocol headers, so XM cannot tell 6.x from 7.0
   (both are protocol 0). It can only be handled by agreement: upgrading past 6.x by a deadline,
   or not using the new math in exams shared with organisations still on 6.x.

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

A directory is removed together with its translation step in XM, as described below.

## The sliding window

XM carries one translation step per pair of adjacent protocol versions that are still in use:

```
0 ──(XM's current evolutions)──> 1 ──(step for the next change)──> 2 ──> …
```

The set of steps is a window that slides upwards over time:

- **New steps are added at the top** when the wire format changes (the steps under "When
  `IopPayloadFixturesSpec` fails" above). This is event-driven: the failing spec tells you.
- **Old steps drop off the bottom** once nobody uses the version below them any more. This does
  not announce itself: someone has to look (see "Periodic review" below).

The window is typically two or three versions wide. The consortium's upgrade windows decide how
wide: the faster everyone upgrades, the sooner old steps can go. The software does not rely on
that, though: a step stays until the data shows it is unused, whatever the deadline says.

Protocol 0 (EXAM older than 7.1) is the first version to leave the window. XM's current evolutions
are its step; they become the step 0 → 1 of the chain if version-aware translation (CSCEXAM-1736)
is built before then, and are retired once protocol 0 is gone.

A step N → N + 1 is removed when all of these hold (details in XM's README, "IOP protocol
versions"):

1. The consortium's upgrade deadline for leaving protocol N has passed.
2. No active organisation has announced protocol N or older for a long while (for example two
   terms). Organisations on protocol 0 announce nothing, so ask whether each is still active.
3. No document stored in XM was last written with protocol N or older, or those have been
   converted once.
4. Everything belonging to the version goes with it: the XM step, its tests, the fixtures in XM
   (`src/test/fixtures/v<N>/`) and in EXAM (`test/resources/iop-fixtures/v<N>/`).

## Periodic review

Dropping old steps needs someone to check now and then. A natural moment is each EXAM release, or
the consortium's upgrade deadlines. In the XM repository, with an SSH tunnel to the production
CouchDB:

```bash
pnpm run versions http://user:password@localhost:5986/xm
```

It shows:

- every organisation with its protocol, EXAM version and when XM last heard from it, lowest
  protocol first: who still holds the window open, and whom to remind before a deadline
- how many stored exams and assessments were last written with each protocol: what a removal
  would still need to convert

Then:

- **Can the lowest step go?** Check the four conditions above. If they hold, remove the step and
  its fixtures; if not, note who or what is holding it.
- **Is a new step pending?** If a wire format change has been merged to EXAM's dev (a new
  `v<N>/` fixture directory), XM needs the matching step deployed before that EXAM release
  reaches any organisation.

## Known limits

- The inbound check verifies structure (the exam's name, sections and questions survive parsing),
  not every field. The outbound comparison is what catches field-level changes.
- Copying fixtures to XM is a manual step (`pnpm run sync-fixtures`), done when the version is
  bumped.
- Changes of meaning (same shape, different interpretation) are not caught; see "What counts as a
  wire format change" and "Changes that can't be translated".
