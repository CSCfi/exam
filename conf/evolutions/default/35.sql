# --- !Ups
ALTER TABLE software ADD COLUMN status VARCHAR(255);
UPDATE software SET status = 'ACTIVE';

# --- !Downs
ALTER TABLE software DROP COLUMN status;
