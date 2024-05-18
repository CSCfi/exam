-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE sitnet_users ADD logout_url varchar(256);

# --- !Downs
ALTER TABLE sitnet_users DROP logout_url;
