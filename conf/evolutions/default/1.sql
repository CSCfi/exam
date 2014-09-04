# --- !Ups

create table answer (
  answer_type               varchar(31) not null,
  id                        bigint not null,
  created                   timestamp,
  creator_id                bigint,
  modified                  timestamp,
  modifier_id               bigint,
  type                      varchar(255),
  ebean_timestamp           timestamp not null,
  option_id                 bigint,
  answer                    TEXT,
  constraint pk_answer primary key (id))
;

create table calendar_event (
  event_type                varchar(31) not null,
  start_date                timestamp,
  end_date                  timestamp,
  start_time                timestamp,
  end_time                  timestamp,
  interval                  timestamp,
  reoccurring               boolean default false)
;

create table question (
  question_type             varchar(31) not null,
  id                        bigint not null,
  created                   timestamp,
  creator_id                bigint,
  modified                  timestamp,
  modifier_id               bigint,
  type                      varchar(255),
  question                  TEXT,
  shared                    boolean,
  instruction               TEXT,
  state                     varchar(255),
  max_score                 numeric default 0,
  evaluated_score           numeric default 0,
  parent_id                 bigint,
  answer_id                 bigint,
  evaluation_criterias      TEXT,
  attachment_id             bigint,
  evaluation_phrases_id     bigint,
  comments_id               bigint,
  hash                      varchar(32),
  expanded                  boolean default false,
  ebean_timestamp           timestamp not null,
  max_characters            bigint,
  evaluation_type           varchar(255),
  constraint pk_question primary key (id))
;

create table accessibility (
  id                        bigint not null,
  name                      varchar(255),
  constraint pk_accessibility primary key (id))
;

create table attachment (
  id                        bigint not null,
  created                   timestamp,
  creator_id                bigint,
  modified                  timestamp,
  modifier_id               bigint,
  file_name                 varchar(255),
  file_path                 varchar(255),
  mime_type                 varchar(255),
  ebean_timestamp           timestamp not null,
  constraint pk_attachment primary key (id))
;

create table comment (
  id                        bigint not null,
  created                   timestamp,
  creator_id                bigint,
  modified                  timestamp,
  modifier_id               bigint,
  comment                   TEXT,
  reply_id                  bigint,
  ebean_timestamp           timestamp not null,
  constraint pk_comment primary key (id))
;

create table course (
  id                        bigint not null,
  organisation_id           bigint,
  code                      varchar(255),
  name                      varchar(255),
  level                     varchar(255),
  credits                   float,
  constraint pk_course primary key (id))
;

create table course_unit_info (
  id                        bigint not null,
  identifier                varchar(255),
  course_unit_code          varchar(255),
  course_unit_title         varchar(255),
  course_unit_level         varchar(255),
  course_unit_type          varchar(255),
  credits                   varchar(255),
  start_date                varchar(255),
  institution_name          varchar(255),
  constraint pk_course_unit_info primary key (id))
;

create table default_working_hours (
  id                        bigint not null,
  start_time                timestamp,
  end_time                  timestamp,
  day                       varchar(255),
  room_id                   bigint,
  constraint pk_default_working_hours primary key (id))
;

create table evaluation_criteria (
  id                        bigint not null,
  created                   timestamp,
  creator_id                bigint,
  modified                  timestamp,
  modifier_id               bigint,
  criteria                  varchar(512),
  ebean_timestamp           timestamp not null,
  constraint pk_evaluation_criteria primary key (id))
;

create table evaluation_phrase (
  id                        bigint not null,
  created                   timestamp,
  creator_id                bigint,
  modified                  timestamp,
  modifier_id               bigint,
  phrase                    varchar(512),
  ebean_timestamp           timestamp not null,
  constraint pk_evaluation_phrase primary key (id))
;

