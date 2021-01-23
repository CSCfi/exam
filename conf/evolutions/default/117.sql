# --- !Ups
ALTER TABLE exam ADD implementation INTEGER NOT NULL DEFAULT 1;
UPDATE exam SET implementation = 2 where requires_user_agent_auth IS TRUE;
ALTER TABLE exam DROP requires_user_agent_auth;

ALTER TABLE examination_event_configuration ALTER encrypted_settings_password DROP NOT NULL;
ALTER TABLE examination_event_configuration ALTER settings_password_salt DROP NOT NULL;
ALTER TABLE examination_event_configuration ALTER hash DROP NOT NULL;

# --- !Downs
-- can't undo really
UPDATE examination_event_configuration SET encrypted_settings_password = 'password' where encrypted_settings_password IS NULL;
UPDATE examination_event_configuration SET settings_password_salt = 'password' where encrypted_settings_password IS NULL;
UPDATE examination_event_configuration SET hash = md5('password') where hash IS NULL;

ALTER TABLE exam ADD requires_user_agent_auth BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE exam SET requires_user_agent_auth = true where exam.implementation = 2;
ALTER TABLE exam DROP implementation;

