# --- !Ups
ALTER TABLE default_working_hours RENAME day TO weekday;
ALTER TABLE exam_score RENAME date TO registration_date;

# --- !Downs
ALTER TABLE default_working_hours RENAME weekday TO day;
ALTER TABLE exam_score RENAME registration_date TO date;

