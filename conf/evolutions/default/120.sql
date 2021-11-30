# --- !Ups

ALTER TABLE attachment ALTER COLUMN file_name TYPE TEXT using file_name;
ALTER TABLE attachment ALTER COLUMN file_path TYPE TEXT using file_path;

# --- !Downs

ALTER TABLE attachment ALTER COLUMN file_name TYPE VARCHAR(255);
ALTER TABLE attachment ALTER COLUMN file_path TYPE VARCHAR(255);
