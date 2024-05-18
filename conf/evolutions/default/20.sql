-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE tag DROP CONSTRAINT ak_tag_name;
ALTER TABLE tag ADD CONSTRAINT ak_tag_name_creator_id UNIQUE (name, creator_id);

# --- !Downs
ALTER TABLE tag DROP CONSTRAINT ak_tag_name_creator_id;
ALTER TABLE tag ADD CONSTRAINT ak_tag_name UNIQUE (name);
