# --- !Ups
ALTER TABLE exam ADD internal_ref VARCHAR(128) NULL;

# --- !Downs
ALTER TABLE exam DROP internal_ref;
