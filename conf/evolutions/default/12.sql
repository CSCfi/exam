# --- !Ups

ALTER TABLE exam_record ADD recorded_on timestamp;

# --- !Downs

ALTER TABLE exam_record DROP recorded_on;
