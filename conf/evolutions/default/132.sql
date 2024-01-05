# --- !Ups
ALTER TABLE examination_event_configuration ADD encrypted_quit_password BYTEA NULL;
ALTER TABLE examination_event_configuration ADD quit_password_salt VARCHAR(36) NULL;
# --- !Downs
ALTER TABLE examination_event_configuration DROP encrypted_quit_password;
ALTER TABLE examination_event_configuration DROP quit_password_salt;
