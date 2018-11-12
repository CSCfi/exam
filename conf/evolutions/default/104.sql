# --- !Ups
ALTER TABLE exam
  ADD COLUMN anonymous BOOLEAN NOT NULL DEFAULT FALSE;

# --- !Downs
ALTER TABLE exam
  DROP COLUMN anonymous;

