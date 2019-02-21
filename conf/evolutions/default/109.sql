# --- !Ups
ALTER TABLE exam_execution_type
  ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;

# --- !Downs
ALTER TABLE exam_execution_type
  DROP COLUMN active;
