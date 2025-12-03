-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
UPDATE exam SET state = 14 WHERE state = 13;

# --- !Downs
UPDATE exam SET state = 13 WHERE state = 14;
