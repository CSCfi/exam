-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
alter table sitnet_users add column employee_number varchar(255);

# --- !Downs
alter table sitnet_users drop column employee_number;
