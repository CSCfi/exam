-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE question DROP COLUMN question_type;
ALTER TABLE question ALTER type SET NOT NULL;
ALTER TABLE answer DROP COLUMN answer_type;
ALTER TABLE answer ALTER type SET NOT NULL;

# --- !Downs
-- No going back