create table exam (
  id                        bigint not null,
  created                   timestamp,
  creator_id                bigint,
  modified                  timestamp,
  modifier_id               bigint,
  name                      varchar(255),
  course_id                 bigint,
  exam_type_id              bigint,
  instruction               TEXT,
  shared                    boolean,
  parent_id                 bigint,
  hash                      varchar(32),
  exam_active_start_date    timestamp,
  exam_active_end_date      timestamp,
  room_id                   bigint,
  duration                  integer,
  grading                   varchar(255),
  other_grading             varchar(255),
  exam_language             varchar(255),
  answer_language           varchar(255),
  state                     varchar(255),
  grade                     varchar(255),
  graded_by_user_id         bigint,
  graded_time               timestamp,
  exam_feedback_id          bigint,
  exam_grade_id             bigint,
  credit_type               varchar(255),
  expanded                  boolean default false,
  attachment_id             bigint,
  ebean_timestamp           timestamp not null,
  constraint uq_exam_hash unique (hash),
  constraint pk_exam primary key (id))
;

create table exam_enrolment (
  id                        bigint not null,
  user_id                   bigint,
  exam_id                   bigint,
  reservation_id            bigint,
  enrolled_on               timestamp,
  constraint pk_exam_enrolment primary key (id))
;

create table exam_inspection (
  id                        bigint not null,
  exam_id                   bigint,
  user_id                   bigint,
  assigned_by_id            bigint,
  comment_id                bigint,
  constraint pk_exam_inspection primary key (id))
;

create table exam_machine (
  id                        bigint not null,
  name                      varchar(255),
  other_identifier          varchar(255),
  accessibility_info        varchar(255),
  accessible                boolean default false,
  ip_address                varchar(255),
  surveillance_camera       varchar(255),
  video_recordings          varchar(255),
  room_id                   bigint,
  expanded                  boolean default false,
  status_comment            varchar(255),
  archived                  boolean,
  out_of_service            boolean,
  constraint pk_exam_machine primary key (id))
;

create table exam_participation (
  id                        bigint not null,
  user_id                   bigint,
  exam_id                   bigint,
  started                   timestamp,
  ended                     timestamp,
  duration                  timestamp,
  deadline                  timestamp,
  constraint pk_exam_participation primary key (id))
;

create table exam_room (
  id                        bigint not null,
  name                      varchar(255),
  room_code                 varchar(255),
  building_name             varchar(255),
  campus                    varchar(255),
  organization_id           bigint,
  mail_address_id           bigint,
  transition_time           varchar(255),
  accessible                boolean default false,
  room_instruction          TEXT,
  contact_person            varchar(255),
  video_recordings_url      varchar(255),
  exam_machine_count        bigint,
  status_comment            varchar(255),
  out_of_service            boolean default false,
  state                     varchar(255),
  expanded                  boolean default false,
  constraint pk_exam_room primary key (id))
;

create table exam_score (
  id                        bigint not null,
  student_id                varchar(255),
  student                   varchar(255),
  identifier                varchar(255),
  course_unit_code          varchar(255),
  exam_date                 varchar(255),
  credits                   varchar(255),
  credit_language           varchar(255),
  student_grade             varchar(255),
  grade_scale               varchar(255),
  course_unit_level         varchar(255),
  course_unit_type          varchar(255),
  credit_type               varchar(255),
  lecturer                  varchar(255),
  lecturer_id               varchar(255),
  date                      varchar(255),
  course_implementation     varchar(255),
  constraint pk_exam_score primary key (id))
;

create table exam_section (
  id                        bigint not null,
  created                   timestamp,
  creator_id                bigint,
  modified                  timestamp,
  modifier_id               bigint,
  name                      varchar(255),
  exam_id                   bigint,
  total_score               bigint,
  expanded                  boolean default false,
  lottery_on                boolean default false,
  lottery_item_count        integer,
  ebean_timestamp           timestamp not null,
  constraint pk_exam_section primary key (id))
;

create table exam_type (
  id                        bigint not null,
  type                      varchar(255),
  constraint pk_exam_type primary key (id))
;

create table exception_working_hours (
  id                        bigint not null,
  start_date                timestamp,
  end_date                  timestamp,
  start_time                timestamp,
  end_time                  timestamp,
  room_id                   bigint,
  constraint pk_exception_working_hours primary key (id))
;

create table general_settings (
  id                        bigint not null,
  eula                      TEXT,
  review_deadline           numeric default 14,
  constraint pk_general_settings primary key (id))
