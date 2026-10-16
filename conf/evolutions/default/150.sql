-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

-- Date columns the student data retention job selects its candidates by
CREATE INDEX ix_exam_participation_ended ON exam_participation (ended);
CREATE INDEX ix_exam_enrolment_enrolled_on ON exam_enrolment (enrolled_on);
CREATE INDEX ix_exam_record_time_stamp ON exam_record (time_stamp);
CREATE INDEX ix_exam_graded_time ON exam (graded_time);
CREATE INDEX ix_app_user_last_login ON app_user (last_login);
CREATE INDEX ix_external_exam_sent ON external_exam (sent);
CREATE INDEX ix_examination_event_start ON examination_event (start);

# --- !Downs

DROP INDEX ix_examination_event_start;
DROP INDEX ix_external_exam_sent;
DROP INDEX ix_app_user_last_login;
DROP INDEX ix_exam_graded_time;
DROP INDEX ix_exam_record_time_stamp;
DROP INDEX ix_exam_enrolment_enrolled_on;
DROP INDEX ix_exam_participation_ended;
