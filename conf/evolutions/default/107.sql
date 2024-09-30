-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE collaborative_exam
  ADD COLUMN anonymous BOOLEAN NOT NULL DEFAULT TRUE;

# --- !Downs
ALTER TABLE collaborative_exam
  DROP COLUMN anonymous;

