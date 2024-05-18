-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam ADD subject_to_language_inspection BOOLEAN DEFAULT FALSE NOT NULL;
UPDATE exam SET subject_to_language_inspection = TRUE WHERE execution_type_id = 3;

# --- !Downs
ALTER TABLE exam DROP subject_to_language_inspection;
