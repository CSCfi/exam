# --- !Ups
ALTER TABLE exam_participation
  ADD COLUMN sent_for_review TIMESTAMPTZ NULL;

# --- !Downs
ALTER TABLE exam_participation
  DROP COLUMN sent_for_review;

