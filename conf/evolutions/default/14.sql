# --- !Ups
create table language (
    code varchar(2) not null,
    name varchar(40) null,
    ebean_timestamp timestamp without time zone not null default now(),
    constraint pk_language primary key (code)
);

create table exam_language (
    exam_id bigint not null,
    language_code varchar(2) not null,
    constraint pk_exam_language primary key (exam_id, language_code)
);
alter table exam_language add constraint fk_exam_language_exam_01 foreign key (exam_id) references exam(id);
alter table exam_language add constraint fk_exam_language_language_02 foreign key (language_code) references language(code);

insert into language values('fi', 'Suomi', now());
insert into language values('sv', 'Ruotsi', now());
insert into language values('en', 'Englanti', now());
insert into language values('de', 'Saksa', now());
insert into exam_language select id, 'fi' from exam;

alter table exam drop column exam_language;

# --- !Downs
drop table exam_language;
drop table language;
alter table exam add column exam_language varchar(255);
update exam set exam_language='Suomi';
