# --- !Ups
DROP TABLE user_language CASCADE;
DROP SEQUENCE user_language_seq;
ALTER TABLE app_user ADD language_id VARCHAR(2);
UPDATE app_user SET language_id='fi' WHERE user_language_id=1;
UPDATE app_user SET language_id='en' WHERE user_language_id=2;
UPDATE app_user SET language_id='sv' WHERE user_language_id=3;
ALTER TABLE app_user ADD CONSTRAINT fk_app_user_language FOREIGN KEY (language_id) REFERENCES language(code);
ALTER TABLE app_user DROP user_language_id;

# --- !Downs