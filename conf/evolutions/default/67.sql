-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam DROP grade;
ALTER TABLE exam DROP exam_grade_id;

# --- !Downs
ALTER TABLE exam ADD grade VARCHAR(255);
ALTER TABLE exam ADD exam_grade_id BIGINT;

