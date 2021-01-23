# --- !Ups
ALTER TABLE grade_scale ALTER display_name TYPE VARCHAR(201);

# --- !Downs
ALTER TABLE grade_scale ALTER display_name TYPE VARCHAR(32);
