# --- !Ups
ALTER TABLE exam_record DROP recorded_on;

CREATE TABLE auto_evaluation_config (
  id BIGINT NOT NULL,
  exam_id BIGINT NOT NULL,
  release_type INTEGER NOT NULL,
  release_date TIMESTAMPTZ,
  amount_days INTEGER,
  object_version BIGINT NOT NULL,
  CONSTRAINT PK_AUTO_EVALUATION_CONFIG PRIMARY KEY (id)
);
ALTER TABLE auto_evaluation_config ADD CONSTRAINT FK_AUTO_EVALUATION_EXAM FOREIGN KEY (exam_id) REFERENCES exam(id);
CREATE SEQUENCE auto_evaluation_config_seq;

CREATE TABLE grade_evaluation (
  id BIGINT NOT NULL,
  auto_evaluation_config_id BIGINT NOT NULL,
  grade_id INTEGER NOT NULL,
  percentage INTEGER NOT NULL DEFAULT 0,
  object_version BIGINT NOT NULL,
  CONSTRAINT PK_GRADE_EVALUATION PRIMARY KEY (id)
);
ALTER TABLE grade_evaluation ADD CONSTRAINT FK_GRADE_EVALUATION_CONFIG FOREIGN KEY (auto_evaluation_config_id) REFERENCES auto_evaluation_config(id);
ALTER TABLE grade_evaluation ADD CONSTRAINT FK_GRADE_EVALUATION_GRADE FOREIGN KEY (grade_id) REFERENCES grade(id);
CREATE SEQUENCE grade_evaluation_seq;

# --- !Downs
DROP TABLE grade_evaluation CASCADE;
DROP SEQUENCE grade_evaluation_seq;

DROP TABLE auto_evaluation_config CASCADE;
DROP SEQUENCE auto_evaluation_config_seq;

ALTER TABLE exam_record ADD recorded_on TIMESTAMPTZ;
