# --- !Ups
ALTER TABLE exam_owner ALTER COLUMN user_id TYPE BIGINT;
ALTER TABLE exam_owner ALTER COLUMN exam_id TYPE BIGINT;

# --- !Downs
-- No going back