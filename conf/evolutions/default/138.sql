-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam_record ADD releasable BOOLEAN DEFAULT TRUE;

# --- !Downs
ALTER TABLE exam_record DROP releasable;
