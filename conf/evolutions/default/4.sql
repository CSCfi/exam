alter table reservation add user_id bigint;
alter table reservation add constraint fk_reservation_user foreign key (user_id) references sitnet_users (id) on delete restrict on update restrict;
create index fk_reservation_user on reservation (user_id);