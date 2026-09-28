-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

-- Backfills only. The Downs leave the times in place, as they cannot be told apart from real ones

-- Accounts that have not logged in since last_login was introduced (evolution 46) have no time
-- for retention to count from, as app_user has no created column. Start their inactivity
-- period at this release
UPDATE app_user SET last_login = now() WHERE last_login IS NULL;

-- Enrolments with no reservation, no examination event and no enrolment time would never
-- expire, and would keep their student's account too. Time them from the student's attempt,
-- or else from this release
UPDATE exam_enrolment e SET enrolled_on = COALESCE(
    (SELECT min(p.started) FROM exam_participation p
     WHERE p.exam_id = e.exam_id AND p.user_id = e.user_id),
    now())
WHERE e.enrolled_on IS NULL
AND NOT EXISTS (SELECT 1 FROM reservation r WHERE r.id = e.reservation_id AND r.start_at IS NOT NULL)
AND NOT EXISTS (SELECT 1 FROM examination_event_configuration c
                JOIN examination_event ev ON ev.id = c.examination_event_id
                WHERE c.id = e.examination_event_configuration_id);

# --- !Downs
