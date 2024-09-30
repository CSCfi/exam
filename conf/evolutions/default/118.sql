-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

ALTER TABLE grade_scale ALTER COLUMN external_ref TYPE VARCHAR(255);

# --- !Downs
-- can't undo really
ALTER TABLE grade_scale ALTER COLUMN external_ref TYPE INT using external_ref::integer;

