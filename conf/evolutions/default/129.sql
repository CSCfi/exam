# --- !Ups
ALTER TABLE reservation ADD sent_as_no_show BOOLEAN DEFAULT FALSE;

# --- !Downs
ALTER TABLE reservation DROP sent_as_no_show;
