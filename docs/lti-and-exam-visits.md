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

## Turning LTI on

LTI is an optional integration and off by default. Set `lti.active = true` to use it. While it is
off:

- the other `lti.*` settings are not read, and every LTI endpoint answers `404`
- the CSP gets no LTI origins (see below)
- teachers are not offered the LTI question type, and creating an LTI question fails with
  `i18n_lti_not_active`
- LTI questions created while it was on keep their tool and parameters, can still be edited and
  reviewed, and show a notice instead of the tool in an exam

The UI asks `GET /app/settings/lti` whether LTI is on.

## Registration

LTI is a mutual registration between one EXAM installation and one tool, and an installation can
be registered with several tools. Both sides are set up by hand. On the EXAM side the platform's
own settings are under `lti.platform`, shared by every tool, and each tool is an entry of
`lti.tools`, keyed by an id that questions store. The LTI section of `conf/application.conf`
describes every value and has an example for Moodle and for A+; no tool is configured by
default. For local development, see the
commented-out block in `conf/dev.conf`.

Each tool needs this installation's issuer (`lti.platform.issuer`), the client id it issued, and
the JWKS URL, `<lti.platform.issuer>/integration/lti/oidc/jwks`, to verify the tokens EXAM signs.

While LTI is on, `lti.platform.issuer` (where the launch iframe starts) is added to the
`frame-src` directive of the CSP at startup, and every tool's origin to `form-action` and
`frame-src` (`system.modules.LtiCspModule`, which replaces Play's `CSPModule`), so adding a tool
takes no CSP changes. A tool entry with a missing or malformed setting is logged at startup and left out.

### Upgrading from a single tool

Builds before multiple tools had LTI always on, and one tool in `lti.tool.*`, with its client and
deployment ids in `lti.platform.client-id` and `lti.platform.deployment-id`. Those settings are no
longer read. Set `lti.active = true` and move them into a `lti.tools.moodle` entry
(`lti.tool.origin` becomes `lti.tools.moodle.origin`, and so on, client and deployment id
included). Evolution 158 assigns existing LTI questions to the tool `moodle` and moves their
resource id into the parameter `id`, so the key has to be `moodle`.

### Moodle

_Site administration → Plugins → Enrolments → Publish as LTI tool → Tool registration._ The `id`
in Moodle's login URL (`/enrol/lti/login.php?id=...`) identifies the registration of this
platform, not a resource. A published resource is picked with the custom parameter `id`, which
Moodle shows as a custom property of the published resource. For teachers to pick it in Moodle
instead (see [Deep Linking](#picking-content-in-the-tool-deep-linking)), set the tool's
`deep-linking-url` to `/enrol/lti/launch_deeplink.php`; Moodle's registration needs no changes.

**How users are linked.** Moodle links a launch to a Moodle account by the issuer and `sub` (the
EXAM user's eppn), in its own table `auth_lti_linked_login`. Nothing is matched by username or
email: a teacher whose Moodle account has the same eppn is still not linked until the link is
made. With no link yet, the published resource's provisioning mode decides, separately for
instructors and learners: _new accounts only_ creates an account (authentication method "LTI",
username `enrol_lti_13_<hash>`), the _prompt_ modes ask the user to log in to an existing Moodle
account (or create one) and link it. The link is kept from then on; deleting the Moodle user
removes it.

**Deep Linking and Moodle accounts.** Moodle's picker lists only the published resources in
courses where the linked Moodle account has `enrol/lti:config` (editing teachers and managers by
default). Deep Linking always runs in Moodle's "existing accounts only" mode, but uses an existing
link as it is: a teacher who has launched a question as an instructor under _new accounts only_
is linked to the account Moodle created then, which has published nothing, and the picker is
empty. For teachers who pick content in Moodle, set the published resources' instructor
provisioning to _prompt for existing accounts_, so they link their own Moodle accounts on first
contact. To relink a teacher, delete the auto-created user in Moodle; the next deep linking
request then asks them to log in. Learners can keep automatic provisioning.

**Logging in from a launch.** A launch runs in EXAM's frame, and a Moodle that logs in through
SSO usually cannot log in there: the identity provider refuses to be framed, and the Shibboleth
discovery page (`idpselect.js`) fails reading the top window's location. So when the prompt mode
asks a teacher to log in during a preview, the frame stays empty. The preview offers to open the
launch in a new window under each LTI question (`target=window` on `start-login`, sent to the tool
as `document_target: window`); the login works there, and once the account is linked the frame
launches without asking. The deep linking popup is a window of its own too, so a teacher who picks
content there is linked already. Students never see the prompt under automatic provisioning.

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

## Picking content in the tool (Deep Linking)

A tool with a `deep-linking-url` (and a `jwks-url`) lets teachers pick the content of a question in
the tool itself: the editor shows _Choose from the tool_ next to the parameters, which can still be
typed in by hand. It is opt-in per tool; Moodle supports it, A+ most likely needs AGS first.

1. The editor asks `POST /app/lti/deep-link` for a request and opens its URL in a popup window,
   `GET /integration/lti/deep-link/<id>/start`. That runs the same OIDC login as a launch, with the
   tool's deep linking URL as `target_link_uri`, and the callback answers an
   `LtiDeepLinkingRequest` instead of a resource link launch. It carries
   `deep_linking_settings` (return URL, resource links only, one at a time) with the request's id
   as `data`, and no context or resource link.
2. The teacher picks a resource in the tool, which posts it as a signed JWT to
   `POST /integration/lti/deep-link/return`. That post comes from the tool's page, so it is not
   bound to the session (the browser may leave the session cookie out) and needs no CSRF token.
   EXAM checks the signature against the tool's keys (`jwks-url`, fetched and kept; an unknown key
   id makes it fetch them again, at most once a minute), and that the message is from the tool,
   for this platform and deployment, not expired, and carries the id of a request still waiting.
   Each request is completed once, and lives for 15 minutes.
3. The return page tells the editor (`postMessage` to `exam.application.hostname`) and closes the
   popup. The editor then fetches the pick with `GET /app/lti/deep-link/<id>`, which only the
   teacher who started the request gets, once, and fills in the parameters. If the message never
   arrives, the editor asks when the popup is closed.

Only the parameters the tool declares are kept from the pick, and it has to give every required
one. A pick of more than one resource is refused with a page asking the teacher to pick only one,
since Moodle's picker allows ticking several although the request asks for one. The resource's URL is not stored: launches go to the tool's `target-link-uri`.

**Network.** Deep linking is the one place where EXAM's server calls the tool: it fetches the
tool's keys from `jwks-url` (for Moodle `GET <moodle>/enrol/lti/jwks.php` over HTTPS) to check a
pick. EXAM's server therefore needs outbound access to the tool on port 443, through the JVM's
proxy settings (`-Dhttps.proxyHost`, `-Dhttps.proxyPort`) if outbound traffic goes through a proxy,
and has to trust the tool's TLS certificate (add an internal CA to the JVM's truststore). If the
fetch fails, picking fails with "keys could not be fetched" in the log; launches are unaffected,
since they involve no call from EXAM to the tool.

## Launch flow

The launch runs in an iframe in the examination view (`ExaminationLtiComponent`).

1. The iframe opens `GET /integration/lti/start-login?sectionQuestionId=<id>&examHash=<hash>`.
   `LtiController.startLogin` looks up the question in that exam and checks that the user may
   open it:
    - a student must be taking their own copy of the exam
    - a teacher must own, have created or inspect the exam
    - an admin may open any exam

    It then redirects to the login initiation URL of the question's tool, with a fresh
    `login_hint`. The login is kept on the server under that hint (`LtiLogins`): who started it,
    in which role, and for which question and exam, or which deep linking request.

2. The tool redirects back to `GET /integration/lti/oidc/login` with its own `state` and `nonce`.
   EXAM takes the login by its `login_hint`, which works once and for five minutes,
   resolves the question again for the user who started it, and checks that `client_id` is the one of the question's tool and
   that `redirect_uri` is one of that tool's `redirect-uris`.
3. EXAM answers with a self-submitting form that POSTs the signed `id_token` and the tool's
   `state` to the `redirect_uri`.

The callback does not use EXAM's session. It reaches EXAM through a redirect from the tool, and when
the tool is on another site (`exam.uni.fi` and `moodle.other.fi`) Firefox treats it as a cross-site
request and sends it without EXAM's `SameSite=Lax` session cookie. Chromium-based browsers send the
cookie for now. The `login_hint` stands in for it: it is random, goes only to the tool, and can be
used once. A callback without a known hint fails with `400`. Each launch has its own hint, so
several launches can be in progress at once. The examination view still starts them one at a time
(`LtiLaunchQueueService`), which they no longer need.

Everything the token asserts about the launch comes from the database, not from the browser: the
browser only names a question in an exam, so it cannot make EXAM sign a launch into a resource the
user has no exam for.

## The iframe and cookies

The tool runs in an iframe inside EXAM. LTI does not require that (the platform says how it
presents the tool, `launch_presentation.document_target`), but it keeps the student inside the
exam view and Safe Exam Browser. The catch is the tool's session cookie: inside EXAM's frame it is
a third-party cookie, unless EXAM and the tool are on the **same site**, that is, share their
registrable domain. `exam.uni.fi` and `moodle.uni.fi` are the same site; `exam.uni.fi` and
`moodle.other.fi` are not.

- Chromium-based browsers, including SEB on Windows, still allow third-party cookies set with
  `SameSite=None`, as Moodle sets them.
- WebKit-based browsers block them by default: Safari, and, as far as we know, SEB on macOS and
  iOS. There the tool's login fails inside the frame. This is not verified with SEB yet.

- Firefox keeps them, but separately per top-level site, which is enough inside the frame.

EXAM's own session cookie is not needed inside the frame (see the launch flow), so this concerns
only the tool's cookie. Recent Moodle versions (seen in 5.1) check this themselves before the
login: Moodle tries a `SameSite=None` cookie and then a `Partitioned` one, and when neither gets
through it shows "Cookies are blocked by your browser" in the frame. For that case, and the SSO login above, the examination view offers the
launch in a new window under each LTI question, where the tool is first-party. The link is shown
in previews and home exams, not in exam rooms or SEB exams, where the exam view is the only window.

So deploy EXAM and its tools on the same site where possible, and test with SEB on macOS before
relying on a cross-site setup. SEB's URL filter also has to allow the tool's domain.

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
test `moodle` tool of `conf/integrationtest.conf` and an A+ tool, and covers a launch going to the question's own tool.
`test/lti/AplusContractSpec.scala` states what A+ needs from a launch, as read from A+'s source at
a pinned commit; update it when a test A+ is available. `test/lti/LtiInactiveSpec.scala` covers LTI turned off. `test/lti/LtiServiceSpec.scala` covers
the tool configuration and the CSP. `test/iop/ExternalExamControllerSpec.scala` covers the refused
transfer. None of these replaces a launch against a real tool: what Moodle or A+ does with the
context and roles is only verified there.
