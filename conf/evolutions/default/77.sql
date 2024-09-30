-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam_section ADD COLUMN description TEXT;

# --- !Downs
ALTER TABLE exam_section DROP COLUMN description;