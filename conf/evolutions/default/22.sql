# --- !Ups
ALTER TABLE exam_type ADD COLUMN deprecated boolean DEFAULT FALSE;
UPDATE exam_type SET deprecated = TRUE WHERE type NOT IN ('Osasuoritus', 'Loppusuoritus');
UPDATE exam_type SET type = 'PARTIAL' where type = 'Osasuoritus';
UPDATE exam_type SET type = 'FINAL' where type = 'Loppusuoritus';

# --- !Downs
UPDATE exam_type SET type = 'Osasuoritus' where type = 'PARTIAL';
UPDATE exam_type SET type = 'Loppusuoritus' where type = 'FINAL';
ALTER TABLE exam_type DROP COLUMN deprecated;
