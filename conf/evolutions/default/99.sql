# --- !Ups
ALTER TABLE exam ADD assessment_info VARCHAR NULL;

# --- !Downs
ALTER TABLE exam DROP assessment_info;
