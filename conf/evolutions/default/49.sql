-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE multiple_choise_option RENAME TO multiple_choice_option;
ALTER SEQUENCE multiple_choise_option_seq RENAME TO multiple_choice_option_seq;
ALTER TABLE app_user RENAME COLUMN has_accepted_user_agreament TO user_agreement_accepted;

# --- !Downs
ALTER TABLE multiple_choice_option RENAME TO multiple_choise_option;
ALTER SEQUENCE multiple_choice_option_seq RENAME TO multiple_choise_option_seq;
ALTER TABLE app_user RENAME COLUMN user_agreement_accepted TO has_accepted_user_agreament;
