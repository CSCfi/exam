-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
-- clean up unused tables
DROP TABLE haka_attribute CASCADE;
DROP TABLE material CASCADE;
DROP TABLE mime_type CASCADE;
DROP TABLE calendar_event CASCADE;
ALTER TABLE exam_record DROP COLUMN course_unit_info_id;
DROP TABLE course_unit_info CASCADE;
DROP TABLE evaluation_criteria CASCADE;
ALTER TABLE question DROP COLUMN evaluation_phrases_id;
DROP TABLE evaluation_phrase CASCADE;

# --- !Downs
-- no going back