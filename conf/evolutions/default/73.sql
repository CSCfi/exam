# --- !Ups
ALTER TABLE exam_participation ADD auto_evaluation_notified TIMESTAMPTZ;

# --- !Downs
ALTER TABLE exam_participation DROP auto_evaluation_notified;
