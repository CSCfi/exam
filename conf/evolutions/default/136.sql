-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
UPDATE exam_enrolment SET delay = delay * 1000;

# --- !Downs
UPDATE exam_enrolment SET delay = delay / 1000;
