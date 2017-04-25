# --- !Ups
CREATE TABLE cloze_test_answer (
  id BIGINT NOT NULL,
  answer TEXT,
  object_version BIGINT NOT NULL,
  CONSTRAINT PK_CLOZE_TEST_ANSWER PRIMARY KEY (id)
);
CREATE SEQUENCE cloze_test_answer_seq;

ALTER TABLE exam_section_question ADD cloze_test_answer_id BIGINT;
ALTER TABLE exam_section_question ADD CONSTRAINT fk_cloze_test_answer FOREIGN KEY (cloze_test_answer_id) REFERENCES cloze_test_answer (id);
CREATE INDEX IX_EXAM_SECTION_QUESTION_CLOZE_TEST_ANSWER ON exam_section_question (cloze_test_answer_id);

# --- !Downs
DROP INDEX IX_EXAM_SECTION_QUESTION_CLOZE_TEST_ANSWER;
ALTER TABLE exam_section_question DROP cloze_test_answer_id CASCADE;
DROP TABLE cloze_test_answer CASCADE;
DROP SEQUENCE cloze_test_answer_seq;