;

create table grade (
  id                        bigint not null,
  created                   timestamp,
  creator_id                bigint,
  modified                  timestamp,
  modifier_id               bigint,
  scale                     varchar(255),
  grade                     varchar(255),
  description               varchar(255),
  ebean_timestamp           timestamp not null,
  constraint pk_grade primary key (id))
;

create table mail_address (
  id                        bigint not null,
  street                    varchar(255),
  zip                       varchar(255),
  city                      varchar(255),
  constraint pk_mail_address primary key (id))
;

create table material (
  id                        bigint not null,
  created                   timestamp,
  creator_id                bigint,
  modified                  timestamp,
  modifier_id               bigint,
  data                      bytea,
  ebean_timestamp           timestamp not null,
  constraint pk_material primary key (id))
;

create table mime_type (
  id                        bigint not null,
  type                      varchar(255),
  constraint pk_mime_type primary key (id))
;

create table multiple_choise_option (
  id                        bigint not null,
  option                    varchar(255),
  correct_option            boolean,
  score                     float,
  question_id               bigint,
  constraint pk_multiple_choise_option primary key (id))
;

create table organisation (
  id                        bigint not null,
  code                      varchar(255),
  name                      varchar(255),
  name_abbreviation         varchar(255),
  course_unit_info_url      varchar(255),
  records_whitelist_ip      varchar(255),
  vat_id_number             varchar(255),
  constraint pk_organisation primary key (id))
;

create table reservation (
  id                        bigint not null,
  start_at                  timestamp,
  end_at                    timestamp,
  machine_id                bigint,
  constraint pk_reservation primary key (id))
;

create table sitnet_role (
  id                        bigint not null,
  name                      varchar(255),
  constraint pk_sitnet_role primary key (id))
;

create table software (
  id                        bigint not null,
  name                      varchar(255),
  constraint pk_software primary key (id))
;

create table sitnet_users (
  id                        bigint not null,
  email                     varchar(255),
  eppn                      varchar(255),
  last_name                 varchar(255),
  first_name                varchar(255),
  password                  varchar(255),
  user_language_id          bigint,
  organisation_id           bigint,
  has_accepted_user_agreament BOOLEAN DEFAULT FALSE,
  constraint pk_sitnet_users primary key (id))
;

create table user_language (
  id                        bigint not null,
  native_language_code      varchar(255),
  native_language_name      varchar(255),
  uilanguage_code           varchar(255),
  uilanguage_name           varchar(255),
  constraint pk_user_language primary key (id))
;


create table accessibility_exam_room (
  accessibility_id               bigint not null,
  exam_room_id                   bigint not null,
  constraint pk_accessibility_exam_room primary key (accessibility_id, exam_room_id))
;

create table accessibility_exam_machine (
  accessibility_id               bigint not null,
  exam_machine_id                bigint not null,
  constraint pk_accessibility_exam_machine primary key (accessibility_id, exam_machine_id))
;

create table exam_software (
  exam_id                        bigint not null,
  software_id                    bigint not null,
  constraint pk_exam_software primary key (exam_id, software_id))
;

create table exam_machine_software (
  exam_machine_id                bigint not null,
  software_id                    bigint not null,
  constraint pk_exam_machine_software primary key (exam_machine_id, software_id))
;

create table exam_machine_accessibility (
  exam_machine_id                bigint not null,
  accessibility_id               bigint not null,
  constraint pk_exam_machine_accessibility primary key (exam_machine_id, accessibility_id))
;

create table exam_section_question (
  exam_section_id                bigint not null,
  question_id                    bigint not null,
  constraint pk_exam_section_question primary key (exam_section_id, question_id))
;

create table organisation_organisation (
  parent_id                      bigint not null,
  child_id                       bigint not null,
  constraint pk_organisation_organisation primary key (parent_id, child_id))
;

create table software_exam (
  software_id                    bigint not null,
  exam_id                        bigint not null,
  constraint pk_software_exam primary key (software_id, exam_id))
;

