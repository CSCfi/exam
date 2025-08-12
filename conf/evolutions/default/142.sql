-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam_room ADD internal_password VARCHAR(32) NULL;
ALTER TABLE exam_room ADD external_password VARCHAR(32) NULL;
ALTER TABLE exam_room DROP expanded;

# --- !Downs
ALTER TABLE exam_room DROP internal_password;
ALTER TABLE exam_room DROP external_password;
ALTER TABLE exam_room ADD expanded BOOLEAN DEFAULT FALSE;
