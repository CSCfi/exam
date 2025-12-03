-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

alter table reservation add user_id bigint;
alter table reservation add constraint fk_reservation_user foreign key (user_id) references sitnet_users (id) on delete restrict on update restrict;
create index fk_reservation_user on reservation (user_id);

# --- !Downs

ALTER TABLE reservation DROP user_id;