create table sitnet_users_sitnet_role (
  sitnet_users_id                bigint not null,
  sitnet_role_id                 bigint not null,
  constraint pk_sitnet_users_sitnet_role primary key (sitnet_users_id, sitnet_role_id))
;
create sequence answer_seq;

create sequence question_seq;

create sequence accessibility_seq;

create sequence attachment_seq;

create sequence comment_seq;

create sequence course_seq;

create sequence course_unit_info_seq;

create sequence default_working_hours_seq;

create sequence evaluation_criteria_seq;

create sequence evaluation_phrase_seq;

create sequence exam_seq;

create sequence exam_enrolment_seq;

create sequence exam_inspection_seq;

create sequence exam_machine_seq;

create sequence exam_participation_seq;

create sequence exam_room_seq;

create sequence exam_score_seq;

create sequence exam_section_seq;

create sequence exam_type_seq;

create sequence exception_working_hours_seq;

create sequence general_settings_seq;

create sequence grade_seq;

create sequence mail_address_seq;

create sequence material_seq;

create sequence mime_type_seq;

create sequence multiple_choise_option_seq;

create sequence organisation_seq;

create sequence reservation_seq;

create sequence sitnet_role_seq;

create sequence software_seq;

create sequence sitnet_users_seq;

create sequence user_language_seq;

