# --- !Ups
ALTER TABLE sitnet_role RENAME TO "role";
ALTER TABLE sitnet_users RENAME TO app_user;
ALTER TABLE sitnet_users_sitnet_role RENAME TO app_user_role;
ALTER TABLE app_user_role RENAME sitnet_role_id TO role_id;
ALTER TABLE app_user_role RENAME sitnet_users_id TO app_user_id;
ALTER SEQUENCE sitnet_role_seq RENAME TO role_seq;
ALTER SEQUENCE sitnet_users_seq RENAME TO app_user_seq;

# --- !Downs
-- No going back