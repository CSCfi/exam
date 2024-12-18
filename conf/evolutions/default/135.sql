-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE reservation ADD external_org_ref character varying(32);
ALTER TABLE reservation ADD external_org_name character varying(255);

# --- !Downs
ALTER TABLE reservation DROP external_org_ref;
ALTER TABLE reservation DROP external_org_name;
