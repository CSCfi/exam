# --- !Ups
ALTER TABLE exam_score ADD lecturer_first_name VARCHAR(255) NULL;
ALTER TABLE exam_score ADD lecturer_last_name VARCHAR(255) NULL;

# --- !Downs
ALTER TABLE exam_score DROP lecturer_first_name;
ALTER TABLE exam_score DROP lecturer_last_name;
