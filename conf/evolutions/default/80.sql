# --- !Ups
ALTER TABLE exam ADD COLUMN gradeless BOOLEAN NOT NULL DEFAULT FALSE;

# --- !Downs
ALTER TABLE exam DROP COLUMN gradeless;
