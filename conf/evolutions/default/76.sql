# --- !Ups
ALTER TABLE exam_section ADD sequence_number INTEGER;
UPDATE exam_section
SET sequence_number = sq.sequence_number - 1
FROM (
       SELECT id, row_number() OVER (PARTITION BY exam_id ORDER BY id) AS sequence_number
       FROM exam_section
     )
  AS sq
WHERE exam_section.id = sq.id;

ALTER TABLE exam_section ALTER COLUMN sequence_number SET NOT NULL;

# --- !Downs
ALTER TABLE exam_section DROP sequence_number;
