# --- !Ups
CREATE TABLE exam_feedback_config(
                                   id BIGINT NOT NULL,
                                   exam_id BIGINT NOT NULL,
                                   release_type INT NOT NULL,
                                   release_date TIMESTAMPTZ,
                                   object_version BIGINT NOT NULL,
                                   CONSTRAINT PK_EXAM_FEEDBACK_CONFIG PRIMARY KEY (id)
);
ALTER TABLE exam_feedback_config ADD CONSTRAINT FK_EXAM_FEEDBACK_CONFIG_EXAM
    FOREIGN KEY (exam_id) REFERENCES exam(id);
CREATE SEQUENCE exam_feedback_config_seq;

# --- !Downs
DROP SEQUENCE exam_feedback_config_seq;
DROP TABLE exam_feedback_config;

