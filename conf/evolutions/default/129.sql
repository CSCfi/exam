-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE reservation ADD sent_as_no_show BOOLEAN DEFAULT FALSE;

# --- !Downs
ALTER TABLE reservation DROP sent_as_no_show;
