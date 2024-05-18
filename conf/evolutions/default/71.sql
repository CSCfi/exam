-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE grade_scale ALTER display_name TYPE VARCHAR(201);

# --- !Downs
ALTER TABLE grade_scale ALTER display_name TYPE VARCHAR(32);
