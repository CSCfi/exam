# --- !Ups
ALTER TABLE multiple_choice_option ADD answer_id BIGINT;
ALTER TABLE multiple_choice_option ADD CONSTRAINT fk_multiple_choice_option_answer FOREIGN KEY (answer_id) REFERENCES answer(id);
UPDATE multiple_choice_option opt SET answer_id = (SELECT id FROM answer WHERE option_id = opt.id);
ALTER TABLE answer DROP option_id CASCADE;

ALTER TABLE answer ADD foo INTEGER;
UPDATE answer SET foo = 1 WHERE type = 'MultipleChoiceAnswer';
UPDATE answer SET foo = 1 WHERE type = 'MultipleChoiseAnswer'; -- TYPOS STILL IN THE TABLE, FIX IT NOW
UPDATE answer SET foo = 2 WHERE type = 'EssayAnswer';
UPDATE answer SET foo = 3 WHERE type = 'WeightedMultipleChoiceAnswer';
ALTER TABLE answer ALTER foo SET NOT NULL;
ALTER TABLE answer DROP type;
ALTER TABLE answer RENAME COLUMN foo TO type;


# --- !Downs
ALTER TABLE answer ADD foo VARCHAR(255);
UPDATE answer SET foo = 'MultipleChoiceAnswer' WHERE type = 1;
UPDATE answer SET foo = 'EssayAnswer' WHERE type = 2;
UPDATE answer SET foo = 'WeightedMultipleChoiceAnswer' WHERE type = 3;
ALTER TABLE answer ALTER foo SET NOT NULL;
ALTER TABLE answer DROP type;
ALTER TABLE answer RENAME COLUMN foo TO type;

ALTER TABLE answer ADD option_id BIGINT;
ALTER TABLE answer ADD CONSTRAINT fk_answer_multiple_choice_option FOREIGN KEY (option_id) REFERENCES multiple_choice_option(id);
UPDATE answer ans set option_id = (SELECT id FROM multiple_choice_option WHERE answer_id = ans.id);
ALTER TABLE multiple_choice_option DROP answer_id CASCADE;
