-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE grade_scale ADD external_ref BIGINT;
ALTER TABLE grade_scale ADD display_name VARCHAR(32);
CREATE SEQUENCE grade_scale_seq START WITH 4;
ALTER TABLE grade_scale ALTER id SET DEFAULT nextval('grade_scale_seq');

# --- !Downs
ALTER TABLE grade_scale DROP external_ref;
ALTER TABLE grade_scale DROP display_name;
ALTER TABLE grade_scale ALTER id DROP DEFAULT;
DROP SEQUENCE grade_scale_seq;

