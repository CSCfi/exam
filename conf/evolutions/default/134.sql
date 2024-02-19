# --- !Ups
ALTER TABLE exam_enrolment ADD delay INT NOT NULL DEFAULT 0;

# --- !Downs
ALTER TABLE exam_enrolment DROP delay;
