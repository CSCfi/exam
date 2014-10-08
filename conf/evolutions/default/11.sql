# --- !Ups

ALTER TABLE sitnet_users ADD user_identifier varchar(255);

# --- !Downs

ALTER TABLE sitnet_users DROP user_identifier;
