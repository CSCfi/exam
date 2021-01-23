# --- !Ups
ALTER TABLE exam_score ADD institution_name VARCHAR(255) NULL;

# --- !Downs
ALTER TABLE exam_score DROP institution_name;
