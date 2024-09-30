-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE external_reservation ADD room_instruction TEXT NULL;
ALTER TABLE external_reservation ADD room_instruction_en TEXT NULL;
ALTER TABLE external_reservation ADD room_instruction_sv TEXT NULL;

# --- !Downs
ALTER TABLE external_reservation DROP room_instruction;
ALTER TABLE external_reservation DROP room_instruction_en;
ALTER TABLE external_reservation DROP room_instruction_sv;
