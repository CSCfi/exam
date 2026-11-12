-- SPDX-FileCopyrightText: The members of the EXAM Consortium
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
       (990005, 'e2e-booker@example.org', 'e2e-booker@funet.fi', 'Bertta', 'Booker', md5('e2e'), true, 1, 'en', 'e2e-0005'),
       (990006, 'e2e-wrongmachine@example.org', 'e2e-wrongmachine@funet.fi', 'Kalle', 'Kone', md5('e2e'), true, 1, 'en', 'e2e-0006'),
       (990007, 'e2e-wrongroom@example.org', 'e2e-wrongroom@funet.fi', 'Hilma', 'Huone', md5('e2e'), true, 1, 'en', 'e2e-0007'),
       (990008, 'e2e-waiting@example.org', 'e2e-waiting@funet.fi', 'Veikko', 'Odottaja', md5('e2e'), true, 1, 'en', 'e2e-0008'),
       (990009, 'e2e-seb@example.org', 'e2e-seb@funet.fi', 'Selma', 'Seb', md5('e2e'), true, 1, 'en', 'e2e-0009'),
       (990010, 'e2e-elsewhere@example.org', 'e2e-elsewhere@funet.fi', 'Eino', 'Muualla', md5('e2e'), true, 1, 'en', 'e2e-0010'),
       (990011, 'e2e-early-elsewhere@example.org', 'e2e-early-elsewhere@funet.fi', 'Elli', 'Etäällä', md5('e2e'), true, 1, 'en', 'e2e-0011');

-- Role ids are inserted by evolutions: 1 ADMIN, 2 STUDENT, 3 TEACHER
INSERT INTO app_user_role (app_user_id, role_id)
VALUES (990001, 1), (990002, 3), (990003, 2), (990004, 2), (990005, 2), (990006, 2), (990007, 2), (990008, 2),
       (990009, 2), (990010, 2), (990011, 2);

-- Room, machine and opening hours --------------------------------------------------------------
-- Rooms created in admin always have an address; the booking page's room details need one
INSERT INTO mail_address (id, street, zip, city, object_version)
VALUES (990001, 'Testikatu 1', '00100', 'Helsinki', 1),
       (990002, 'Testikatu 2', '00100', 'Helsinki', 1);

INSERT INTO exam_room (id, name, room_code, building_name, campus, accessible,
                       out_of_service, state, local_timezone, mail_address_id, object_version)
VALUES (990001, 'E2E Aquarium', 'E2E-1', 'Test building', 'Test campus', true, false, 'SAVED',
        'Europe/Helsinki', 990001, 1),
       (990002, 'E2E Other Room', 'E2E-2', 'Other building', 'Test campus', true, false, 'SAVED',
        'Europe/Helsinki', 990002, 1);

-- The browser always reaches Play through nginx, so every request comes from E2E-PC-01. The
-- other machines only exist to be reserved: a reservation on PC-02 is the wrong machine in the
-- right room, one on PC-03 the wrong room.
INSERT INTO exam_machine (id, name, ip_address, room_id, archived, out_of_service, object_version)
VALUES (990001, 'E2E-PC-01', :'machine_ip', 990001, false, false, 1),
       (990002, 'E2E-PC-02', '192.0.2.2', 990001, false, false, 1),
       (990003, 'E2E-PC-03', '192.0.2.3', 990002, false, false, 1);

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
                  instruction, hash, period_start, period_end, duration,
                  object_version, grade_scale_id, execution_type_id, trial_count, state,
                  implementation, anonymous, grading_type, enroll_instruction, shared)
VALUES (990001, now(), 990002, now(), 990002, 'E2E Published Exam', 990001, 2,
        '<p>Answer the essay question.</p>', md5('e2e-exam-990001'), now() - interval '1 day',
        now() + interval '30 days', 60, 1, 1, 1, 1, 3, 1, false, 1,
        '<p>Book a slot in the E2E Aquarium.</p>', false);

-- A Safe Exam Browser exam (implementation 2 CLIENT_AUTH) with an exam event that started
-- 5 minutes ago. A plain browser sends no SEB config key header, so login only shows a notice.
INSERT INTO exam (id, created, creator_id, modified, modifier_id, name, course_id, exam_type_id,
                  instruction, hash, period_start, period_end, duration,
                  object_version, grade_scale_id, execution_type_id, trial_count, state,
                  implementation, anonymous, grading_type, enroll_instruction, shared)
