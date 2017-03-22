# --- !Ups
ALTER TABLE exam DROP question_sheet_return_policy;

# --- !Downs
ALTER TABLE exam ADD question_sheet_return_policy BOOLEAN;