alter table answer add constraint fk_answer_creator_1 foreign key (creator_id) references sitnet_users (id);
create index ix_answer_creator_1 on answer (creator_id);
alter table answer add constraint fk_answer_modifier_2 foreign key (modifier_id) references sitnet_users (id);
create index ix_answer_modifier_2 on answer (modifier_id);
alter table answer add constraint fk_answer_option_3 foreign key (option_id) references multiple_choise_option (id);
create index ix_answer_option_3 on answer (option_id);
alter table question add constraint fk_question_creator_4 foreign key (creator_id) references sitnet_users (id);
create index ix_question_creator_4 on question (creator_id);
alter table question add constraint fk_question_modifier_5 foreign key (modifier_id) references sitnet_users (id);
create index ix_question_modifier_5 on question (modifier_id);
alter table question add constraint fk_question_parent_6 foreign key (parent_id) references question (id);
create index ix_question_parent_6 on question (parent_id);
alter table question add constraint fk_question_answer_7 foreign key (answer_id) references answer (id);
create index ix_question_answer_7 on question (answer_id);
alter table question add constraint fk_question_attachment_8 foreign key (attachment_id) references attachment (id);
create index ix_question_attachment_8 on question (attachment_id);
alter table question add constraint fk_question_evaluationPhrases_9 foreign key (evaluation_phrases_id) references evaluation_phrase (id);
create index ix_question_evaluationPhrases_9 on question (evaluation_phrases_id);
alter table question add constraint fk_question_comments_10 foreign key (comments_id) references comment (id);
create index ix_question_comments_10 on question (comments_id);
alter table attachment add constraint fk_attachment_creator_11 foreign key (creator_id) references sitnet_users (id);
create index ix_attachment_creator_11 on attachment (creator_id);
alter table attachment add constraint fk_attachment_modifier_12 foreign key (modifier_id) references sitnet_users (id);
create index ix_attachment_modifier_12 on attachment (modifier_id);
alter table comment add constraint fk_comment_creator_13 foreign key (creator_id) references sitnet_users (id);
create index ix_comment_creator_13 on comment (creator_id);
alter table comment add constraint fk_comment_modifier_14 foreign key (modifier_id) references sitnet_users (id);
create index ix_comment_modifier_14 on comment (modifier_id);
alter table comment add constraint fk_comment_reply_15 foreign key (reply_id) references comment (id);
create index ix_comment_reply_15 on comment (reply_id);
alter table course add constraint fk_course_organisation_16 foreign key (organisation_id) references organisation (id);
create index ix_course_organisation_16 on course (organisation_id);
alter table default_working_hours add constraint fk_default_working_hours_room_17 foreign key (room_id) references exam_room (id);
create index ix_default_working_hours_room_17 on default_working_hours (room_id);
alter table evaluation_criteria add constraint fk_evaluation_criteria_creato_18 foreign key (creator_id) references sitnet_users (id);
create index ix_evaluation_criteria_creato_18 on evaluation_criteria (creator_id);
alter table evaluation_criteria add constraint fk_evaluation_criteria_modifi_19 foreign key (modifier_id) references sitnet_users (id);
create index ix_evaluation_criteria_modifi_19 on evaluation_criteria (modifier_id);
alter table evaluation_phrase add constraint fk_evaluation_phrase_creator_20 foreign key (creator_id) references sitnet_users (id);
create index ix_evaluation_phrase_creator_20 on evaluation_phrase (creator_id);
alter table evaluation_phrase add constraint fk_evaluation_phrase_modifier_21 foreign key (modifier_id) references sitnet_users (id);
create index ix_evaluation_phrase_modifier_21 on evaluation_phrase (modifier_id);
alter table exam add constraint fk_exam_creator_22 foreign key (creator_id) references sitnet_users (id);
create index ix_exam_creator_22 on exam (creator_id);
alter table exam add constraint fk_exam_modifier_23 foreign key (modifier_id) references sitnet_users (id);
create index ix_exam_modifier_23 on exam (modifier_id);
alter table exam add constraint fk_exam_course_24 foreign key (course_id) references course (id);
create index ix_exam_course_24 on exam (course_id);
alter table exam add constraint fk_exam_examType_25 foreign key (exam_type_id) references exam_type (id);
create index ix_exam_examType_25 on exam (exam_type_id);
alter table exam add constraint fk_exam_parent_26 foreign key (parent_id) references exam (id);
create index ix_exam_parent_26 on exam (parent_id);
alter table exam add constraint fk_exam_room_27 foreign key (room_id) references exam_room (id);
create index ix_exam_room_27 on exam (room_id);
alter table exam add constraint fk_exam_gradedByUser_28 foreign key (graded_by_user_id) references sitnet_users (id);
create index ix_exam_gradedByUser_28 on exam (graded_by_user_id);
alter table exam add constraint fk_exam_examFeedback_29 foreign key (exam_feedback_id) references comment (id);
create index ix_exam_examFeedback_29 on exam (exam_feedback_id);
alter table exam add constraint fk_exam_examGrade_30 foreign key (exam_grade_id) references grade (id);
create index ix_exam_examGrade_30 on exam (exam_grade_id);
alter table exam add constraint fk_exam_attachment_31 foreign key (attachment_id) references attachment (id);
create index ix_exam_attachment_31 on exam (attachment_id);
alter table exam_enrolment add constraint fk_exam_enrolment_user_32 foreign key (user_id) references sitnet_users (id);
create index ix_exam_enrolment_user_32 on exam_enrolment (user_id);
alter table exam_enrolment add constraint fk_exam_enrolment_exam_33 foreign key (exam_id) references exam (id);
create index ix_exam_enrolment_exam_33 on exam_enrolment (exam_id);
alter table exam_enrolment add constraint fk_exam_enrolment_reservation_34 foreign key (reservation_id) references reservation (id);
create index ix_exam_enrolment_reservation_34 on exam_enrolment (reservation_id);
alter table exam_inspection add constraint fk_exam_inspection_exam_35 foreign key (exam_id) references exam (id);
create index ix_exam_inspection_exam_35 on exam_inspection (exam_id);
alter table exam_inspection add constraint fk_exam_inspection_user_36 foreign key (user_id) references sitnet_users (id);
create index ix_exam_inspection_user_36 on exam_inspection (user_id);
alter table exam_inspection add constraint fk_exam_inspection_assignedBy_37 foreign key (assigned_by_id) references sitnet_users (id);
create index ix_exam_inspection_assignedBy_37 on exam_inspection (assigned_by_id);
alter table exam_inspection add constraint fk_exam_inspection_comment_38 foreign key (comment_id) references comment (id);
create index ix_exam_inspection_comment_38 on exam_inspection (comment_id);
alter table exam_machine add constraint fk_exam_machine_room_39 foreign key (room_id) references exam_room (id);
create index ix_exam_machine_room_39 on exam_machine (room_id);
alter table exam_participation add constraint fk_exam_participation_user_40 foreign key (user_id) references sitnet_users (id);
create index ix_exam_participation_user_40 on exam_participation (user_id);
alter table exam_participation add constraint fk_exam_participation_exam_41 foreign key (exam_id) references exam (id);
create index ix_exam_participation_exam_41 on exam_participation (exam_id);
alter table exam_room add constraint fk_exam_room_organization_42 foreign key (organization_id) references organisation (id);
create index ix_exam_room_organization_42 on exam_room (organization_id);
alter table exam_room add constraint fk_exam_room_mailAddress_43 foreign key (mail_address_id) references mail_address (id);
create index ix_exam_room_mailAddress_43 on exam_room (mail_address_id);
alter table exam_section add constraint fk_exam_section_creator_44 foreign key (creator_id) references sitnet_users (id);
create index ix_exam_section_creator_44 on exam_section (creator_id);
alter table exam_section add constraint fk_exam_section_modifier_45 foreign key (modifier_id) references sitnet_users (id);
create index ix_exam_section_modifier_45 on exam_section (modifier_id);
alter table exam_section add constraint fk_exam_section_exam_46 foreign key (exam_id) references exam (id);
create index ix_exam_section_exam_46 on exam_section (exam_id);
alter table exception_working_hours add constraint fk_exception_working_hours_ro_47 foreign key (room_id) references exam_room (id);
create index ix_exception_working_hours_ro_47 on exception_working_hours (room_id);
alter table grade add constraint fk_grade_creator_48 foreign key (creator_id) references sitnet_users (id);
create index ix_grade_creator_48 on grade (creator_id);
alter table grade add constraint fk_grade_modifier_49 foreign key (modifier_id) references sitnet_users (id);
create index ix_grade_modifier_49 on grade (modifier_id);
alter table material add constraint fk_material_creator_50 foreign key (creator_id) references sitnet_users (id);
create index ix_material_creator_50 on material (creator_id);
alter table material add constraint fk_material_modifier_51 foreign key (modifier_id) references sitnet_users (id);
create index ix_material_modifier_51 on material (modifier_id);
alter table multiple_choise_option add constraint fk_multiple_choise_option_que_52 foreign key (question_id) references question (id);
create index ix_multiple_choise_option_que_52 on multiple_choise_option (question_id);
alter table reservation add constraint fk_reservation_machine_53 foreign key (machine_id) references exam_machine (id);
create index ix_reservation_machine_53 on reservation (machine_id);
alter table sitnet_users add constraint fk_sitnet_users_userLanguage_54 foreign key (user_language_id) references user_language (id);
create index ix_sitnet_users_userLanguage_54 on sitnet_users (user_language_id);
alter table sitnet_users add constraint fk_sitnet_users_organisation_55 foreign key (organisation_id) references organisation (id);
create index ix_sitnet_users_organisation_55 on sitnet_users (organisation_id);



