# --- !Ups
ALTER TABLE exam ALTER subject_to_language_inspection DROP NOT NULL;
ALTER TABLE exam ALTER subject_to_language_inspection DROP DEFAULT;

# --- !Downs
ALTER TABLE exam ALTER subject_to_language_inspection SET DEFAULT FALSE;
ALTER TABLE exam ALTER subject_to_language_inspection SET NOT NULL;
