-- !Ups
ALTER TABLE exam ADD requires_user_agent_auth BOOLEAN NOT NULL DEFAULT FALSE;

-- !Downs
ALTER TABLE exam DROP requires_user_agent_auth;
