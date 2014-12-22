# --- !Ups

ALTER TABLE exam RENAME COLUMN other_grading to custom_credit;

ALTER TABLE exam_section_question ADD COLUMN sequence_number INTEGER NULL;

WITH new_sequences AS (
    SELECT exam_section_id, question_id, row_number()
        OVER (PARTITION BY exam_section_id ORDER BY question_id) AS sequence_number
    FROM exam_section_question
)
UPDATE exam_section_question
SET sequence_number = ns.sequence_number - 1
FROM new_sequences ns
WHERE ns.exam_section_id = exam_section_question.exam_section_id
AND ns.question_id = exam_section_question.question_id;

ALTER TABLE exam_section_question ALTER COLUMN sequence_number SET NOT NULL;

# --- !Downs

ALTER TABLE exam RENAME COLUMN custom_credit to other_grading;
ALTER TABLE exam_section_question DROP COLUMN sequence_number;
