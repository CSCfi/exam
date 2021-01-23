# --- !Ups
ALTER TABLE reservation ADD reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;

# --- !Downs
ALTER TABLE reservation DROP reminder_sent;
