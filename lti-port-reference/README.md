# LTI backend: Java → Scala port reference

When `dev` was merged into `lti`, every backend file the LTI spike touched had already been
rewritten from Java into Scala under `app/features/**`. Git reported those as modify/delete
conflicts; the merge resolved them by taking dev's deletion, so **the LTI backend logic is not
in the tree** — it is preserved here instead.

The frontend was ported during the merge and is working. Only the backend is outstanding.

## What is in this directory

- `java/` — the LTI-era Java files exactly as they were on `lti` before the merge (tip `2410a1856`).
- `lti-backend.diff` — the backend half of the LTI feature as a diff against the merge base,
  i.e. only the lines the spike added. This is the smaller and more useful of the two.

Nothing here is compiled; the directory sits outside `app/` deliberately.

## Package mapping

| LTI-era Java (deleted)                                       | Scala equivalent on dev                                          |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| `app/controllers/examination/ExaminationController.java`       | `app/features/examination/controllers/ExaminationController.scala` |
| `app/controllers/iop/transfer/impl/ExternalExaminationController.java` | `app/features/examination/controllers/ExternalExaminationController.scala` |
| `app/controllers/question/QuestionController.java`             | `app/features/question/controllers/QuestionController.scala`       |
| `app/miscellaneous/excel/ExcelBuilderImpl.java`                | `app/services/excel/ExcelBuilderImpl.scala`                        |
| `app/models/questions/Question.java`                           | `app/models/questions/Question.scala`                              |
| `app/models/sections/ExamSectionQuestion.java`                 | `app/models/sections/ExamSectionQuestion.scala`                    |
| `app/controllers/JwksController.java`                          | no equivalent — new controller, needs a home under `app/features/` |

## Port checklist

1. **`QuestionType`** — add `LtiQuestion` with `@EnumValue("6")` in
   `app/models/questions/QuestionType.java` (still Java, one of the 10 remaining).
2. **`Question.scala`** — add the `ltiId` field (column `lti_id`, already created by
   evolution `147.sql`). The spike also relaxed question validation so `LtiQuestion` is
   treated like `EssayQuestion` in requiring an evaluation type.
3. **`QuestionController.scala`** — parse and persist `ltiId` from the request body.
4. **`ExcelBuilderImpl.scala`** — add the `LtiQuestion` branch to the report question-type
   match; the message key `reports.question.type.lti` already exists in `conf/messages.*`.
5. **`ExaminationController.scala`** — port `startLogin` and `handleOidcLogin`. This is the
   bulk of the work (~346 lines of Java) and the only part with real LTI 1.3 / OIDC semantics:
   state and nonce generation, session round-tripping, `client_id` / `deployment_id`
   validation, and RS256 signing of the id_token.
6. **`JwksController`** — port the JWKS endpoint (~58 lines): read the public key PEM from
   disk, wrap it as an `RSAKey` with the configured key id, serve the JWK set.
7. **`conf/routes`** — three LTI routes are commented out at the top of the file with the
   target Scala paths already written in. Uncomment once the handlers exist.

The `nimbus-jose-jwt` dependency the spike added is retained in `build.sbt`.

## POC configuration (intentional — do not "fix" during the port)

This branch is a POC built against a Moodle running locally on port 8888, with EXAM itself at
`https://dev.exam.csc.fi`. The hardcoded values are deliberate and load-bearing:

- The CSP relaxations in `conf/application.conf` (`form-action`, `frame-ancestors`, `frame-src`)
  are what allow the Moodle LTI tool to render in an iframe. They are kept, overriding dev's
  hardened `'none'` values, and marked POC in place.
- The `lti.*` settings point at `moodle.local:8888` and at local key files. Same story.
- The LTI iframe URL in `examination-lti-question.component.ts` is hardcoded to
  `https://dev.exam.csc.fi` to match `lti.platform.issuer` and the `frame-src` allow-list.

What this does mean is that **none of it can ship as-is**. Before the feature leaves this
branch, the CSP relaxations and the `lti.*` block both need to become per-deployment config
rather than shipped defaults.

## Loose ends in the spike itself

- `startLogin` sends a literal `login_hint=hint`.
- `saveCollaborativeLtiScore$` on the frontend validates `question.forcedScore` but then sends
  `essayAnswer.evaluatedScore`. Whichever field is authoritative, the check and the payload
  should agree — the Scala side will need to pick one.
- `answer-instructions.component.ts` had an `ltiUrl` input and an empty placeholder `<div>`
  that nothing rendered; both were dropped in the merge. If that was a half-wired second
  iframe location, it is in the `pre-dev-merge-backup` tag.
