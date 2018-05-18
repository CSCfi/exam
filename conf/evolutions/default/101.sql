# --- !Ups
CREATE TABLE collaborative_exam (
  id BIGINT NOT NULL,
  external_ref VARCHAR(36) NOT NULL,
  created TIMESTAMPTZ NOT NULL,
  object_version BIGINT NOT NULL,
  CONSTRAINT PK_COLLABORATIVE_EXAM PRIMARY KEY (id)
);

# --- !Downs
DROP TABLE collaborative_exam CASCADE;
DROP SEQUENCE IF EXISTS collaborative_exam_seq;
