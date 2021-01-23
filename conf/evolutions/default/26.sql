# --- !Ups
ALTER TABLE exam ADD additional_info VARCHAR;

# --- !Downs
ALTER TABLE exam DROP additional_info;