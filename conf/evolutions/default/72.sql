# --- !Ups
CREATE TABLE auto_evaluation (
  id BIGINT NOT NULL,
  exam_id BIGINT NOT NULL,
  grade_id INTEGER NOT NULL,
  percentage INTEGER NOT NULL DEFAULT 0,
  object_version BIGINT NOT NULL,
  CONSTRAINT PK_AUTO_EVALUATION PRIMARY KEY (id)
);
ALTER TABLE auto_evaluation ADD CONSTRAINT FK_AUTO_EVALUATION_EXAM FOREIGN KEY (exam_id) REFERENCES exam(id);
ALTER TABLE auto_evaluation ADD CONSTRAINT FK_AUTO_EVALUATION_GRADE FOREIGN KEY (grade_id) REFERENCES grade(id);
CREATE SEQUENCE auto_evaluation_seq;

# --- !Downs
DROP TABLE auto_evaluation CASCADE;
DROP SEQUENCE auto_evaluation_seq;
