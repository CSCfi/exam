-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
DROP SEQUENCE IF EXISTS course_unit_info_seq;
DROP SEQUENCE IF EXISTS evaluation_criteria_seq;
DROP SEQUENCE IF EXISTS evaluation_phrase_seq;
DROP SEQUENCE IF EXISTS haka_attribute_seq;
DROP SEQUENCE IF EXISTS material_seq;
DROP SEQUENCE IF EXISTS mime_type_seq;

# --- !Downs
-- No going back