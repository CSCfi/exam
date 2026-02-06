-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

ALTER TABLE sitnet_users ADD user_identifier varchar(255);

# --- !Downs

ALTER TABLE sitnet_users DROP user_identifier;
