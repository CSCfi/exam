-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam_section DROP total_score;

# --- !Downs
ALTER TABLE exam_section ADD total_score BIGINT;
