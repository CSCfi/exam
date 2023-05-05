# --- !Ups
UPDATE exam SET state = 14 WHERE state = 13;

# --- !Downs
UPDATE exam SET state = 13 WHERE state = 14;
