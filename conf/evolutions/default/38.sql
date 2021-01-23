# --- !Ups
ALTER TABLE exception_working_hours ADD out_of_service BOOLEAN NOT NULL DEFAULT TRUE;

# --- !Downs
ALTER TABLE exception_working_hours DROP out_of_service;
