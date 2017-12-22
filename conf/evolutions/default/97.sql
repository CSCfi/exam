# --- !Ups
ALTER TABLE exam_enrolment ADD pre_enrolled_user_email VARCHAR(255) NULL;

# --- !Downs
ALTER TABLE exam_enrolment DROP pre_enrolled_user_email;
