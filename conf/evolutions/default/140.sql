-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE question ADD default_option_shuffling_on BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE exam_section_question ADD option_shuffling_on BOOLEAN NOT NULL DEFAULT TRUE;

# --- !Downs
ALTER TABLE exam_section_question DROP option_shuffling_on;
ALTER TABLE question DROP default_option_shuffling_on;
