# --- !Ups
ALTER TABLE collaborative_exam
  ADD COLUMN anonymous BOOLEAN NOT NULL DEFAULT TRUE;

# --- !Downs
ALTER TABLE collaborative_exam
  DROP COLUMN anonymous;

