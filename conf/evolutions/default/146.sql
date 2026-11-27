-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

ALTER TABLE reservation ADD COLUMN external_user_email VARCHAR(255);

# --- !Downs

ALTER TABLE reservation DROP COLUMN external_user_email;
