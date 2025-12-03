-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
UPDATE exam SET hash = md5(random()::text) WHERE hash IS NULL;
ALTER TABLE exam ALTER hash SET NOT NULL;

# --- !Downs
ALTER TABLE exam ALTER hash DROP NOT NULL;
