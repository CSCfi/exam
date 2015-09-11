# --- !Ups
ALTER TABLE question ADD foo INTEGER;
UPDATE question SET foo = 1 WHERE type = 'MultipleChoiceQuestion';
UPDATE question SET foo = 2 WHERE type = 'EssayQuestion';
UPDATE question SET foo = 3 WHERE type = 'WeightedMultipleChoiceQuestion';
ALTER TABLE question ALTER foo SET NOT NULL;
ALTER TABLE question DROP type;
ALTER TABLE question RENAME COLUMN foo TO type;

# --- !Downs
ALTER TABLE question ADD foo VARCHAR(255);
UPDATE question SET foo = 'MultipleChoiceQuestion' WHERE type = 1;
UPDATE question SET foo = 'EssayQuestion' WHERE type = 2;
UPDATE question SET foo = 'WeightedMultipleChoiceQuestion' WHERE type = 3;
ALTER TABLE question ALTER foo SET NOT NULL;
ALTER TABLE question DROP type;
ALTER TABLE question RENAME COLUMN foo TO type;
