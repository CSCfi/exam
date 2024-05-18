-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE examination_event ADD capacity INT NOT NULL DEFAULT 1000;

# --- !Downs
ALTER TABLE examination_event DROP capacity;
