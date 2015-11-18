# --- !Ups
DELETE FROM permission;
ALTER TABLE permission drop value;
ALTER TABLE permission ADD type INTEGER NOT NULL;
ALTER TABLE permission ADD description VARCHAR(32);
INSERT INTO permission (id, type, description, object_version) VALUES (1, 1, 'can inspect language', 1);

# --- !Downs
DELETE FROM app_user_permission;
DELETE FROM permission;
ALTER TABLE permission DROP description;
ALTER TABLE permission DROP type;
ALTER TABLE permission ADD value VARCHAR(32);
