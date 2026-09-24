-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

-- delivery_abandoned_at: when a scheduled job stopped trying to send the attempt, because XM or
-- the receiver no longer knew it. The retention job removes these with their booking
-- delivery_attempted_at: when the job last tried, for the weekly retries of attempts that have
-- kept failing
ALTER TABLE external_exam ADD delivery_abandoned_at TIMESTAMPTZ;
ALTER TABLE external_exam ADD delivery_attempted_at TIMESTAMPTZ;
ALTER TABLE exam_participation ADD delivery_abandoned_at TIMESTAMPTZ;
ALTER TABLE exam_participation ADD delivery_attempted_at TIMESTAMPTZ;

# --- !Downs

ALTER TABLE exam_participation DROP delivery_attempted_at;
ALTER TABLE exam_participation DROP delivery_abandoned_at;
ALTER TABLE external_exam DROP delivery_attempted_at;
ALTER TABLE external_exam DROP delivery_abandoned_at;
