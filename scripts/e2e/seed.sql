-- SPDX-FileCopyrightText: 2026 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

-- Seed data for GUI playbooks (see scripts/e2e/README.md).
--
-- Intended for a FRESH, fully migrated database running with exam.login = "DEBUG".
-- Never run it against a shared or production database.
--
-- Usage:
--   psql -h localhost -U exam -d exam -v machine_ip=<ip Play sees> -f scripts/e2e/seed.sql
--
-- All ids are in the 990000 range so they stay clear of Ebean sequences.
-- Reservations are relative to now(): do not seed within ~2 hours of midnight,
-- because the "upcoming" reservation must still be today.

\set ON_ERROR_STOP on

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM app_user WHERE eppn LIKE 'e2e-%@funet.fi') THEN
        RAISE EXCEPTION 'E2E seed data already present - recreate the database (docker compose down -v) before reseeding';
    END IF;
END $$;

BEGIN;

-- Users (DEBUG login: username without @funet.fi, password "e2e") ----------------------------
INSERT INTO app_user (id, email, eppn, first_name, last_name, password, user_agreement_accepted,
                      object_version, language_id, user_identifier)
VALUES (990001, 'e2e-admin@example.org', 'e2e-admin@funet.fi', 'Erkki', 'Admin', md5('e2e'), true, 1, 'en', 'e2e-0001'),
       (990002, 'e2e-teacher@example.org', 'e2e-teacher@funet.fi', 'Tiina', 'Teacher', md5('e2e'), true, 1, 'en', 'e2e-0002'),
       (990003, 'e2e-ongoing@example.org', 'e2e-ongoing@funet.fi', 'Olli', 'Ongoing', md5('e2e'), true, 1, 'en', 'e2e-0003'),
       (990004, 'e2e-upcoming@example.org', 'e2e-upcoming@funet.fi', 'Ulla', 'Upcoming', md5('e2e'), true, 1, 'en', 'e2e-0004'),
       (990005, 'e2e-booker@example.org', 'e2e-booker@funet.fi', 'Bertta', 'Booker', md5('e2e'), true, 1, 'en', 'e2e-0005');

-- Role ids are inserted by evolutions: 1 ADMIN, 2 STUDENT, 3 TEACHER
INSERT INTO app_user_role (app_user_id, role_id)
VALUES (990001, 1), (990002, 3), (990003, 2), (990004, 2), (990005, 2);

-- Room, machine and opening hours --------------------------------------------------------------
INSERT INTO exam_room (id, name, room_code, building_name, campus, accessible,
                       out_of_service, state, local_timezone, object_version)
VALUES (990001, 'E2E Aquarium', 'E2E-1', 'Test building', 'Test campus', true, false, 'SAVED',
        'Europe/Helsinki', 1);

INSERT INTO exam_machine (id, name, ip_address, room_id, archived, out_of_service, object_version)
VALUES (990001, 'E2E-PC-01', :'machine_ip', 990001, false, false, 1);

-- Open around the clock so booking works whenever the playbooks run. Times are wall-clock times
-- in the room's own time zone (local_timezone above).
INSERT INTO default_working_hours (id, start_time, end_time, weekday, room_id, object_version)
SELECT 990000 + n, '00:00:00', '23:59:59.999', d, 990001, 1
FROM unnest(ARRAY ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'])
         WITH ORDINALITY AS t(d, n);

INSERT INTO exam_starting_hour (id, starting_hour, room_id, object_version)
SELECT 990000 + h, make_time(h, 0, 0), 990001, 1
FROM generate_series(0, 23) AS h;

-- Course and a published Aquarium exam ---------------------------------------------------------
INSERT INTO course (id, code, name, credits, object_version, grade_scale_id)
VALUES (990001, 'E2E-101', 'Playbook Testing 101', 5, 1, 1);

-- execution_type 1 PUBLIC, exam_type 2 FINAL, state 3 PUBLISHED, implementation 1 AQUARIUM,
-- grade_scale 1 ZERO_TO_FIVE
INSERT INTO exam (id, created, creator_id, modified, modifier_id, name, course_id, exam_type_id,
                  instruction, hash, exam_active_start_date, exam_active_end_date, duration,
                  object_version, grade_scale_id, execution_type_id, trial_count, state,
                  implementation, anonymous, grading_type, enroll_instruction, shared)
VALUES (990001, now(), 990002, now(), 990002, 'E2E Published Exam', 990001, 2,
        '<p>Answer the essay question.</p>', md5('e2e-exam-990001'), now() - interval '1 day',
        now() + interval '30 days', 60, 1, 1, 1, 1, 3, 1, false, 1,
        '<p>Book a slot in the E2E Aquarium.</p>', false);

INSERT INTO exam_owner (exam_id, user_id) VALUES (990001, 990002);
INSERT INTO exam_language (exam_id, language_code) VALUES (990001, 'en');

INSERT INTO exam_section (id, created, creator_id, name, exam_id, object_version, sequence_number,
                          lottery_on, lottery_item_count, optional, expanded)
VALUES (990001, now(), 990002, 'Section 1', 990001, 1, 0, false, 1, false, false);

-- type 2 EssayQuestion, evaluation type 1 Points
INSERT INTO question (id, created, creator_id, modified, modifier_id, question, state, default_max_score,
                      default_expected_word_count, object_version, type, default_evaluation_type, shared,
                      default_negative_score_allowed, default_option_shuffling_on)
VALUES (990001, now(), 990002, now(), 990002, '<p>Describe what a GUI playbook is.</p>', 'SAVED', 10, 100,
        1, 2, 1, false, false, true);
INSERT INTO question_owner (question_id, user_id) VALUES (990001, 990002);

INSERT INTO exam_section_question (id, exam_section_id, question_id, sequence_number, creator_id, created,
                                   max_score, expected_word_count, evaluation_type, object_version,
                                   negative_score_allowed, option_shuffling_on)
VALUES (990001, 990001, 990001, 0, 990002, now(), 10, 100, 1, 1, false, true);

-- Enrolments and reservations ------------------------------------------------------------------
-- Ongoing: started 5 minutes ago, so login should go straight into the exam.
-- Upcoming: starts in 90 minutes, so login should land in the waiting room.
-- Both use the single machine; overlapping reservations are fine for testing purposes.
INSERT INTO reservation (id, start_at, end_at, machine_id, user_id, object_version, reminder_sent,
                         sent_as_no_show)
VALUES (990001, now() - interval '5 minutes', now() + interval '55 minutes', 990001, 990003, 1, false, false),
       (990002, now() + interval '90 minutes', now() + interval '150 minutes', 990001, 990004, 1, false, false);

INSERT INTO exam_enrolment (id, user_id, exam_id, reservation_id, enrolled_on, object_version,
                            reservation_canceled, retrial_permitted, no_show, delay)
VALUES (990001, 990003, 990001, 990001, now(), 1, false, false, false, 0),
       (990002, 990004, 990001, 990002, now(), 1, false, false, false, 0),
       (990003, 990005, 990001, NULL, now(), 1, false, false, false, 0);

COMMIT;
