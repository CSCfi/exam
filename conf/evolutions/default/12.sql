-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

ALTER TABLE exam_record ADD recorded_on timestamp;

# --- !Downs

ALTER TABLE exam_record DROP recorded_on;
