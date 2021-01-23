# --- !Ups
ALTER TABLE exam_score ADD COLUMN lecturer_employee_number varchar(255);

# --- !Downs
ALTER TABLE exam_score DROP COLUMN lecturer_employeeNumber;
