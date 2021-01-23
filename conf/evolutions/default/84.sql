# --- !Ups
ALTER TABLE exam_section_question ALTER COLUMN max_score TYPE DOUBLE PRECISION;
ALTER TABLE essay_answer ALTER COLUMN evaluated_score TYPE DOUBLE PRECISION;

# --- !Downs
ALTER TABLE essay_answer ALTER COLUMN evaluated_score TYPE INTEGER;
ALTER TABLE exam_section_question ALTER COLUMN max_score TYPE INTEGER;

