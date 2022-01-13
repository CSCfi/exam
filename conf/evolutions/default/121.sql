# --- !Ups
ALTER TABLE exam_enrolment ADD retrial_permitted BOOLEAN NOT NULL default false;
ALTER TABLE exam_enrolment ADD no_show BOOLEAN NOT NULL DEFAULT false;


UPDATE exam_enrolment SET retrial_permitted = (select retrial_permitted from reservation as r where r.id = reservation_id) WHERE reservation_id is not null;
UPDATE exam_enrolment SET no_show = (select no_show from reservation as r where r.id = reservation_id) where reservation_id is not null;

ALTER TABLE reservation_optional_exam_section DROP CONSTRAINT fk_reservation_optional_exam_section_reservation;
ALTER TABLE reservation_optional_exam_section RENAME reservation_id TO exam_enrolment_id;
UPDATE reservation_optional_exam_section SET exam_enrolment_id = (select id from exam_enrolment AS ee WHERE ee.reservation_id = exam_enrolment_id);
ALTER TABLE reservation_optional_exam_section ADD CONSTRAINT fk_exam_enrolment_optional_exam_section_exam_enrolment FOREIGN KEY (exam_enrolment_id) REFERENCES exam_enrolment(id);
ALTER TABLE reservation_optional_exam_section RENAME TO exam_enrolment_optional_exam_section;

ALTER TABLE reservation DROP retrial_permitted;
ALTER TABLE reservation DROP no_show;

# --- !Downs

ALTER TABLE reservation ADD no_show BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE reservation ADD retrial_permitted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE exam_enrolment_optional_exam_section DROP CONSTRAINT fk_exam_enrolment_optional_exam_section_exam_enrolment;

UPDATE exam_enrolment_optional_exam_section SET exam_enrolment_id = (select ee.reservation_id from exam_enrolment AS ee WHERE ee.id = exam_enrolment_id);
ALTER TABLE exam_enrolment_optional_exam_section RENAME exam_enrolment_id TO reservation_id;

ALTER TABLE exam_enrolment_optional_exam_section ADD CONSTRAINT fk_reservation_optional_exam_section_reservation FOREIGN KEY (reservation_id) REFERENCES reservation(id);
ALTER TABLE exam_enrolment_optional_exam_section RENAME TO reservation_optional_exam_section;

UPDATE reservation SET retrial_permitted = (select retrial_permitted from exam_enrolment as ee where ee.reservation_id = id);
UPDATE reservation SET no_show = (select no_show from exam_enrolment as ee where ee.reservation_id = id);

ALTER TABLE exam_enrolment DROP retrial_permitted;
ALTER TABLE exam_enrolment DROP no_show;
