# --- !Ups
ALTER TABLE examination_event ADD capacity INT NOT NULL DEFAULT 1000;

# --- !Downs
ALTER TABLE examination_event DROP capacity;
