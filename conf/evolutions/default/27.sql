# --- !Ups
ALTER TABLE exception_working_hours ALTER start_date TYPE TIMESTAMPTZ;
ALTER TABLE exception_working_hours ALTER start_time TYPE TIMESTAMPTZ;
ALTER TABLE exception_working_hours ALTER end_date TYPE TIMESTAMPTZ;
ALTER TABLE exception_working_hours ALTER end_time TYPE TIMESTAMPTZ;

# --- !Downs
ALTER TABLE exception_working_hours ALTER start_date TYPE TIMESTAMP;
ALTER TABLE exception_working_hours ALTER start_time TYPE TIMESTAMP;
ALTER TABLE exception_working_hours ALTER end_date TYPE TIMESTAMP;
ALTER TABLE exception_working_hours ALTER end_time TYPE TIMESTAMP;
