# --- !Ups
ALTER TABLE exam ADD organisations TEXT NULL;

# --- !Downs
ALTER TABLE exam DROP organisations;
