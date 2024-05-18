-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam_enrolment ADD reservation_canceled BOOLEAN NOT NULL DEFAULT FALSE;

# --- !Downs
ALTER TABLE exam_enrolment DROP reservation_canceled;