alter table accessibility_exam_room add constraint fk_accessibility_exam_room_ac_01 foreign key (accessibility_id) references accessibility (id);

alter table accessibility_exam_room add constraint fk_accessibility_exam_room_ex_02 foreign key (exam_room_id) references exam_room (id);

alter table accessibility_exam_machine add constraint fk_accessibility_exam_machine_01 foreign key (accessibility_id) references accessibility (id);

alter table accessibility_exam_machine add constraint fk_accessibility_exam_machine_02 foreign key (exam_machine_id) references exam_machine (id);

alter table exam_software add constraint fk_exam_software_exam_01 foreign key (exam_id) references exam (id);

alter table exam_software add constraint fk_exam_software_software_02 foreign key (software_id) references software (id);

alter table exam_machine_software add constraint fk_exam_machine_software_exam_01 foreign key (exam_machine_id) references exam_machine (id);

alter table exam_machine_software add constraint fk_exam_machine_software_soft_02 foreign key (software_id) references software (id);

alter table exam_machine_accessibility add constraint fk_exam_machine_accessibility_01 foreign key (exam_machine_id) references exam_machine (id);

alter table exam_machine_accessibility add constraint fk_exam_machine_accessibility_02 foreign key (accessibility_id) references accessibility (id);

alter table exam_section_question add constraint fk_exam_section_question_exam_01 foreign key (exam_section_id) references exam_section (id);

