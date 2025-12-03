-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam_section ALTER lottery_item_count SET DEFAULT 1;
ALTER TABLE exam_section ALTER lottery_item_count SET NOT NULL;
UPDATE exam_section SET lottery_item_count = 1 where lottery_item_count = 0;

# --- !Downs
ALTER TABLE exam_section ALTER lottery_item_count DROP NOT NULL;
ALTER TABLE exam_section ALTER lottery_item_count DROP DEFAULT;
