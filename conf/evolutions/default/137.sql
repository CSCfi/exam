-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam ADD grading_type INTEGER NOT NULL DEFAULT 1;
UPDATE exam SET grading_type = 2 WHERE gradeless = TRUE;
ALTER TABLE exam DROP gradeless;

# --- !Downs
ALTER TABLE exam ADD gradeless BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE exam SET gradeless = TRUE WHERE grading_type = 2;
ALTER TABLE exam DROP grading_type;
