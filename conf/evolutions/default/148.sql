-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

ALTER TABLE exam_starting_hour
    ALTER COLUMN starting_hour TYPE TIME
    USING ((starting_hour AT TIME ZONE 'UTC') + (timezone_offset * INTERVAL '1 millisecond'));

ALTER TABLE exam_starting_hour DROP COLUMN timezone_offset;

# --- !Downs

-- The Ups dropped the per-row offsets for good, so a rollback cannot restore them; every row
-- comes back on the 2 hour default. The conversion below at least makes the round trip an
-- identity: it pre-subtracts exactly what the Ups adds back, and stamps the offset explicitly
-- as +00 rather than going through `AT TIME ZONE`, which would resolve against the session
-- timezone and so drift by an hour whenever a rollback happened during summer time.

ALTER TABLE exam_starting_hour ADD COLUMN timezone_offset INTEGER NOT NULL DEFAULT 7200000;

ALTER TABLE exam_starting_hour
    ALTER COLUMN starting_hour TYPE TIMETZ
    USING (((starting_hour - (7200000 * INTERVAL '1 millisecond'))::text || '+00')::timetz);

ALTER TABLE exam_starting_hour ALTER COLUMN timezone_offset DROP DEFAULT;
