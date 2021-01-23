# --- !Ups
ALTER TABLE exam_section_question ADD id BIGINT;
ALTER TABLE exam_section_question DROP CONSTRAINT pk_exam_section_question;
CREATE SEQUENCE exam_section_question_seq;
UPDATE exam_section_question SET id = nextval('exam_section_question_seq');
ALTER TABLE exam_section_question ADD CONSTRAINT pk_exam_section_question PRIMARY KEY (id);
ALTER TABLE exam_section_question ADD CONSTRAINT ak_exam_section_question UNIQUE (exam_section_id, question_id);

# --- !Downs
ALTER TABLE exam_section_question DROP COLUMN id;
ALTER TABLE exam_section_question DROP CONSTRAINT ak_exam_section_question;
DROP SEQUENCE exam_section_question_seq;
ALTER TABLE exam_section_question ADD CONSTRAINT pk_exam_section_question PRIMARY KEY (exam_section_id, question_id);
