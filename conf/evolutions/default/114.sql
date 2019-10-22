-- !Ups
CREATE TABLE examination_event (
    id BIGINT NOT NULL,
    start TIMESTAMPTZ NOT NULL,
    description TEXT NOT NULL,
    object_version BIGINT NOT NULL,
    CONSTRAINT PK_EXAMINATION_EVENT PRIMARY KEY (id)
);
CREATE SEQUENCE examination_event_seq;

CREATE TABLE examination_event_configuration (
    id BIGINT NOT NULL,
    examination_event_id BIGINT NOT NULL,
    exam_id BIGINT NOT NULL,
    encrypted_settings_password BYTEA NOT NULL,
    settings_password_salt VARCHAR(36) NOT NULL,
    config_key VARCHAR(64),
    hash VARCHAR(36) NOT NULL,
    object_version BIGINT NOT NULL,
    CONSTRAINT PK_EXAMINATION_EVENT_EXAM PRIMARY KEY (id)
);
CREATE SEQUENCE examination_event_configuration_seq;
ALTER TABLE examination_event_configuration ADD CONSTRAINT FK_EXAMINATION_EVENT_CONFIGURATION_EXAM
    FOREIGN KEY (exam_id) REFERENCES exam(id);
ALTER TABLE examination_event_configuration ADD CONSTRAINT FK_EXAMINATION_EVENT_CONFIGURATION_EXAMINATION_EVENT
    FOREIGN KEY (examination_event_id) REFERENCES examination_event(id);
CREATE INDEX ix_examination_event_configuration_event ON examination_event_configuration(examination_event_id);
CREATE INDEX ix_examination_event_configuration_exam ON examination_event_configuration(exam_id);

ALTER TABLE exam_enrolment ADD examination_event_id BIGINT NULL;
ALTER TABLE exam_enrolment ADD CONSTRAINT FK_EXAM_ENROLMENT_EXAMINATION_EVENT
    FOREIGN KEY (examination_event_id) REFERENCES examination_event(id);
CREATE INDEX ix_exam_enrolment_examination_event ON exam_enrolment (examination_event_id);

-- !Downs
ALTER TABLE exam_enrolment DROP examination_event_id CASCADE;
DROP TABLE examination_event_configuration CASCADE;
DROP TABLE examination_event CASCADE;
DROP SEQUENCE IF EXISTS examination_event_configuration_seq;
DROP SEQUENCE IF EXISTS examination_event_seq;
