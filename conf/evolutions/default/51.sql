# --- !Ups
ALTER TABLE exam ADD trial_count INTEGER;

# --- !Downs
ALTER TABLE exam DROP trial_count;