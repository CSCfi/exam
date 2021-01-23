# --- !Ups
ALTER TABLE grade ADD marks_rejection BOOLEAN NULL;
UPDATE grade SET marks_rejection = TRUE WHERE name IN ('REJECTED', '0', 'I', '0/5', 'HYL');

# --- !Downs
ALTER TABLE grade DROP marks_rejection;
