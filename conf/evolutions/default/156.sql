-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

-- Software used to be disabled instead of deleted. Removal has been a delete for years, so the
-- disabled rows go the same way, along with their links (software_exam is a legacy join table
-- that is no longer mapped but still holds a foreign key).
DELETE FROM exam_software WHERE software_id IN (SELECT id FROM software WHERE status = 'DISABLED');
DELETE FROM exam_machine_software WHERE software_id IN (SELECT id FROM software WHERE status = 'DISABLED');
DELETE FROM software_exam WHERE software_id IN (SELECT id FROM software WHERE status = 'DISABLED');
DELETE FROM software WHERE status = 'DISABLED';

ALTER TABLE software DROP COLUMN status;

-- Names are unique (case-insensitively) only by an application check, and some databases have
-- duplicates from before it. Merge each group into its lowest id, moving the links over, then
-- let the database enforce it.
CREATE TABLE software_merge AS
SELECT id, min(id) OVER (PARTITION BY lower(name)) AS keep_id FROM software WHERE name IS NOT NULL;
DELETE FROM software_merge WHERE id = keep_id;

INSERT INTO exam_software (exam_id, software_id)
SELECT DISTINCT l.exam_id, m.keep_id FROM exam_software l JOIN software_merge m ON m.id = l.software_id
ON CONFLICT DO NOTHING;
INSERT INTO exam_machine_software (exam_machine_id, software_id)
SELECT DISTINCT l.exam_machine_id, m.keep_id FROM exam_machine_software l JOIN software_merge m ON m.id = l.software_id
ON CONFLICT DO NOTHING;
INSERT INTO software_exam (software_id, exam_id)
SELECT DISTINCT m.keep_id, l.exam_id FROM software_exam l JOIN software_merge m ON m.id = l.software_id
ON CONFLICT DO NOTHING;

DELETE FROM exam_software WHERE software_id IN (SELECT id FROM software_merge);
DELETE FROM exam_machine_software WHERE software_id IN (SELECT id FROM software_merge);
DELETE FROM software_exam WHERE software_id IN (SELECT id FROM software_merge);
DELETE FROM software WHERE id IN (SELECT id FROM software_merge);
DROP TABLE software_merge;

CREATE UNIQUE INDEX ux_software_name ON software (lower(name));

# --- !Downs

-- Merged and deleted rows cannot be restored, everything left comes back as active (as in 35)
DROP INDEX IF EXISTS ux_software_name;
ALTER TABLE software ADD COLUMN status VARCHAR(255);
UPDATE software SET status = 'ACTIVE';
