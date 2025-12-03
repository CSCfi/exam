-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
alter table exam_score add column additional_info TEXT;
# --- !Downs
alter table exam_score drop column additional_info;
