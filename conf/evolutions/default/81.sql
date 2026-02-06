-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE course ADD CONSTRAINT AK_COURSE_CODE UNIQUE (code);

# --- !Downs
ALTER TABLE course DROP CONSTRAINT AK_COURSE_CODE;
