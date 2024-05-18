-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

ALTER TABLE answer DROP ebean_timestamp;
ALTER TABLE comment DROP ebean_timestamp;
ALTER TABLE question DROP ebean_timestamp;
ALTER TABLE attachment DROP ebean_timestamp;
ALTER TABLE calendar_event DROP ebean_timestamp;
ALTER TABLE evaluation_criteria DROP ebean_timestamp;
ALTER TABLE exception_working_hours DROP ebean_timestamp;
ALTER TABLE evaluation_phrase DROP ebean_timestamp;
ALTER TABLE material DROP ebean_timestamp;
ALTER TABLE exam_score DROP ebean_timestamp;
ALTER TABLE exam DROP ebean_timestamp;
ALTER TABLE multiple_choise_option DROP ebean_timestamp;
ALTER TABLE exam_section DROP ebean_timestamp;
ALTER TABLE grade DROP ebean_timestamp;
ALTER TABLE exam_inspection DROP ebean_timestamp;
ALTER TABLE course DROP ebean_timestamp;
ALTER TABLE accessibility DROP ebean_timestamp;
ALTER TABLE exam_enrolment DROP ebean_timestamp;
ALTER TABLE exam_machine DROP ebean_timestamp;
ALTER TABLE exam_participation DROP ebean_timestamp;
ALTER TABLE exam_record DROP ebean_timestamp;
ALTER TABLE exam_room DROP ebean_timestamp;
ALTER TABLE exam_type DROP ebean_timestamp;
ALTER TABLE general_settings DROP ebean_timestamp;
ALTER TABLE haka_attribute DROP ebean_timestamp;
ALTER TABLE mail_address DROP ebean_timestamp;
ALTER TABLE software DROP ebean_timestamp;
ALTER TABLE mime_type DROP ebean_timestamp;
ALTER TABLE sitnet_users DROP ebean_timestamp;
ALTER TABLE organisation DROP ebean_timestamp;
ALTER TABLE reservation DROP ebean_timestamp;
ALTER TABLE sitnet_role DROP ebean_timestamp;
ALTER TABLE user_language DROP ebean_timestamp;
ALTER TABLE default_working_hours DROP ebean_timestamp;

ALTER TABLE answer ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE comment ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE question ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE attachment ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE calendar_event ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE evaluation_criteria ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE exception_working_hours ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE evaluation_phrase ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE material ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE exam_score ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE exam ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE multiple_choise_option ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE exam_section ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE grade ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE exam_inspection ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE course ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE accessibility ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE exam_enrolment ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE exam_machine ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE exam_participation ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE exam_record ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE exam_room ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE exam_type ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE general_settings ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE haka_attribute ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE mail_address ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE software ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE mime_type ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE sitnet_users ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE organisation ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE reservation ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE sitnet_role ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE user_language ADD ebean_timestamp timestamp NOT NULL DEFAULT now();
ALTER TABLE default_working_hours ADD ebean_timestamp timestamp NOT NULL DEFAULT now();

# --- !Downs

