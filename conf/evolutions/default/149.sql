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

-- As in 148: the per-row offsets are gone for good, so everything comes back on the 2 hour
-- default. Pre-subtracting what the Ups adds back, and stamping +00 explicitly instead of
-- letting `AT TIME ZONE` resolve against the session timezone, keeps the round trip an identity
-- and stops a summer rollback from moving every opening hour an hour earlier.

ALTER TABLE default_working_hours ADD COLUMN timezone_offset INTEGER NOT NULL DEFAULT 7200000;

ALTER TABLE default_working_hours
    ALTER COLUMN start_time TYPE TIMETZ
    USING (((start_time - (7200000 * INTERVAL '1 millisecond'))::text || '+00')::timetz);

ALTER TABLE default_working_hours
    ALTER COLUMN end_time TYPE TIMETZ
    USING (((end_time - (7200000 * INTERVAL '1 millisecond'))::text || '+00')::timetz);

ALTER TABLE default_working_hours ALTER COLUMN timezone_offset DROP DEFAULT;

ALTER TABLE exception_working_hours ADD COLUMN start_date_timezone_offset INTEGER NOT NULL DEFAULT 7200000;

ALTER TABLE exception_working_hours ALTER COLUMN start_date_timezone_offset DROP DEFAULT;

ALTER TABLE exception_working_hours ADD COLUMN end_date_timezone_offset INTEGER NOT NULL DEFAULT 7200000;

ALTER TABLE exception_working_hours ALTER COLUMN end_date_timezone_offset DROP DEFAULT;
