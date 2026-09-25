-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

CREATE INDEX ix_reservation_start_at ON reservation (start_at);

# --- !Downs

DROP INDEX ix_reservation_start_at;
