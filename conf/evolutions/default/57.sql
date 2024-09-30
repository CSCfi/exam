-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE multiple_choice_option ALTER option TYPE TEXT;

# --- !Downs
ALTER TABLE multiple_choice_option ALTER option TYPE VARCHAR(255);
