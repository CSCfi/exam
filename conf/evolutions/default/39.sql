# --- !Ups
ALTER TABLE exam_enrolment ADD reservation_canceled BOOLEAN NOT NULL DEFAULT FALSE;

# --- !Downs
ALTER TABLE exam_enrolment DROP reservation_canceled;
