-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam_section_question
  ADD COLUMN forced_score DECIMAL NULL;

# --- !Downs
ALTER TABLE exam_section_question
  DROP COLUMN forced_score;
