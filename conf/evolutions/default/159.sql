-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

-- LTI questions name their tool (a key of lti.tools) and the custom parameters picking the
-- content in it. Existing questions are Moodle ones, launched with the resource as custom id.
ALTER TABLE question ADD COLUMN lti_tool TEXT;
ALTER TABLE question ADD COLUMN lti_custom JSONB;
UPDATE question SET lti_tool = 'moodle', lti_custom = jsonb_build_object('id', lti_id) WHERE lti_id IS NOT NULL;
ALTER TABLE question DROP COLUMN lti_id;

# --- !Downs

ALTER TABLE question ADD COLUMN lti_id TEXT;
UPDATE question SET lti_id = lti_custom ->> 'id' WHERE lti_custom IS NOT NULL;
ALTER TABLE question DROP COLUMN lti_custom;
ALTER TABLE question DROP COLUMN lti_tool;
