# --- !Ups
ALTER TABLE question DROP COLUMN question_type;
ALTER TABLE question ALTER type SET NOT NULL;
ALTER TABLE answer DROP COLUMN answer_type;
ALTER TABLE answer ALTER type SET NOT NULL;

# --- !Downs
-- No going back