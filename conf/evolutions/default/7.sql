-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

ALTER TABLE exam ADD enroll_instruction TEXT;

# --- !Downs

ALTER TABLE exam DROP enroll_instruction;