alter table exam_section_question add constraint fk_exam_section_question_ques_02 foreign key (question_id) references question (id);

alter table organisation_organisation add constraint fk_organisation_organisation__01 foreign key (parent_id) references organisation (id);

alter table organisation_organisation add constraint fk_organisation_organisation__02 foreign key (child_id) references organisation (id);

alter table software_exam add constraint fk_software_exam_software_01 foreign key (software_id) references software (id);

alter table software_exam add constraint fk_software_exam_exam_02 foreign key (exam_id) references exam (id);

alter table sitnet_users_sitnet_role add constraint fk_sitnet_users_sitnet_role_s_01 foreign key (sitnet_users_id) references sitnet_users (id);

alter table sitnet_users_sitnet_role add constraint fk_sitnet_users_sitnet_role_s_02 foreign key (sitnet_role_id) references sitnet_role (id);

# --- !Downs

drop table if exists answer cascade;

drop table if exists calendar_event cascade;

drop table if exists question cascade;

drop table if exists accessibility cascade;

drop table if exists accessibility_exam_room cascade;

drop table if exists accessibility_exam_machine cascade;

drop table if exists attachment cascade;

drop table if exists comment cascade;

drop table if exists course cascade;

drop table if exists course_unit_info cascade;

drop table if exists default_working_hours cascade;

drop table if exists evaluation_criteria cascade;

drop table if exists evaluation_phrase cascade;

drop table if exists exam cascade;

drop table if exists exam_software cascade;

drop table if exists exam_enrolment cascade;

drop table if exists exam_inspection cascade;

drop table if exists exam_machine cascade;

drop table if exists exam_machine_software cascade;

drop table if exists exam_machine_accessibility cascade;

drop table if exists exam_participation cascade;

drop table if exists exam_room cascade;

drop table if exists exam_score cascade;

drop table if exists exam_section cascade;

drop table if exists exam_section_question cascade;

drop table if exists exam_type cascade;

drop table if exists exception_working_hours cascade;

drop table if exists general_settings cascade;

drop table if exists grade cascade;

drop table if exists mail_address cascade;

drop table if exists material cascade;

drop table if exists mime_type cascade;

drop table if exists multiple_choise_option cascade;

drop table if exists organisation cascade;

drop table if exists organisation_organisation cascade;

drop table if exists reservation cascade;

drop table if exists sitnet_role cascade;

drop table if exists software cascade;

drop table if exists software_exam cascade;

drop table if exists sitnet_users cascade;

drop table if exists sitnet_users_sitnet_role cascade;

drop table if exists user_language cascade;

drop sequence if exists answer_seq;

drop sequence if exists question_seq;

drop sequence if exists accessibility_seq;

drop sequence if exists attachment_seq;

drop sequence if exists comment_seq;

drop sequence if exists course_seq;

drop sequence if exists course_unit_info_seq;

drop sequence if exists default_working_hours_seq;

drop sequence if exists evaluation_criteria_seq;

drop sequence if exists evaluation_phrase_seq;

drop sequence if exists exam_seq;

drop sequence if exists exam_enrolment_seq;

drop sequence if exists exam_inspection_seq;

drop sequence if exists exam_machine_seq;

drop sequence if exists exam_participation_seq;

drop sequence if exists exam_room_seq;

drop sequence if exists exam_score_seq;

drop sequence if exists exam_section_seq;

drop sequence if exists exam_type_seq;

drop sequence if exists exception_working_hours_seq;

drop sequence if exists general_settings_seq;

drop sequence if exists grade_seq;

drop sequence if exists mail_address_seq;

drop sequence if exists material_seq;

drop sequence if exists mime_type_seq;

drop sequence if exists multiple_choise_option_seq;

drop sequence if exists organisation_seq;

drop sequence if exists reservation_seq;

drop sequence if exists sitnet_role_seq;

drop sequence if exists software_seq;

drop sequence if exists sitnet_users_seq;

drop sequence if exists user_language_seq;

