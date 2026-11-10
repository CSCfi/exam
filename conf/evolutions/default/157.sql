-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

-- Legacy column names, renamed to match the model and JSON field names
ALTER TABLE exam RENAME COLUMN exam_active_start_date TO period_start;
ALTER TABLE exam RENAME COLUMN exam_active_end_date TO period_end;
ALTER TABLE collaborative_exam RENAME COLUMN exam_active_start_date TO period_start;
ALTER TABLE collaborative_exam RENAME COLUMN exam_active_end_date TO period_end;

# --- !Downs

ALTER TABLE collaborative_exam RENAME COLUMN period_end TO exam_active_end_date;
ALTER TABLE collaborative_exam RENAME COLUMN period_start TO exam_active_start_date;
ALTER TABLE exam RENAME COLUMN period_end TO exam_active_end_date;
ALTER TABLE exam RENAME COLUMN period_start TO exam_active_start_date;
