-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE app_user ADD CONSTRAINT ak_app_user_eppn UNIQUE (eppn);

# --- !Downs
ALTER TABLE app_user DROP CONSTRAINT ak_app_user_eppn;
