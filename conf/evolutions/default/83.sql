# --- !Ups
ALTER TABLE reservation ADD external_ref VARCHAR(32);
ALTER TABLE reservation ADD external_user_ref VARCHAR(255);

# --- !Downs
ALTER TABLE reservation DROP external_ref;
ALTER TABLE reservation DROP external_user_ref;


