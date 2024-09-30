-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam_feedback_config DROP amount_days;
UPDATE exam_feedback_config SET release_type = 1 WHERE release_type = 2 OR release_type = 4;

# --- !Downs
ALTER TABLE exam_feedback_config ADD amount_days INTEGER;
