-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam_score ADD institution_name VARCHAR(255) NULL;

# --- !Downs
ALTER TABLE exam_score DROP institution_name;
