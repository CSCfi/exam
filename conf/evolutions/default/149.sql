-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

ALTER TABLE question ADD COLUMN lti_id TEXT;

# --- !Downs

ALTER TABLE question DROP COLUMN lti_id;
