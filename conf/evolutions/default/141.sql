-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
INSERT INTO role (id, name, object_version) VALUES (4, 'SUPPORT', 1);

# --- !Downs
DELETE FROM app_user_role WHERE role_id = 4;
DELETE FROM role WHERE id = 4;
