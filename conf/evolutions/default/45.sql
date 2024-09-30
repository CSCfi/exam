-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam_owner ALTER COLUMN user_id TYPE BIGINT;
ALTER TABLE exam_owner ALTER COLUMN exam_id TYPE BIGINT;

# --- !Downs
-- No going back