-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

ALTER TABLE default_working_hours
    ALTER COLUMN start_time TYPE TIME
    USING ((start_time AT TIME ZONE 'UTC') + (timezone_offset * INTERVAL '1 millisecond'));

ALTER TABLE default_working_hours
    ALTER COLUMN end_time TYPE TIME
    USING ((end_time AT TIME ZONE 'UTC') + (timezone_offset * INTERVAL '1 millisecond'));

ALTER TABLE default_working_hours DROP COLUMN timezone_offset;

ALTER TABLE exception_working_hours DROP COLUMN start_date_timezone_offset;

ALTER TABLE exception_working_hours DROP COLUMN end_date_timezone_offset;

# --- !Downs

ALTER TABLE default_working_hours ADD COLUMN timezone_offset INTEGER NOT NULL DEFAULT 7200000;

ALTER TABLE default_working_hours
    ALTER COLUMN start_time TYPE TIMETZ
    USING (start_time AT TIME ZONE 'UTC');

ALTER TABLE default_working_hours
    ALTER COLUMN end_time TYPE TIMETZ
    USING (end_time AT TIME ZONE 'UTC');

ALTER TABLE default_working_hours ALTER COLUMN timezone_offset DROP DEFAULT;

ALTER TABLE exception_working_hours ADD COLUMN start_date_timezone_offset INTEGER NOT NULL DEFAULT 7200000;

ALTER TABLE exception_working_hours ALTER COLUMN start_date_timezone_offset DROP DEFAULT;

ALTER TABLE exception_working_hours ADD COLUMN end_date_timezone_offset INTEGER NOT NULL DEFAULT 7200000;

ALTER TABLE exception_working_hours ALTER COLUMN end_date_timezone_offset DROP DEFAULT;
