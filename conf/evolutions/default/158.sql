-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

-- IF NOT EXISTS: earlier lti builds added this column under other evolution numbers (135-157)
ALTER TABLE question ADD COLUMN IF NOT EXISTS lti_id TEXT;

# --- !Downs

ALTER TABLE question DROP COLUMN lti_id;
