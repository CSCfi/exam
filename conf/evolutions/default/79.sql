# --- !Ups
-- make answer essay specific
ALTER TABLE answer RENAME TO essay_answer;
ALTER SEQUENCE answer_seq RENAME TO essay_answer_seq;
ALTER TABLE essay_answer DROP type;
ALTER TABLE essay_answer ADD evaluated_score INTEGER;
UPDATE essay_answer ea SET evaluated_score = (SELECT CAST(evaluated_score AS INT) FROM question q WHERE q.answer_id = ea.id and q.type=2);

-- move exam specific information from question to exam_section_question
ALTER TABLE exam_section_question ADD creator_id BIGINT;
ALTER TABLE exam_section_question ADD created TIMESTAMPTZ;
ALTER TABLE exam_section_question ADD modifier_id BIGINT;
ALTER TABLE exam_section_question ADD modified TIMESTAMPTZ;
ALTER TABLE exam_section_question ADD max_score INTEGER;
ALTER TABLE exam_section_question ADD essay_answer_id BIGINT;
ALTER TABLE exam_section_question ADD answer_instructions TEXT;
ALTER TABLE exam_section_question ADD evaluation_criteria TEXT;
ALTER TABLE exam_section_question ADD expected_word_count INTEGER;
ALTER TABLE exam_section_question ADD evaluation_type INTEGER;
ALTER TABLE exam_section_question ADD object_version BIGINT;

ALTER TABLE exam_section_question ADD CONSTRAINT fk_exam_section_question_creator FOREIGN KEY (creator_id) REFERENCES app_user(id);
ALTER TABLE exam_section_question ADD CONSTRAINT fk_exam_section_question_modifier FOREIGN KEY (modifier_id) REFERENCES app_user(id);
ALTER TABLE exam_section_question ADD CONSTRAINT fk_exam_section_question_answer FOREIGN KEY (essay_answer_id) REFERENCES essay_answer(id);
ALTER TABLE exam_section_question ADD CONSTRAINT ak_exam_section_question_answer UNIQUE (essay_answer_id);

CREATE INDEX ix_esq_creator ON exam_section_question(creator_id);
CREATE INDEX ix_esq_modifier ON exam_section_question(modifier_id);
CREATE INDEX ix_esq_answer ON exam_section_question(essay_answer_id);

-- downsize these as we are making them int values
UPDATE question SET max_score = 2147483647 WHERE max_score > 2147483647;
UPDATE question SET expected_word_count = 2147483647 WHERE expected_word_count > 2147483647;

UPDATE exam_section_question esq SET creator_id = (SELECT creator_id FROM question q WHERE q.id = esq.question_id);
UPDATE exam_section_question esq SET created = (SELECT created FROM question q WHERE q.id = esq.question_id);
UPDATE exam_section_question esq SET modifier_id = (SELECT modifier_id FROM question q WHERE q.id = esq.question_id);
UPDATE exam_section_question esq SET modified = (SELECT modified FROM question q WHERE q.id = esq.question_id);
UPDATE exam_section_question esq SET max_score = (SELECT CAST(max_score AS INT) FROM question q WHERE q.id = esq.question_id);
UPDATE exam_section_question esq SET essay_answer_id = (SELECT answer_id FROM question q WHERE q.id = esq.question_id AND q.type=2);
UPDATE exam_section_question esq SET answer_instructions = (SELECT instruction FROM question q WHERE q.id = esq.question_id);
UPDATE exam_section_question esq SET evaluation_criteria = (SELECT evaluation_criterias FROM question q WHERE q.id = esq.question_id);
UPDATE exam_section_question esq SET expected_word_count = (SELECT CAST(expected_word_count AS INT) FROM question q WHERE q.id = esq.question_id);
UPDATE exam_section_question esq SET evaluation_type = (
  SELECT CASE WHEN evaluation_type = 'Points' THEN 1 ELSE 2 END FROM question q WHERE q.evaluation_type IS NOT NULL AND q.id = esq.question_id
);
UPDATE exam_section_question SET object_version = 1;

ALTER TABLE exam_section_question ALTER COLUMN object_version SET NOT NULL;

-- mcq option scoring override
CREATE SEQUENCE exam_section_question_option_seq;

SELECT * INTO exam_section_question_option FROM (
  SELECT nextval('exam_section_question_option_seq') AS id, esq.id AS exam_section_question_id, o.id AS option_id,
    o.answer_id IS NOT NULL AS answered, o.score, 1 AS object_version
  FROM exam_section_question esq
  LEFT OUTER JOIN question q
  ON esq.question_id = q.id
  LEFT OUTER JOIN multiple_choice_option o
  ON q.id = o.question_id
  WHERE q.type IN (1, 3) AND o.id IS NOT NULL
  ) AS option_scores;

ALTER TABLE exam_section_question_option ALTER id SET NOT NULL;
ALTER TABLE exam_section_question_option ALTER exam_section_question_id SET NOT NULL;
ALTER TABLE exam_section_question_option ALTER option_id SET NOT NULL;

ALTER TABLE exam_section_question_option ADD CONSTRAINT pk_exam_section_question_option
  PRIMARY KEY (id);
ALTER TABLE exam_section_question_option ADD CONSTRAINT fk_exam_section_question_option_esq
  FOREIGN KEY (exam_section_question_id) REFERENCES exam_section_question(id);
ALTER TABLE exam_section_question_option ADD CONSTRAINT fk_exam_section_question_option_option
  FOREIGN KEY (option_id) REFERENCES multiple_choice_option(id);

CREATE INDEX ix_exam_section_question_option_esq ON exam_section_question_option(exam_section_question_id);
CREATE INDEX ix_exam_section_question_option_option ON exam_section_question_option(option_id);

-- rename to reflect the new nature of data
ALTER TABLE question RENAME max_score TO default_max_score;
ALTER TABLE question RENAME instruction TO default_answer_instructions;
ALTER TABLE question RENAME evaluation_criterias TO default_evaluation_criteria;
ALTER TABLE question RENAME expected_word_count TO default_expected_word_count;
ALTER TABLE question ADD default_evaluation_type INTEGER;
UPDATE question SET default_evaluation_type = 1 WHERE evaluation_type = 'Points';
UPDATE question SET default_evaluation_type = 2 WHERE evaluation_type = 'Select';
ALTER TABLE question DROP evaluation_type;

ALTER TABLE multiple_choice_option RENAME score TO default_score;

-- no longer needed as basic question data
ALTER TABLE question DROP answer_id;
ALTER TABLE question DROP evaluated_score;

-- redundant stuff
ALTER TABLE question DROP comments_id;
ALTER TABLE question DROP hash;
ALTER TABLE question DROP expanded;

-- no longer needed as mco data
ALTER TABLE multiple_choice_option DROP answer_id;

-- remove redundant answer rows (not tied to essay questions)
DELETE FROM essay_answer WHERE id NOT IN (SELECT essay_answer_id from exam_section_question WHERE essay_answer_id IS NOT NULL);

-- decouple exam questions from their current prototype questions
UPDATE question SET parent_id = NULL WHERE parent_id IN (SELECT id FROM question WHERE parent_id IS NULL);

# --- !Downs

-- use backup :)
