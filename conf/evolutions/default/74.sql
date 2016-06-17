# --- !Ups
ALTER TABLE app_user ADD CONSTRAINT ak_app_user_eppn UNIQUE (eppn);

# --- !Downs
ALTER TABLE app_user DROP CONSTRAINT ak_app_user_eppn;
