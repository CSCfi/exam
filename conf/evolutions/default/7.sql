# --- !Ups

ALTER TABLE exam ADD enroll_instruction TEXT;

# --- !Downs

ALTER TABLE exam DROP enroll_instruction;
