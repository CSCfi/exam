-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

ALTER TABLE exam_starting_hour
    ALTER COLUMN starting_hour TYPE TIME
    USING ((starting_hour AT TIME ZONE 'UTC') + (timezone_offset * INTERVAL '1 millisecond'));

ALTER TABLE exam_starting_hour DROP COLUMN timezone_offset;

# --- !Downs

ALTER TABLE exam_starting_hour ADD COLUMN timezone_offset INTEGER NOT NULL DEFAULT 7200000;

ALTER TABLE exam_starting_hour
    ALTER COLUMN starting_hour TYPE TIMETZ
    USING (starting_hour AT TIME ZONE 'UTC');

ALTER TABLE exam_starting_hour ALTER COLUMN timezone_offset DROP DEFAULT;