VALUES (990002, now(), 990002, now(), 990002, 'E2E SEB Exam', 990001, 2,
        '<p>Answer the essay question.</p>', md5('e2e-exam-990002'), now() - interval '1 day',
        now() + interval '30 days', 60, 1, 1, 1, 1, 3, 2, false, 1, NULL, false);

INSERT INTO exam_owner (exam_id, user_id) VALUES (990001, 990002), (990002, 990002);
INSERT INTO exam_language (exam_id, language_code) VALUES (990001, 'en'), (990002, 'en');

INSERT INTO examination_event (id, start, description, object_version)
VALUES (990001, now() - interval '5 minutes', 'E2E SEB event', 1);
INSERT INTO examination_event_configuration (id, examination_event_id, exam_id, config_key, object_version)
VALUES (990001, 990001, 990002, repeat('0', 64), 1);

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
-- Waiting: the test moves the start to just after its login, so the student lands in the
-- waiting room, which moves on into the exam when the time comes.
-- Wrong machine / wrong room: ongoing, but reserved on PC-02 / PC-03 (see the machines above).
-- Elsewhere / early elsewhere: on PC-02, ongoing / in 90 minutes; the tests make the browser's
-- IP unknown before logging in.
-- Overlapping reservations on one machine are fine for testing purposes.
INSERT INTO reservation (id, start_at, end_at, machine_id, user_id, object_version, reminder_sent,
                         sent_as_no_show)
VALUES (990001, now() - interval '5 minutes', now() + interval '55 minutes', 990001, 990003, 1, false, false),
       (990002, now() + interval '90 minutes', now() + interval '150 minutes', 990001, 990004, 1, false, false),
       (990003, now() - interval '5 minutes', now() + interval '55 minutes', 990002, 990006, 1, false, false),
       (990004, now() - interval '5 minutes', now() + interval '55 minutes', 990003, 990007, 1, false, false),
       (990005, now() + interval '30 minutes', now() + interval '90 minutes', 990001, 990008, 1, false, false),
       (990006, now() - interval '5 minutes', now() + interval '55 minutes', 990002, 990010, 1, false, false),
       (990007, now() + interval '90 minutes', now() + interval '150 minutes', 990002, 990011, 1, false, false);

INSERT INTO exam_enrolment (id, user_id, exam_id, reservation_id, enrolled_on, object_version,
                            reservation_canceled, retrial_permitted, no_show, delay)
VALUES (990001, 990003, 990001, 990001, now(), 1, false, false, false, 0),
       (990002, 990004, 990001, 990002, now(), 1, false, false, false, 0),
       (990003, 990005, 990001, NULL, now(), 1, false, false, false, 0),
       (990004, 990006, 990001, 990003, now(), 1, false, false, false, 0),
       (990005, 990007, 990001, 990004, now(), 1, false, false, false, 0),
       (990006, 990008, 990001, 990005, now(), 1, false, false, false, 0),
       (990007, 990009, 990002, NULL, now(), 1, false, false, false, 0),
       (990008, 990010, 990001, 990006, now(), 1, false, false, false, 0),
       (990009, 990011, 990001, 990007, now(), 1, false, false, false, 0);

UPDATE exam_enrolment SET examination_event_configuration_id = 990001 WHERE id = 990007;

-- More students -------------------------------------------------------------------------------
-- Timeout: ongoing on PC-01; the test moves the start so the exam time runs out ~25 s after login.
-- Answers: ongoing on PC-01, in the auto-graded exam below.
-- Home: no enrolment yet; registers for the home exam below during the test.
INSERT INTO app_user (id, email, eppn, first_name, last_name, password, user_agreement_accepted,
                      object_version, language_id, user_identifier)
VALUES (990012, 'e2e-timeout@example.org', 'e2e-timeout@funet.fi', 'Aino', 'Aikaraja', md5('e2e'), true, 1, 'en', 'e2e-0012'),
       (990013, 'e2e-answers@example.org', 'e2e-answers@funet.fi', 'Vilho', 'Vastaaja', md5('e2e'), true, 1, 'en', 'e2e-0013'),
       (990014, 'e2e-home@example.org', 'e2e-home@funet.fi', 'Kerttu', 'Koti', md5('e2e'), true, 1, 'en', 'e2e-0014');
