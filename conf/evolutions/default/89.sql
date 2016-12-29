# --- !Ups
CREATE TABLE examination_date (
  id BIGINT NOT NULL,
  date DATE NOT NULL,
  exam_id BIGINT NOT NULL,
  object_version BIGINT NOT NULL,
  CONSTRAINT PK_EXAMINATION_DATE PRIMARY KEY (id)
);
ALTER TABLE examination_date ADD CONSTRAINT FK_EXAMINATION_DATE_EXAM FOREIGN KEY (exam_id) REFERENCES exam(id);
CREATE SEQUENCE examination_date_seq;
CREATE INDEX IX_EXAMINATION_DATE_EXAM ON examination_date (exam_id);

ALTER TABLE exam ADD question_sheet_return_policy BOOLEAN DEFAULT FALSE;

# --- !Downs
ALTER TABLE exam DROP question_sheet_return_policy;
DROP SEQUENCE examination_date_seq;
DROP TABLE examination_date CASCADE;
