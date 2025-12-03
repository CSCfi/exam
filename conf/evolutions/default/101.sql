-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE external_reservation ADD COLUMN org_name VARCHAR(64);
ALTER TABLE external_reservation ADD COLUMN org_code VARCHAR(12);


# --- !Downs
ALTER TABLE external_reservation DROP COLUMN org_name;
ALTER TABLE external_reservation DROP COLUMN org_code;
