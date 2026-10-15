<!--
SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium

SPDX-License-Identifier: EUPL-1.2
-->

# LTI questions and exam visits

An LTI question embeds an activity from an external tool (Moodle in the reference setup) in an
exam. EXAM acts as the LTI 1.3 **platform**, the role an LMS normally plays: it starts the launch,
and it signs the token that tells the tool who the user is and where the launch comes from.

This document covers how a launch works, what EXAM asserts in it, and why an exam with LTI
questions cannot be taken as a visit to another installation.

## Registration

LTI is a mutual registration between one EXAM installation and one tool. Both sides are set up
by hand, and the EXAM side lives in the `lti.*` settings of `conf/application.conf`. That section
describes every value. For local development, see the commented-out block in `conf/dev.conf`.

The tool needs this installation's JWKS URL, `<lti.platform.issuer>/integration/lti/oidc/jwks`,
to verify the tokens EXAM signs.

## Authoring

A teacher creates a question of type _LTI question_ and enters the tool's identifier for the
activity (`Question.ltiId`). For Moodle, this is the `id` custom parameter of the resource
published with _Publish as LTI tool_. EXAM stores no other tool data in the exam.

## Launch flow

The launch runs in an iframe in the examination view (`ExaminationLtiComponent`).

1. The iframe opens `GET /integration/lti/start-login?sectionQuestionId=<id>&examHash=<hash>`.
   `LtiController.startLogin` looks up the question in that exam and checks that the user may
   open it:
    - a student must be taking their own copy of the exam
    - a teacher must own, have created or inspect the exam
    - an admin may open any exam

    It then redirects to the tool's login initiation URL, with a fresh `login_hint` stored in the
    session.

2. The tool redirects back to `GET /integration/lti/oidc/login` with its own `state` and `nonce`.
   EXAM checks the `client_id`, the `login_hint` (which binds the callback to the session that
   started it) and that `redirect_uri` is listed in `lti.tool.redirect-uris`.
3. EXAM resolves the question again and answers with a self-submitting form that POSTs the signed
   `id_token` and the tool's `state` to the `redirect_uri`.

Everything the token asserts about the launch comes from the database, not from the browser: the
browser only names a question in an exam, so it cannot make EXAM sign a launch into a resource the
user has no exam for.

## The id_token

The token is signed with RS256 using `lti.platform.private-key` and is valid for five minutes.
Besides the standard claims (`iss`, `sub` = the user's eppn, `aud`, `exp`, `iat`, `jti`, `nonce`,
name and email), it carries these LTI claims:

| Claim              | Value                                                            |
| ------------------ | ---------------------------------------------------------------- |
| `message_type`     | `LtiResourceLinkRequest`                                         |
| `version`          | `1.3.0`                                                          |
| `deployment_id`    | `lti.platform.deployment-id`                                     |
| `target_link_uri`  | the validated redirect URI                                       |
| `resource_link.id` | the question's `ltiId`                                           |
| `custom.id`        | the question's `ltiId` (how Moodle finds the published resource) |
| `context`          | the exam, see below                                              |
| `roles`            | from the user's current EXAM role, see below                     |

**Context.** The context stands for the course the launch happens in, and it has to be the same
for everyone taking the exam. Each student takes their own copy of an exam, so the context is
the exam the copy was made from:

- `id`: `exam-<id of the original exam>`, or `collaborative-exam-<id>` for a copy of a
  collaborative exam
- `title`: the exam name
- `label`: the course code, or the exam name if the exam has no course
- `type`: `CourseOffering`

**Roles.**

| EXAM role | LTI roles                                                   |
| --------- | ----------------------------------------------------------- |
| Student   | `membership#Learner`                                        |
| Teacher   | `membership#Instructor`                                     |
| Admin     | `membership#Instructor`, `institution/person#Administrator` |

Teachers reach a launch by previewing an exam. Moodle adds an Instructor launch to the course with
the instructor role configured for the published resource (typically a teacher role), so a
teacher who previews an exam gets that role in the Moodle course. Configure the published
resource with that in mind.

## Where a launch is not available

The launch needs an exam in this installation's database, so the iframe shows a placeholder
instead of the tool in these cases:

- the single-question preview (question library and exam editor), which has no exam
- the preview of a collaborative exam, whose exam lives on XM rather than locally

Students taking a collaborative exam are not affected, since their copy is stored locally.

## Exam visits

A student can take an exam at another installation's room through IOP (an _exam visit_). An
exam with LTI questions cannot be taken this way.

The tool registration belongs to the installation, not to the exam. Only `ltiId` would travel
with the exam to the visited installation, and that installation is not registered with the
tool, so it would have nothing to launch: the student would see an empty frame in the middle of
the exam. EXAM therefore refuses the visit up front, in two places:

- **Reservation**: `ExternalCalendarController` rejects the booking with
  `i18n_error_exam_not_available_externally`, so the student finds out when booking, not on the
  day of the exam.
- **Transfer**: `ExternalExamService` refuses to hand the exam to the visited installation with
  `409 Conflict` (`ExamNotTransferable`). This also covers collaborative exams, and catches LTI
  questions added after the reservation was made.

`Exam.hasLtiQuestions` decides both.

## Testing

`test/lti/LtiFlowSpec.scala` runs the whole launch with the spec standing in for the tool, and
verifies the token against the published JWKS, so no Moodle instance is needed.
`test/iop/ExternalExamControllerSpec.scala` covers the refused transfer. Neither replaces a launch
against a real Moodle: what Moodle does with the context and roles is only verified there.
