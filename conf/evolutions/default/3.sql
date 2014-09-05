# --- !Ups

ALTER TABLE exam_inspection ADD ready boolean default false;

ALTER TABLE exam_score ADD exam_score varchar(255);


create table exam_record (
  id                        bigint not null,
  teacher_id                bigint,
  student_id                bigint,
  exam_id                   bigint,
  exam_score_id             bigint,
  time_stamp                timestamp,
  course_unit_info_id       bigint,
  constraint pk_exam_record primary key (id))
;

create table haka_attribute (
  id                        bigint not null,
  user_id                   bigint not null,
  key                       varchar(255),
  value                     varchar(255),
  constraint pk_haka_attribute primary key (id))
;

create sequence exam_record_seq;

create sequence haka_attribute_seq;

alter table exam_record add constraint fk_exam_record_teacher_42 foreign key (teacher_id) references sitnet_users (id) on delete restrict on update restrict;
create index ix_exam_record_teacher_42 on exam_record (teacher_id);
alter table exam_record add constraint fk_exam_record_student_43 foreign key (student_id) references sitnet_users (id) on delete restrict on update restrict;
create index ix_exam_record_student_43 on exam_record (student_id);
alter table exam_record add constraint fk_exam_record_exam_44 foreign key (exam_id) references exam (id) on delete restrict on update restrict;
create index ix_exam_record_exam_44 on exam_record (exam_id);
alter table exam_record add constraint fk_exam_record_examScore_45 foreign key (exam_score_id) references exam_score (id) on delete restrict on update restrict;
create index ix_exam_record_examScore_45 on exam_record (exam_score_id);
alter table exam_record add constraint fk_exam_record_courseUnitInfo_46 foreign key (course_unit_info_id) references course_unit_info (id) on delete restrict on update restrict;
create index ix_exam_record_courseUnitInfo_46 on exam_record (course_unit_info_id);

alter table haka_attribute add constraint fk_haka_attribute_sitnet_user_55 foreign key (user_id) references sitnet_users (id) on delete restrict on update restrict;
create index ix_haka_attribute_sitnet_user_55 on haka_attribute (user_id);

# --- !Downs

ALTER TABLE exam_inspection DROP ready;

ALTER TABLE exam_score DROP exam_score;

drop table if exists exam_record;

drop sequence if exists exam_record_seq;

drop table if exists haka_attribute;

drop sequence if exists haka_attribute_seq;