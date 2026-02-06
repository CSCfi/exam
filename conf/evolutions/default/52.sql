-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups
ALTER TABLE exam_participation ADD reservation_id BIGINT;
ALTER TABLE exam_participation ADD CONSTRAINT fk_exam_participation_reservation FOREIGN KEY (reservation_id) REFERENCES reservation(id);
ALTER TABLE reservation ADD retrial_permitted BOOLEAN NOT NULL DEFAULT FALSE;

# --- !Downs
ALTER TABLE exam_participation DROP reservation_id CASCADE;
ALTER TABLE reservation DROP retrial_permitted;