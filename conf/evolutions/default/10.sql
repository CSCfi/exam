# --- !Ups

ALTER TABLE course ADD identifier varchar(255);
ALTER TABLE course ADD start_date varchar(255);
ALTER TABLE course ADD course_implementation varchar(255);
ALTER TABLE course ADD credits_language varchar(255);
ALTER TABLE course ADD grade_scale varchar(255);
ALTER TABLE course ADD lecturer varchar(255);
ALTER TABLE course ADD lecturer_responsible varchar(255);
ALTER TABLE course ADD institution_name varchar(255);
ALTER TABLE course ADD department varchar(255);
ALTER TABLE course ADD degree_programme varchar(255);
ALTER TABLE course ADD campus varchar(255);
ALTER TABLE course ADD course_material varchar(255);

# --- !Downs

ALTER TABLE course DROP identifier;
ALTER TABLE course DROP start_date;
ALTER TABLE course DROP course_implementation;
ALTER TABLE course DROP credits_language;
ALTER TABLE course DROP grade_scale;
ALTER TABLE course DROP lecturer;
ALTER TABLE course DROP lecturer_responsible;
ALTER TABLE course DROP institution_name;
ALTER TABLE course DROP department;
ALTER TABLE course DROP degree_programme;
ALTER TABLE course DROP campus;
ALTER TABLE course DROP course_material;
