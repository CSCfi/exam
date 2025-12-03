-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam ADD auto_evaluation_notified TIMESTAMPTZ;

# --- !Downs
ALTER TABLE exam DROP auto_evaluation_notified;
