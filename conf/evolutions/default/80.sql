-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam ADD COLUMN gradeless BOOLEAN NOT NULL DEFAULT FALSE;

# --- !Downs
ALTER TABLE exam DROP COLUMN gradeless;
