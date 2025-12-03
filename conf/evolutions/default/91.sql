-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam DROP question_sheet_return_policy;

# --- !Downs
ALTER TABLE exam ADD question_sheet_return_policy BOOLEAN;
