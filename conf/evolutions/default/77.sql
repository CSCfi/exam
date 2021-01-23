# --- !Ups
ALTER TABLE exam_section ADD COLUMN description TEXT;

# --- !Downs
ALTER TABLE exam_section DROP COLUMN description;