INSERT INTO app_user_role (app_user_id, role_id) VALUES (990012, 2), (990013, 2), (990014, 2);

-- An Aquarium exam with one question of each auto-scored type, graded automatically on submit ---
INSERT INTO exam (id, created, creator_id, modified, modifier_id, name, course_id, exam_type_id,
                  instruction, hash, period_start, period_end, duration,
                  object_version, grade_scale_id, execution_type_id, trial_count, state,
                  implementation, anonymous, grading_type, enroll_instruction, shared)
VALUES (990003, now(), 990002, now(), 990002, 'E2E Auto-graded Exam', 990001, 2,
        '<p>Answer all questions.</p>', md5('e2e-exam-990003'), now() - interval '1 day',
        now() + interval '30 days', 60, 1, 1, 1, 1, 3, 1, false, 1, NULL, false);
INSERT INTO exam_owner (exam_id, user_id) VALUES (990003, 990002);
INSERT INTO exam_language (exam_id, language_code) VALUES (990003, 'en');
INSERT INTO exam_section (id, created, creator_id, name, exam_id, object_version, sequence_number,
                          lottery_on, lottery_item_count, optional, expanded)
VALUES (990002, now(), 990002, 'Section 1', 990003, 1, 0, false, 1, false, false);

-- type 1 MultipleChoice, 3 WeightedMultipleChoice, 5 ClaimChoice, 4 ClozeTest. The cloze markup
-- is what the question editor's cloze plugin writes; the span text is the correct answer.
INSERT INTO question (id, created, creator_id, modified, modifier_id, question, state, default_max_score,
                      default_expected_word_count, object_version, type, default_evaluation_type, shared,
                      default_negative_score_allowed, default_option_shuffling_on)
VALUES (990002, now(), 990002, now(), 990002, '<p>Pick the right answer.</p>', 'SAVED', 2, NULL, 1, 1, 1,
        false, false, false),
       (990003, now(), 990002, now(), 990002, '<p>Pick the good answers.</p>', 'SAVED', NULL, NULL, 1, 3, 1,
        false, false, false),
       (990004, now(), 990002, now(), 990002, '<p>Tests catch regressions.</p>', 'SAVED', NULL, NULL, 1, 5, 1,
        false, false, false),
       (990005, now(), 990002, now(), 990002,
        '<p>The capital of Finland is <span cloze="true" class="cloze-test-wrapper" id="c1" precision="0" case-sensitive="false" numeric="false">Helsinki</span> and two plus two is <span cloze="true" class="cloze-test-wrapper" id="c2" precision="0.5" case-sensitive="false" numeric="true">4</span>.</p>',
        'SAVED', 2, NULL, 1, 4, 1, false, false, false);
INSERT INTO question_owner (question_id, user_id)
VALUES (990002, 990002), (990003, 990002), (990004, 990002), (990005, 990002);

-- claim_choice_type 1 correct, 2 incorrect, 3 skip
INSERT INTO multiple_choice_option (id, option, correct_option, default_score, question_id, object_version,
                                    claim_choice_type)
VALUES (990001, 'Right answer', true, NULL, 990002, 1, NULL),
       (990002, 'Wrong answer', false, NULL, 990002, 1, NULL),
       (990003, 'Good answer A', true, 1, 990003, 1, NULL),
       (990004, 'Good answer B', true, 1, 990003, 1, NULL),
       (990005, 'Bad answer', false, -1, 990003, 1, NULL),
       (990006, 'True', true, 1, 990004, 1, 1),
       (990007, 'False', false, -1, 990004, 1, 2),
       (990008, 'I don''t know', false, 0, 990004, 1, 3);

INSERT INTO exam_section_question (id, exam_section_id, question_id, sequence_number, creator_id, created,
                                   max_score, expected_word_count, evaluation_type, object_version,
                                   negative_score_allowed, option_shuffling_on)
VALUES (990002, 990002, 990002, 0, 990002, now(), 2, NULL, 1, 1, false, false),
       (990003, 990002, 990003, 1, 990002, now(), NULL, NULL, 1, 1, false, false),
       (990004, 990002, 990004, 2, 990002, now(), NULL, NULL, 1, 1, false, false),
       (990005, 990002, 990005, 3, 990002, now(), 2, NULL, 1, 1, false, false);

