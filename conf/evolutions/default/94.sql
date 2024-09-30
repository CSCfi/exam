-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE reservation ADD reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;

# --- !Downs
ALTER TABLE reservation DROP reminder_sent;
