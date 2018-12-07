# --- !Ups
ALTER TABLE exam_participation ADD collaborative_exam_id BIGINT NULL;
ALTER TABLE exam_participation
  ADD CONSTRAINT FK_EXAM_PARTICIPATION_COLLABORATIVE_EXAM FOREIGN KEY (collaborative_exam_id) REFERENCES collaborative_exam (id);
CREATE INDEX IX_EXAM_PARTICIPATION_COLLABORATIVE_EXAM
  ON exam_participation (collaborative_exam_id);

# --- !Downs
ALTER TABLE exam_participation DROP collaborative_exam_id CASCADE;
