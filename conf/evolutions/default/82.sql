# --- !Ups
ALTER TABLE exam_room ADD external_ref VARCHAR(32);

# --- !Downs
ALTER TABLE exam_room DROP external_ref;