-- The exam's own copy of each option, with its score; starting the exam fails without them
INSERT INTO exam_section_question_option (id, exam_section_question_id, option_id, answered, score, object_version)
VALUES (990001, 990002, 990001, false, 0, 1),
       (990002, 990002, 990002, false, 0, 1),
       (990003, 990003, 990003, false, 1, 1),
       (990004, 990003, 990004, false, 1, 1),
       (990005, 990003, 990005, false, -1, 1),
       (990006, 990004, 990006, false, 1, 1),
       (990007, 990004, 990007, false, -1, 1),
       (990008, 990004, 990008, false, 0, 1);

-- release_type 1 IMMEDIATE; grade ids 3-8 are grades 0-5 of scale 1
INSERT INTO auto_evaluation_config (id, exam_id, release_type, object_version)
VALUES (990001, 990003, 1, 1);
INSERT INTO grade_evaluation (id, auto_evaluation_config_id, grade_id, percentage, object_version)
VALUES (990001, 990001, 3, 0, 1), (990002, 990001, 4, 50, 1), (990003, 990001, 5, 60, 1),
       (990004, 990001, 6, 70, 1), (990005, 990001, 7, 80, 1), (990006, 990001, 8, 90, 1);

-- A home exam (implementation 3) with an exam event later today ------------------------------
INSERT INTO exam (id, created, creator_id, modified, modifier_id, name, course_id, exam_type_id,
                  instruction, hash, period_start, period_end, duration,
                  object_version, grade_scale_id, execution_type_id, trial_count, state,
                  implementation, anonymous, grading_type, enroll_instruction, shared)
VALUES (990004, now(), 990002, now(), 990002, 'E2E Home Exam', 990001, 2,
        '<p>Answer the essay question.</p>', md5('e2e-exam-990004'), now() - interval '1 day',
        now() + interval '30 days', 60, 1, 1, 1, 1, 3, 3, false, 1, NULL, false);
INSERT INTO exam_owner (exam_id, user_id) VALUES (990004, 990002);
INSERT INTO exam_language (exam_id, language_code) VALUES (990004, 'en');
INSERT INTO exam_section (id, created, creator_id, name, exam_id, object_version, sequence_number,
                          lottery_on, lottery_item_count, optional, expanded)
VALUES (990003, now(), 990002, 'Section 1', 990004, 1, 0, false, 1, false, false);
INSERT INTO exam_section_question (id, exam_section_id, question_id, sequence_number, creator_id, created,
                                   max_score, expected_word_count, evaluation_type, object_version,
                                   negative_score_allowed, option_shuffling_on)
VALUES (990006, 990003, 990001, 0, 990002, now(), 10, 100, 1, 1, false, true);

INSERT INTO examination_event (id, start, description, object_version)
VALUES (990002, now() + interval '30 minutes', 'E2E home event', 1);
INSERT INTO examination_event_configuration (id, examination_event_id, exam_id, object_version)
VALUES (990002, 990002, 990004, 1);

INSERT INTO reservation (id, start_at, end_at, machine_id, user_id, object_version, reminder_sent,
                         sent_as_no_show)
VALUES (990008, now() - interval '5 minutes', now() + interval '55 minutes', 990001, 990012, 1, false, false),
       (990009, now() - interval '5 minutes', now() + interval '55 minutes', 990001, 990013, 1, false, false);
INSERT INTO exam_enrolment (id, user_id, exam_id, reservation_id, enrolled_on, object_version,
                            reservation_canceled, retrial_permitted, no_show, delay)
VALUES (990010, 990012, 990001, 990008, now(), 1, false, false, false, 0),
       (990011, 990013, 990003, 990009, now(), 1, false, false, false, 0);

-- Workaround, remove once fixed in an evolution (README, "Findings"): evolution 58 leaves
-- general_settings_seq behind rows 1-2, so on a fresh database the first two settings the
-- application creates fail with pk_general_settings.
SELECT setval('general_settings_seq',
              GREATEST((SELECT max(id) FROM general_settings), (SELECT last_value FROM general_settings_seq)));

COMMIT;

-- Statistics, as a database in use has them. These tables are far too small for autoanalyze, and
-- without statistics the planner guesses billions of rows for the exam queries' many joins, so
-- Postgres JIT-compiles them: about a second per query, 1.5-2 s per exam load.
ANALYZE;
