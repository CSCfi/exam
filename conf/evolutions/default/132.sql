-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE examination_event_configuration ADD encrypted_quit_password BYTEA NULL;
ALTER TABLE examination_event_configuration ADD quit_password_salt VARCHAR(36) NULL;
# --- !Downs
ALTER TABLE examination_event_configuration DROP encrypted_quit_password;
ALTER TABLE examination_event_configuration DROP quit_password_salt;
