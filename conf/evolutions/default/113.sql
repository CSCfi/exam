-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

-- !Ups
ALTER TABLE comment ADD feedback_status BOOLEAN DEFAULT 'false';

-- !Downs
ALTER TABLE comment DROP feedback_status;
