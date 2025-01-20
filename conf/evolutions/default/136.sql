-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE reservation
    ADD CONSTRAINT no_double_bookings
        EXCLUDE USING gist (
        machine_id WITH =,
        tstzrange(start_at, end_at) WITH &&
        );

# --- !Downs
ALTER TABLE reservation DROP CONSTRAINT no_double_bookings;
