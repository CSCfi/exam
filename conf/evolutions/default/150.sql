-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

-- When a scheduled job stopped trying to deliver the item to XM, because XM no longer knew it
-- or it had kept failing. The retention job removes these with their booking
ALTER TABLE external_exam ADD delivery_abandoned_at TIMESTAMPTZ;
ALTER TABLE exam_participation ADD delivery_abandoned_at TIMESTAMPTZ;

# --- !Downs

ALTER TABLE exam_participation DROP delivery_abandoned_at;
ALTER TABLE external_exam DROP delivery_abandoned_at;
