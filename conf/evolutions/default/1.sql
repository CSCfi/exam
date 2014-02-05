# --- Created by Ebean DDL
# To stop Ebean DDL generation, remove this comment and start using Evolutions

# --- !Ups

create table user (
  id                        bigint not null,
  email                     varchar(255),
  last_name                 varchar(255),
  first_name                varchar(255),
  password                  varchar(255),
  constraint pk_user primary key (id))
;

create table user_role (
  id                        bigint not null,
  user_id                   bigint not null,
  uid                       bigint,
  role                      varchar(255),
  constraint pk_user_role primary key (id))
;

create sequence user_seq;

create sequence user_role_seq;

alter table user_role add constraint fk_user_role_user_1 foreign key (user_id) references user (id) on delete restrict on update restrict;
create index ix_user_role_user_1 on user_role (user_id);



# --- !Downs

SET REFERENTIAL_INTEGRITY FALSE;

drop table if exists user;

drop table if exists user_role;

SET REFERENTIAL_INTEGRITY TRUE;

drop sequence if exists user_seq;

drop sequence if exists user_role_seq;

