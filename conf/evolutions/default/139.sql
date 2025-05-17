-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE question ADD default_negative_score_allowed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE exam_section_question ADD negative_score_allowed BOOLEAN NOT NULL DEFAULT FALSE;

# --- !Downs
ALTER TABLE exam_section_question DROP negative_score_allowed;
ALTER TABLE question DROP default_negative_score_allowed;
