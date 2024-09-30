-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE app_user ADD last_login TIMESTAMPTZ;

# --- !Downs
ALTER TABLE app_user DROP last_login;