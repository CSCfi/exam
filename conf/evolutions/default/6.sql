# --- !Ups

ALTER TABLE calendar_event ADD id BIGINT DEFAULT 0 not null;
ALTER TABLE calendar_event ADD constraint pk_calendar_event primary key (id);
ALTER TABLE calendar_event ADD ebean_timestamp BIGINT DEFAULT 0;

ALTER TABLE default_working_hours ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE exception_working_hours ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE exam_score ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE multiple_choise_option ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE course ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE accessibility ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE exam_enrolment ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE exam_inspection ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE exam_machine ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE exam_participation ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE exam_record ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE exam_room ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE exam_type ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE general_settings ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE haka_attribute ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE mail_address ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE mime_type ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE organisation ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE reservation ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE sitnet_role ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE software ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE sitnet_users ADD ebean_timestamp BIGINT DEFAULT 0;
ALTER TABLE user_language ADD ebean_timestamp BIGINT DEFAULT 0;

# --- !Downs

ALTER TABLE calendar_event DROP id;
ALTER TABLE calendar_event DROP ebean_timestamp;

ALTER TABLE default_working_hours DROP ebean_timestamp;
ALTER TABLE exception_working_hours DROP ebean_timestamp;
ALTER TABLE exam_score DROP ebean_timestamp;
ALTER TABLE multiple_choise_option DROP ebean_timestamp;
ALTER TABLE course DROP ebean_timestamp;
ALTER TABLE accessibility DROP ebean_timestamp;
ALTER TABLE exam_enrolment DROP ebean_timestamp;
ALTER TABLE exam_inspection DROP ebean_timestamp;
ALTER TABLE exam_machine DROP ebean_timestamp;
ALTER TABLE exam_participation DROP ebean_timestamp;
ALTER TABLE exam_record DROP ebean_timestamp;
ALTER TABLE exam_room DROP ebean_timestamp;
ALTER TABLE exam_type DROP ebean_timestamp;
ALTER TABLE general_settings DROP ebean_timestamp;
ALTER TABLE haka_attribute DROP ebean_timestamp;
ALTER TABLE mail_ADDress DROP ebean_timestamp;
ALTER TABLE mime_type DROP ebean_timestamp;
ALTER TABLE organisation DROP ebean_timestamp;
ALTER TABLE reservation DROP ebean_timestamp;
ALTER TABLE sitnet_role DROP ebean_timestamp;
ALTER TABLE software DROP ebean_timestamp;
ALTER TABLE sitnet_users DROP ebean_timestamp;
ALTER TABLE user_language DROP ebean_timestamp;
