-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE software ADD COLUMN status VARCHAR(255);
UPDATE software SET status = 'ACTIVE';

# --- !Downs
ALTER TABLE software DROP COLUMN status;
