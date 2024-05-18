-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

ALTER TABLE attachment ALTER COLUMN file_name TYPE TEXT;
ALTER TABLE attachment ALTER COLUMN file_path TYPE TEXT;

# --- !Downs

ALTER TABLE attachment ALTER COLUMN file_name TYPE VARCHAR(255);
ALTER TABLE attachment ALTER COLUMN file_path TYPE VARCHAR(255);
