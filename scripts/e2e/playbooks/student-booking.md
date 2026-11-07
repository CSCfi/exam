<!--
SPDX-FileCopyrightText: 2026 The members of the EXAM Consortium

SPDX-License-Identifier: EUPL-1.2
-->

# Student booking

Covers the enrolment page, the reservation calendar and the dashboard reservation card.

**Preconditions:** fresh seed. A student on an exam machine IP gets redirected to the
waiting room (see student-exam-day part C), so first move the seeded machine off the
browser's IP:

```bash
psql -h localhost -p ${EXAM_DB_PORT:-5432} -U exam -d exam -c "update exam_machine set ip_address = '192.0.2.1' where id = 990001"
```

Run student-exam-day **before** this playbook, or restore the IP afterwards (step 8).

## Steps

1. Log in as `e2e-booker` / `e2e`.
    - **Expect:** the student dashboard. *E2E Published Exam* is listed with the hint
      *Remember to book a place for the exam*.
2. Click **Book an exam time** on that exam.
    - **Expect:** URL `/calendar/990001`. The phases *Exam*, *Choose room* and *Reservation*
      are visible. On a freshly created database the first two loads fail with
      `pk_general_settings` (known bug, see the README's findings); reload until it works.
3. In *Choose room*, select **E2E Aquarium**.
    - **Expect:** the week calendar shows bookable slots, including today's remaining hours
      (the room is open 24/7 with hourly starts).
4. Click a free slot tomorrow.
    - **Expect:** the *Reservation* phase shows E2E Aquarium, the slot's date and time, and
      a duration of 1 h.
5. Click **Confirm exam time**.
    - **Expect:** a return to the dashboard (no notice). The exam card now shows
      the reservation (room E2E Aquarium, chosen time) and offers **Edit reservation** and
      **Remove the booking**.
6. Click **Remove the booking** and confirm.
    - **Expect:** the card is back to *Remember to book a place for the exam* (no notice).
7. Book again (steps 2–5). Log out.
8. Restore the machine IP if more playbooks follow:

    ```bash
    psql -h localhost -p ${EXAM_DB_PORT:-5432} -U exam -d exam -v ip=<nginx ip> -c "update exam_machine set ip_address = :'ip' where id = 990001"
    ```
