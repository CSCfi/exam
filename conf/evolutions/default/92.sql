-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam ADD internal_ref VARCHAR(128) NULL;

# --- !Downs
ALTER TABLE exam DROP internal_ref;
