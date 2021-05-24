# --- !Ups

ALTER TABLE grade_scale ALTER COLUMN external_ref TYPE VARCHAR(255);

# --- !Downs
-- can't undo really
ALTER TABLE grade_scale ALTER COLUMN external_ref TYPE INT using external_ref::integer;

