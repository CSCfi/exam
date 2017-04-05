# --- !Ups
CREATE TABLE external_exam (
  hash VARCHAR(32) NOT NULL,
  content JSONB NOT NULL,
  created TIMESTAMPTZ NOT NULL,
  started TIMESTAMPTZ NULL,
  finished TIMESTAMPTZ NULL,
  creator_id BIGINT NOT NULL,
  object_version BIGINT NOT NULL,
  CONSTRAINT PK_EXTERNAL_EXAM PRIMARY KEY (hash)
);

ALTER TABLE external_exam ADD CONSTRAINT FK_EXTERNAL_EXAM_APP_USER FOREIGN KEY (creator_id) REFERENCES app_user(id);
ALTER TABLE exam_enrolment ADD external_exam_id VARCHAR(32) NULL;
ALTER TABLE exam_enrolment ADD CONSTRAINT FK_EXAM_ENROLMENT_EXTERNAL_EXAM FOREIGN KEY (external_exam_id) REFERENCES external_exam(hash);

CREATE INDEX IX_EXTERNAL_EXAM_USER ON external_exam (creator_id);
CREATE INDEX IX_EXAM_ENROLMENT_EXTERNAL_USER ON exam_enrolment (external_exam_id);

# --- !Downs
ALTER TABLE exam_enrolment DROP external_exam_id;
DROP TABLE external_exam CASCADE;
