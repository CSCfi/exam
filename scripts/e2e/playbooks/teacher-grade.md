<!--
SPDX-FileCopyrightText: 2026 The members of the EXAM Consortium

SPDX-License-Identifier: EUPL-1.2
-->

# Teacher: grade a submitted exam

Covers the review list, assessing an essay answer, setting a grade, and locking the result.

**Preconditions:** student-exam-day part A has been run, so `e2e-ongoing` has a
submitted *E2E Published Exam* containing the answer `Playbook answer 1`.

## Steps

1. Log in as `e2e-teacher` / `e2e`. On the dashboard, click the submission count of *E2E
   Published Exam*.
    - **Expect:** one submission from *Olli Ongoing*, listed as ungraded.
2. Open the submission.
    - **Expect:** the essay question shows the answer `Playbook answer 1`.
3. Give the essay 8 / 10 points and leave the field (it saves on blur).
    - **Expect:** the notice *Graded*; the total shows 8 / 10, and the score survives a page
      reload.
4. Set the exam grade to 4. Open the *Give feedback to the student* panel with its small
   **Show** toggle (not the title), write `Good work`, then click **Save changes** and accept
   the confirmation.
    - **Expect:** the notice *The assessment has been saved and marked as ready*, and a return
      to the review list.
5. Under *Assessed submissions to be locked*, select the submission, click **Lock the selected
   assessments and inform students**, and accept.
    - **Expect:** the notice *Results have been sent successfully*. The submission moves to
      *Locked study attainments*.
6. Move the seeded machine off the browser's IP (a student on an exam machine only sees the
   waiting room): `psql -h localhost -p ${EXAM_DB_PORT:-5432} -U exam -d exam -c "update
   exam_machine set ip_address = '192.0.2.1' where id = 990001"`. Reload, log in as
   `e2e-ongoing`, open **Study attainments** and click *Show feedback*.
    - **Expect:** *E2E Published Exam* with exam grade 4, total score 8 / 10 and the feedback
      *Good work*.
