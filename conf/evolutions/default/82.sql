-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam_room ADD external_ref VARCHAR(32);

# --- !Downs
ALTER TABLE exam_room DROP external_ref;

