# --- !Ups
ALTER TABLE exam_enrolment ADD information TEXT;

# --- !Downs
ALTER TABLE exam_enrolment DROP information;