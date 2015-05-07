# --- !Ups
ALTER TABLE exception_working_hours DROP end_time;
ALTER TABLE exception_working_hours DROP start_time;
ALTER TABLE exception_working_hours RENAME start_time_timezone_offset TO start_date_timezone_offset;
ALTER TABLE exception_working_hours RENAME end_time_timezone_offset TO end_date_timezone_offset;
DELETE FROM exception_working_hours;
ALTER TABLE exception_working_hours ALTER start_date SET NOT NULL;
ALTER TABLE exception_working_hours ALTER end_date SET NOT NULL;
ALTER TABLE exception_working_hours ALTER room_id SET NOT NULL;

# --- !Downs
-- No going back