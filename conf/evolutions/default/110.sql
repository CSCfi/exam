# --- !Ups
ALTER TABLE exam_section_question
  ADD COLUMN forced_score DECIMAL NULL;

# --- !Downs
ALTER TABLE exam_section_question
  DROP COLUMN forced_score;
