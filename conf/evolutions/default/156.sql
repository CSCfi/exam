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

# --- !Downs

-- The deleted rows cannot be restored, everything left comes back as active (as in 35)
ALTER TABLE software ADD COLUMN status VARCHAR(255);
UPDATE software SET status = 'ACTIVE';
