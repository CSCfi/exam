# --- !Ups
alter table sitnet_users add column employee_number varchar(255);

# --- !Downs
alter table sitnet_users drop column employee_number;
