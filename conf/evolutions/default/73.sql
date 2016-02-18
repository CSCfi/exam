# --- !Ups
ALTER TABLE exam ADD auto_evaluation_notified TIMESTAMPTZ;

# --- !Downs
ALTER TABLE exam DROP auto_evaluation_notified;
