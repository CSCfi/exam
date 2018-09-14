# --- !Ups
ALTER TABLE exam_enrolment
  ADD COLUMN sent_for_review TIMESTAMPTZ NULL;

# --- !Downs
ALTER TABLE exam_enrolment
  DROP COLUMN sent_for_review;

