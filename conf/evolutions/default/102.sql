# --- !Ups
ALTER TABLE exam_enrolment
  ADD COLUMN collaborative_exam_id BIGINT;

ALTER TABLE exam_enrolment
  ADD CONSTRAINT FK_EXAM_ENROLMENT_COLLABORATIVE_EXAM FOREIGN KEY (collaborative_exam_id) REFERENCES collaborative_exam (id);

CREATE INDEX IX_EXAM_ENROLMENT_COLLABORATIVE_EXAM
  ON exam_enrolment (collaborative_exam_id);

ALTER TABLE collaborative_exam ADD COLUMN name VARCHAR(255);
ALTER TABLE collaborative_exam ADD COLUMN exam_active_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE collaborative_exam ADD COLUMN exam_active_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE collaborative_exam ADD COLUMN enroll_instruction TEXT;
ALTER TABLE collaborative_exam ADD COLUMN duration INTEGER;
ALTER TABLE collaborative_exam ADD COLUMN hash VARCHAR(32);
ALTER TABLE collaborative_exam ADD COLUMN state INTEGER;

# --- !Downs
ALTER TABLE collaborative_exam DROP COLUMN name;
ALTER TABLE collaborative_exam DROP COLUMN exam_active_start_date;
ALTER TABLE collaborative_exam DROP COLUMN exam_active_end_date;
ALTER TABLE collaborative_exam DROP COLUMN enroll_instruction;
ALTER TABLE collaborative_exam DROP COLUMN duration;
ALTER TABLE collaborative_exam DROP COLUMN hash;
ALTER TABLE collaborative_exam DROP COLUMN state;

ALTER TABLE exam_enrolment
  DROP COLUMN collaborative_exam_id CASCADE;

