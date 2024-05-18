-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE multiple_choice_option ADD claim_choice_type INTEGER;


# --- !Downs
ALTER TABLE multiple_choice_option DROP COLUMN claim_choice_type;