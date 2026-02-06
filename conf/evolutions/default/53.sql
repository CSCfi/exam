-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE comment DROP reply_id;
ALTER TABLE comment ADD attachment_id BIGINT;
ALTER TABLE comment ADD CONSTRAINT fk_comment_attachment FOREIGN KEY (attachment_id) REFERENCES attachment(id);

# --- !Downs
ALTER TABLE comment ADD reply_id BIGINT;
ALTER TABLE comment DROP attachment_id CASCADE;