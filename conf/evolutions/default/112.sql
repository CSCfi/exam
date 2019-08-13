-- !Ups
ALTER TABLE exam ADD requires_user_agent_auth BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE exam ADD encrypted_settings_password BYTEA NULL;
ALTER TABLE exam ADD settings_password_salt VARCHAR(36) NULL;


-- !Downs
ALTER TABLE exam DROP settings_password_salt;
ALTER TABLE exam DROP encrypted_settings_password;
ALTER TABLE exam DROP requires_user_agent_auth;

