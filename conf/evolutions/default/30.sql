# --- !Ups
ALTER TABLE exam_room ADD local_timezone VARCHAR(32);
UPDATE exam_room SET local_timezone = 'Europe/Helsinki';

# --- !Downs
ALTER TABLE exam_room DROP local_timezone;