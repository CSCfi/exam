-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam_score ADD COLUMN lecturer_employee_number varchar(255);

# --- !Downs
ALTER TABLE exam_score DROP COLUMN lecturer_employeeNumber;
