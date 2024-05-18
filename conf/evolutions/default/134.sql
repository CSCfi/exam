-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam_enrolment ADD delay INT NOT NULL DEFAULT 0;

# --- !Downs
ALTER TABLE exam_enrolment DROP delay;
