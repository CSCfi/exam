-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

-- Lock time of a student exam copy, backfilled from the exam record or the grading time
-- for copies already in GRADED_LOGGED (8), ARCHIVED (9) or REJECTED (12)
ALTER TABLE exam ADD locked_at TIMESTAMPTZ;
UPDATE exam e SET locked_at = COALESCE(
    (SELECT er.time_stamp FROM exam_record er WHERE er.exam_id = e.id),
    e.graded_time)
WHERE e.state IN (8, 9, 12)
AND e.parent_id IS NOT NULL;
CREATE INDEX ix_exam_locked_at ON exam (locked_at);

# --- !Downs

DROP INDEX ix_exam_locked_at;
ALTER TABLE exam DROP locked_at;
