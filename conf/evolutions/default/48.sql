# --- !Ups
ALTER TABLE reservation ADD no_show BOOLEAN NOT NULL DEFAULT FALSE;

# --- !Downs
ALTER TABLE reservation DROP no_show;
