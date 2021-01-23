# --- !Ups
ALTER TABLE app_user ADD last_login TIMESTAMPTZ;

# --- !Downs
ALTER TABLE app_user DROP last_login;