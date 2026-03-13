-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

ALTER TABLE exam_machine DROP COLUMN IF EXISTS accessibility_info;
ALTER TABLE exam_machine DROP COLUMN IF EXISTS accessible;
DROP TABLE IF EXISTS exam_machine_accessibility CASCADE;

# --- !Downs

ALTER TABLE exam_machine ADD COLUMN accessibility_info VARCHAR(255);
ALTER TABLE exam_machine ADD COLUMN accessible BOOLEAN DEFAULT FALSE;

CREATE TABLE exam_machine_accessibility (
  exam_machine_id   BIGINT NOT NULL,
  accessibility_id  BIGINT NOT NULL,
  CONSTRAINT pk_exam_machine_accessibility PRIMARY KEY (exam_machine_id, accessibility_id)
);
ALTER TABLE exam_machine_accessibility ADD CONSTRAINT fk_exam_machine_accessibility_01 FOREIGN KEY (exam_machine_id) REFERENCES exam_machine (id);
ALTER TABLE exam_machine_accessibility ADD CONSTRAINT fk_exam_machine_accessibility_02 FOREIGN KEY (accessibility_id) REFERENCES accessibility (id);
