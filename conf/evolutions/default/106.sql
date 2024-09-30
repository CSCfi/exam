-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam_participation
  ADD COLUMN sent_for_review TIMESTAMPTZ NULL;

# --- !Downs
ALTER TABLE exam_participation
  DROP COLUMN sent_for_review;

