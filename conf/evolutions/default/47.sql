# --- !Ups
CREATE TABLE exam_execution_type (
  id INTEGER NOT NULL,
  type VARCHAR(32) NOT NULL,
  description VARCHAR(64),
  CONSTRAINT PK_EXAM_EXECUTION_TYPE PRIMARY KEY(id)
);
INSERT INTO exam_execution_type VALUES (1, 'PUBLIC', 'Not restricted to specific students');
INSERT INTO exam_execution_type VALUES (2, 'PRIVATE', 'Restricted to specific students');

ALTER TABLE exam ADD execution_type_id INTEGER;
ALTER TABLE exam ADD CONSTRAINT FK_EXAM_EXECUTION_TYPE FOREIGN KEY (execution_type_id) REFERENCES exam_execution_type(id);
UPDATE exam SET execution_type_id = 1;
ALTER TABLE exam ALTER execution_type_id SET NOT NULL;

# --- !Downs
ALTER TABLE exam DROP execution_type_id;
DROP TABLE exam_execution_type;