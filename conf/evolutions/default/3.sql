# --- !Ups

ALTER TABLE exam_inspection ADD ready boolean default false;

# --- !Downs

ALTER TABLE exam_inspection DROP ready;