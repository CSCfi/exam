-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
CREATE UNIQUE INDEX ak_exam_participation_exam_id ON exam_participation(exam_id);

# --- !Downs
DROP INDEX ak_exam_participation_exam_id;
