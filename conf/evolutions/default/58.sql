# --- !Ups
ALTER TABLE general_settings ADD name VARCHAR(32);
ALTER TABLE general_settings ADD value TEXT;
INSERT INTO general_settings (id, name, value, object_version) VALUES (987, 'review_deadline', (select review_deadline from general_settings WHERE id=1), 1);
INSERT INTO general_settings (id, name, value, object_version) VALUES (988, 'eula', (select eula from general_settings WHERE id=1), 1);
ALTER TABLE general_settings DROP eula;
ALTER TABLE general_settings DROP review_deadline;
DELETE FROM general_settings where id = 1;
UPDATE general_settings SET id=1 WHERE id=987;
UPDATE general_settings SET id=2 WHERE id=988;


# --- !Downs
-- N/A