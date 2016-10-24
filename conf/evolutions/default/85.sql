# --- !Ups
ALTER TABLE language_inspection ADD modifier_id BIGINT;
ALTER TABLE language_inspection ADD modified TIMESTAMPTZ;
ALTER TABLE language_inspection ADD CONSTRAINT fk_language_inspection_modifier FOREIGN KEY (modifier_id) REFERENCES app_user(id);

UPDATE language_inspection SET modifier_id = assignee_id;

# --- !Downs
ALTER TABLE language_inspection DROP modified;
ALTER TABLE language_inspection DROP modifier_id CASCADE;
