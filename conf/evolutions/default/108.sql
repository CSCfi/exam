# --- !Ups
CREATE TABLE exam_material
(
  id             BIGINT       NOT NULL,
  name           VARCHAR(256) NOT NULL,
  isbn           VARCHAR(17),
  author         VARCHAR(128),
  created        TIMESTAMPTZ  NOT NULL,
  creator_id     BIGINT       NOT NULL,
  modified       TIMESTAMPTZ  NOT NULL,
  modifier_id    BIGINT       NOT NULL,
  object_version BIGINT,
  CONSTRAINT PK_EXAM_MATERIAL PRIMARY KEY (id)
);
CREATE SEQUENCE exam_material_seq;

ALTER TABLE exam_material ADD CONSTRAINT fk_exam_material_modifier FOREIGN KEY (modifier_id) REFERENCES app_user (id);
ALTER TABLE exam_material ADD CONSTRAINT fk_exam_material_creator FOREIGN KEY (creator_id) REFERENCES app_user (id);

CREATE TABLE exam_section_material
(
  exam_section_id  BIGINT NOT NULL,
  exam_material_id BIGINT NOT NULL,
  CONSTRAINT pk_exam_section_material PRIMARY KEY (exam_section_id, exam_material_id)
);

ALTER TABLE exam_section_material
  ADD CONSTRAINT fk_exam_section_material_exam_section FOREIGN KEY (exam_section_id) REFERENCES exam_section (id);
ALTER TABLE exam_section_material
  ADD CONSTRAINT fk_exam_section_material_exam_material FOREIGN KEY (exam_material_id) REFERENCES exam_material (id);

ALTER TABLE exam_section ADD optional BOOLEAN DEFAULT FALSE;

# --- !Downs

ALTER TABLE exam_section DROP optional;

DROP TABLE exam_section_material;
DROP TABLE exam_material;
DROP SEQUENCE exam_material_seq;

