-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
INSERT INTO permission (id, object_version, type, description) VALUES (2, 1, 2, 'can create BYOD exams')

# --- !Downs
DELETE FROM permission where id = 2;
