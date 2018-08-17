# --- !Ups
ALTER TABLE exam_enrolment
  ADD COLUMN collaborative_exam_id BIGINT;

ALTER TABLE exam_enrolment
  ADD CONSTRAINT FK_EXAM_ENROLMENT_COLLABORATIVE_EXAM FOREIGN KEY (collaborative_exam_id) REFERENCES collaborative_exam (id);

CREATE INDEX IX_EXAM_ENROLMENT_COLLABORATIVE_EXAM
  ON exam_enrolment (collaborative_exam_id);

# --- !Downs
ALTER TABLE exam_enrolment
  DROP COLUMN collaborative_exam_id CASCADE;

DROP INDEX IX_EXAM_ENROLMENT_COLLABORATIVE_EXAM;
