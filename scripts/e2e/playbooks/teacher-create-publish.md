<!--
SPDX-FileCopyrightText: 2026 The members of the EXAM Consortium

SPDX-License-Identifier: EUPL-1.2
-->

# Teacher: create and publish an exam

Covers creating an exam, the editor tabs, adding a question, and the publish dialog.

**Preconditions:** fresh seed. The course *E2E-101 Playbook Testing 101* exists locally.
`courseUnitInfo` is active in `docker.conf`, so the course search also queries an
unreachable external service; slow results or an error toast from that lookup are not a
FAIL as long as E2E-101 can still be chosen.

## Steps

1. Log in as `e2e-teacher` / `e2e`.
    - **Expect:** teacher dashboard (URL under `/staff`), with *E2E Published Exam* under
      *Active exams*.
2. Click **Create new exam** and choose exam type *General exam*. (The Docker configuration
   offers no implementation choice; Aquarium is used.)
    - **Expect:** the notice *Exam has been added*; URL `/staff/exams/<id>/course`.
3. Type `E2E` in the course code field and choose *E2E-101*, then set the exam name to
   `Playbook Created Exam` (the field moves down once the course is chosen) and save.
    - **Expect:** the editor opens (URL `/staff/exams/<id>/1`), and the name and course are
      kept after a page reload.
4. Open the questions tab. Name the section `Section 1` (publishing refuses unnamed sections).
   Add a new **essay** question with text `What did you test?` and max score 5. Save it.
    - **Expect:** the question appears in the section with max score 5.
5. Step through each remaining editor tab using the tab bar.
    - **Expect:** every tab renders without an error toast or a blank page, and the browser
      console shows no uncaught errors.
6. On the publish tab, check that the exam period covers today (the default does) and choose
   a duration (the Docker configuration offers 45, 90, 110 and 180 minutes; 45 is fine). The
   grade scale 0–5 is preselected on the assessment settings tab. Click **Save and publish**.
    - **Expect:** the *Publishing exam* dialog asks *Are you sure you want to publish the
      exam?*.
7. Confirm.
    - **Expect:** the notice *The exam has been saved and published*. Back on the dashboard,
      *Playbook Created Exam* is listed under *Active exams*.
8. Log in as `e2e-booker` and search for the exam under exams.
    - **Expect:** *Playbook Created Exam* is found and offers **Register for the exam**.
      Don't register. Log out.
