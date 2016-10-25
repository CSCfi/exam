# --- !Ups
CREATE TABLE inspection_comment (
  id                     BIGINT      NOT NULL,
  exam_id                BIGINT      NOT NULL,
  comment                TEXT        NOT NULL,
  created                TIMESTAMPTZ NOT NULL,
  creator_id             BIGINT      NOT NULL,
  modified               TIMESTAMPTZ NOT NULL,
  modifier_id            BIGINT      NOT NULL,
  object_version BIGINT,
  CONSTRAINT PK_INSPECTION_COMMENT PRIMARY KEY (id)
);
ALTER TABLE inspection_comment ADD CONSTRAINT fk_inspection_comment_exam FOREIGN KEY (exam_id) REFERENCES exam (id);
ALTER TABLE inspection_comment ADD CONSTRAINT fk_inspection_comment_modifier FOREIGN KEY (modifier_id) REFERENCES app_user (id);
ALTER TABLE inspection_comment ADD CONSTRAINT fk_inspection_comment_creator FOREIGN KEY (creator_id) REFERENCES app_user (id);

CREATE SEQUENCE inspection_comment_seq;

-- add missing sequences
CREATE INDEX IX_RESERVATION_EXTERNAL_RESERVATION ON reservation (external_reservation_id);
CREATE INDEX IX_GRADE_EVAL_AUTOEVAL_CONFIG ON grade_evaluation (auto_evaluation_config_id);
CREATE INDEX IX_GRADE_EVAL_GRADE ON grade_evaluation (grade_id);
CREATE INDEX IX_AUTOEVAL_CONFIG_EXAM ON auto_evaluation_config (exam_id);
CREATE INDEX IX_LANG_INSPECTION_MODIFIER ON language_inspection (modifier_id);
CREATE INDEX IX_INSPECTION_COMMENT_EXAM ON inspection_comment (exam_id);
CREATE INDEX IX_INSPECTION_COMMENT_CREATOR ON inspection_comment (creator_id);
CREATE INDEX IX_INSPECTION_COMMENT_MODIFIER ON inspection_comment (modifier_id);


# --- !Downs
DROP INDEX IX_RESERVATION_EXTERNAL_RESERVATION;
DROP INDEX IX_GRADE_EVAL_AUTOEVAL_CONFIG;
DROP INDEX IX_GRADE_EVAL_GRADE;
DROP INDEX IX_AUTOEVAL_CONFIG_EXAM;
DROP INDEX IX_LANG_INSPECTION_MODIFIER;
DROP INDEX IX_INSPECTION_COMMENT_EXAM;
DROP INDEX IX_INSPECTION_COMMENT_CREATOR;
DROP INDEX IX_INSPECTION_COMMENT_MODIFIER;

DROP SEQUENCE inspection_comment_seq;
DROP TABLE inspection_comment CASCADE;
