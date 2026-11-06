<!--
SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium

SPDX-License-Identifier: EUPL-1.2
-->

# LTI questions and exam visits

An LTI question embeds an activity from an external tool (Moodle or A+ in the reference setups)
in an exam. EXAM acts as the LTI 1.3 **platform**, the role an LMS normally plays: it starts the launch,
and it signs the token that tells the tool who the user is and where the launch comes from.

This document covers how a launch works, what EXAM asserts in it, and why an exam with LTI
questions cannot be taken as a visit to another installation.

## Registration

LTI is a mutual registration between one EXAM installation and one tool, and an installation can
be registered with several tools. Both sides are set up by hand. On the EXAM side the platform's
own settings are under `lti.platform`, shared by every tool, and each tool is an entry of
`lti.tools`, keyed by an id that questions store. The LTI section of `conf/application.conf`
describes every value and has an example for Moodle and for A+. For local development, see the
commented-out block in `conf/dev.conf`.

Each tool needs this installation's issuer (`lti.platform.issuer`), the client id it issued, and
the JWKS URL, `<lti.platform.issuer>/integration/lti/oidc/jwks`, to verify the tokens EXAM signs.

A tool's origin is added to the `form-action` and `frame-src` directives of the CSP at startup
(`system.modules.LtiCspModule`, which replaces Play's `CSPModule`), so adding a tool takes no CSP
changes. A tool entry with a missing or malformed setting is logged at startup and left out.

### Upgrading from a single tool

Builds before multiple tools had one tool in `lti.tool.*`, with its client and deployment ids in
`lti.platform.client-id` and `lti.platform.deployment-id`. Those settings are no longer read. Move
them into a `lti.tools.moodle` entry (`lti.tool.origin` becomes `lti.tools.moodle.origin`, and so
on, client and deployment id included). Evolution 158 assigns existing LTI questions to the tool
`moodle` and moves their resource id into the parameter `id`, so the key has to be `moodle`.

### Moodle

_Site administration → Plugins → Enrolments → Publish as LTI tool → Tool registration._ The `id`
in Moodle's login URL (`/enrol/lti/login.php?id=...`) identifies the registration of this
platform, not a resource. A published resource is picked with the custom parameter `id`, which
Moodle shows as a custom property of the published resource.

### A+

A+ supports LTI 1.3 as a tool from version 1.18. The A+ administrator registers this platform
(issuer, client id, JWKS URL and the login and launch URLs). There is no A+ test instance yet, so
what EXAM sends is checked against A+'s source code instead, see [Testing](#testing).

## Authoring

A teacher creates a question of type _LTI question_, picks the tool (the picker is hidden when only
one tool is configured) and fills in the tool's custom parameters, which pick the activity in the
tool. The question stores the tool key (`Question.ltiTool`) and the parameters
(`Question.ltiCustom`); EXAM stores no other tool data in the exam.

The parameters a tool takes are part of its configuration: each has a name, whether it is
required, and optionally other parameters it requires (`requires`). Saving a question checks them
against the tool, and only the parameters the tool declares are stored. The editor labels a
parameter with the i18n key `i18n_lti_parameter_<name>`, or with its name.

| Tool   | Parameters                                                                                 |
| ------ | ------------------------------------------------------------------------------------------ |
| Moodle | `id` (required): the published resource                                                    |
| A+     | `course_slug`, `instance_slug` (required), `module_slug`, `exercise_path` (needs a module) |

A+ opens the most specific of course instance, module and exercise given; the slugs are the
names in its URLs, `https://<a+>/<course>/<instance>/<module>/<exercise>/`.

## Launch flow

The launch runs in an iframe in the examination view (`ExaminationLtiComponent`).

1. The iframe opens `GET /integration/lti/start-login?sectionQuestionId=<id>&examHash=<hash>`.
   `LtiController.startLogin` looks up the question in that exam and checks that the user may
   open it:
    - a student must be taking their own copy of the exam
    - a teacher must own, have created or inspect the exam
    - an admin may open any exam

    It then redirects to the login initiation URL of the question's tool, with a fresh
    `login_hint` stored in the session.

2. The tool redirects back to `GET /integration/lti/oidc/login` with its own `state` and `nonce`.
   EXAM checks the `login_hint` (which binds the callback to the session that started it),
   resolves the question again, and checks that `client_id` is the one of the question's tool and
   that `redirect_uri` is one of that tool's `redirect-uris`.
3. EXAM answers with a self-submitting form that POSTs the signed `id_token` and the tool's
   `state` to the `redirect_uri`.

Everything the token asserts about the launch comes from the database, not from the browser: the
browser only names a question in an exam, so it cannot make EXAM sign a launch into a resource the
user has no exam for.

## The id_token

The token is signed with RS256 using `lti.platform.private-key` and is valid for five minutes.
Besides the standard claims (`iss`, `sub` = the user's eppn, `aud` = the tool's client id, `exp`,
`iat`, `jti`, `nonce`, name and email), it carries these LTI claims:

| Claim                        | Value                                                  |
| ---------------------------- | ------------------------------------------------------ |
| `message_type`               | `LtiResourceLinkRequest`                               |
| `version`                    | `1.3.0`                                                |
| `deployment_id`              | the tool's `deployment-id`                             |
| `target_link_uri`            | the validated redirect URI                             |
| `resource_link.id`           | the question's placement in the exam, see below        |
| `custom`                     | the question's parameters, see [Authoring](#authoring) |
| `context`                    | the exam, see below                                    |
| `roles`                      | from the user's current EXAM role, see below           |
| `launch_presentation.locale` | the user's language, `en` if none                      |
| `lis.person_sourcedid`       | the user's student number, empty if none               |
| `ext.user_username`          | the user's eppn                                        |

The last three are there for A+, which reads `locale` and `person_sourcedid` without defaults
when it creates a user, and takes the username from `ext.user_username` (Moodle's extension)
rather than from the email. Moodle ignores them.

**Context.** The context stands for the course the launch happens in, and it has to be the same
for everyone taking the exam. Each student takes their own copy of an exam, so the context is
the exam the copy was made from:

- `id`: `exam-<id of the original exam>`, or `collaborative-exam-<id>` for a copy of a
  collaborative exam
- `title`: the exam name
- `label`: the course code, or the exam name if the exam has no course
- `type`: `CourseOffering`

**Resource link.** One activity in a tool can be used in many exams, and more than once in one
exam, so the resource link stands for the question's placement rather than the activity (that is
`custom`). Like the context it is the same for every student and for a teacher
previewing the exam: `<context id>-question-<id of the original exam's question>`. A copy of a
collaborative exam has no local original, so there it is
`<context id>-section-<section number>-question-<question number>`, positions being copied
verbatim from the collaborative exam. Grades sent back by the tool (LTI AGS, not implemented yet)
would be keyed by this.

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

The tool registration belongs to the installation, not to the exam. Only the tool key and
parameters would travel with the exam to the visited installation, and that installation is not registered with the
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
verifies the token against the published JWKS, so no tool instance is needed. It registers the
shipped `moodle` tool and an A+ tool, and covers a launch going to the question's own tool.
`test/lti/AplusContractSpec.scala` states what A+ needs from a launch, as read from A+'s source at
a pinned commit; update it when a test A+ is available. `test/lti/LtiServiceSpec.scala` covers
the tool configuration and the CSP. `test/iop/ExternalExamControllerSpec.scala` covers the refused
transfer. None of these replaces a launch against a real tool: what Moodle or A+ does with the
context and roles is only verified there.
