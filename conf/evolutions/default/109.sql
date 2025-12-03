-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam_execution_type
  ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;

# --- !Downs
ALTER TABLE exam_execution_type
  DROP COLUMN active;
