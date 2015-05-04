CREATE TABLE exam_starting_hour (
  id BIGINT NOT NULL,
  starting_hour TIMETZ NOT NULL,
  timezone_offset INTEGER NOT NULL,
  room_id BIGINT NOT NULL,
  ebean_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pk_exam_starting_hour PRIMARY KEY (id)
);
ALTER TABLE exam_starting_hour ADD CONSTRAINT fk_exam_starting_hour_exam_room FOREIGN KEY (room_id) REFERENCES exam_room(id);
CREATE SEQUENCE exam_starting_hour_seq;

ALTER TABLE default_working_hours ALTER start_time TYPE TIMETZ;
ALTER TABLE default_working_hours ALTER end_time TYPE TIMETZ;
ALTER TABLE default_working_hours ADD timezone_offset INTEGER;
UPDATE default_working_hours SET timezone_offset = 7200000;
ALTER TABLE default_working_hours ALTER timezone_offset SET NOT NULL;

ALTER TABLE exception_working_hours ADD start_time_timezone_offset INTEGER;
UPDATE exception_working_hours SET start_time_timezone_offset = 7200000;
ALTER TABLE exception_working_hours ALTER start_time_timezone_offset SET NOT NULL;
ALTER TABLE exception_working_hours ADD end_time_timezone_offset INTEGER;
UPDATE exception_working_hours SET end_time_timezone_offset = 7200000;
ALTER TABLE exception_working_hours ALTER end_time_timezone_offset SET NOT NULL;

# --- !Downs
DROP TABLE exam_starting_hour;
DROP SEQUENCE IF EXISTS exam_starting_hour_seq;
