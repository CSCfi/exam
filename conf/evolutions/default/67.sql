# --- !Ups
ALTER TABLE exam DROP grade;
ALTER TABLE exam DROP exam_grade_id;

# --- !Downs
ALTER TABLE exam ADD grade VARCHAR(255);
ALTER TABLE exam ADD exam_grade_id BIGINT;

