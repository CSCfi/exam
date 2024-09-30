-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam_enrolment ADD pre_enrolled_user_email VARCHAR(255) NULL;

# --- !Downs
ALTER TABLE exam_enrolment DROP pre_enrolled_user_email;
