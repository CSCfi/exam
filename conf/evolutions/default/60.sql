# --- !Ups
ALTER TABLE exception_working_hours ADD mass_edited BOOLEAN DEFAULT false NULL;

# --- !Downs
ALTER TABLE exception_working_hours DROP mass_edited;
