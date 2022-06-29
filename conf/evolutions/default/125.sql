# --- !Ups
ALTER TABLE exception_working_hours DROP mass_edited;

# --- !Downs
ALTER TABLE exception_working_hours ADD mass_edited BOOLEAN DEFAULT FALSE;
