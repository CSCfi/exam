# --- !Ups
ALTER TABLE sitnet_users ADD logout_url varchar(256);

# --- !Downs
ALTER TABLE sitnet_users DROP logout_url;
