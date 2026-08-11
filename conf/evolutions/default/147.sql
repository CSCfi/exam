-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

# --- !Ups

UPDATE reservation
SET    start_at = start_at - INTERVAL '1 hour',
       end_at   = end_at   - INTERVAL '1 hour'
FROM   exam_machine m
JOIN   exam_room rm ON m.room_id = rm.id
WHERE  reservation.machine_id = m.id
  AND  reservation.external_ref IS NULL
  AND  (reservation.start_at AT TIME ZONE rm.local_timezone) - (reservation.start_at AT TIME ZONE 'UTC')
         <>
       (DATE_TRUNC('year', reservation.start_at) AT TIME ZONE rm.local_timezone) - (DATE_TRUNC('year', reservation.start_at) AT TIME ZONE 'UTC');

UPDATE exam_participation ep
SET    started  = ep.started  - INTERVAL '1 hour',
       ended    = CASE WHEN ep.ended    IS NOT NULL THEN ep.ended    - INTERVAL '1 hour' ELSE ep.ended    END,
       deadline = CASE WHEN ep.deadline IS NOT NULL THEN ep.deadline - INTERVAL '1 hour' ELSE ep.deadline END
FROM   reservation r
JOIN   exam_machine m  ON r.machine_id = m.id
JOIN   exam_room    rm ON m.room_id    = rm.id
WHERE  ep.reservation_id = r.id
  AND  r.external_ref IS NULL
  AND  (ep.started AT TIME ZONE rm.local_timezone) - (ep.started AT TIME ZONE 'UTC')
         <>
       (DATE_TRUNC('year', ep.started) AT TIME ZONE rm.local_timezone) - (DATE_TRUNC('year', ep.started) AT TIME ZONE 'UTC');

UPDATE external_exam ee
SET    started  = ee.started  - INTERVAL '1 hour',
       finished = CASE WHEN ee.finished IS NOT NULL THEN ee.finished - INTERVAL '1 hour' ELSE ee.finished END
FROM   exam_enrolment enr
JOIN   reservation r   ON enr.reservation_id = r.id
JOIN   exam_machine m  ON r.machine_id       = m.id
JOIN   exam_room    rm ON m.room_id          = rm.id
WHERE  enr.external_exam_id = ee.id
  AND  r.external_ref IS NULL
  AND  (ee.started AT TIME ZONE rm.local_timezone) - (ee.started AT TIME ZONE 'UTC')
         <>
       (DATE_TRUNC('year', ee.started) AT TIME ZONE rm.local_timezone) - (DATE_TRUNC('year', ee.started) AT TIME ZONE 'UTC');

# --- !Downs

UPDATE reservation
SET    start_at = start_at + INTERVAL '1 hour',
       end_at   = end_at   + INTERVAL '1 hour'
FROM   exam_machine m
JOIN   exam_room rm ON m.room_id = rm.id
WHERE  reservation.machine_id = m.id
  AND  reservation.external_ref IS NULL
  AND  (reservation.start_at AT TIME ZONE rm.local_timezone) - (reservation.start_at AT TIME ZONE 'UTC')
         =
       (DATE_TRUNC('year', reservation.start_at) AT TIME ZONE rm.local_timezone) - (DATE_TRUNC('year', reservation.start_at) AT TIME ZONE 'UTC');

UPDATE exam_participation ep
SET    started  = ep.started  + INTERVAL '1 hour',
       ended    = CASE WHEN ep.ended    IS NOT NULL THEN ep.ended    + INTERVAL '1 hour' ELSE ep.ended    END,
       deadline = CASE WHEN ep.deadline IS NOT NULL THEN ep.deadline + INTERVAL '1 hour' ELSE ep.deadline END
FROM   reservation r
JOIN   exam_machine m  ON r.machine_id = m.id
JOIN   exam_room    rm ON m.room_id    = rm.id
WHERE  ep.reservation_id = r.id
  AND  r.external_ref IS NULL
  AND  (ep.started AT TIME ZONE rm.local_timezone) - (ep.started AT TIME ZONE 'UTC')
         =
       (DATE_TRUNC('year', ep.started) AT TIME ZONE rm.local_timezone) - (DATE_TRUNC('year', ep.started) AT TIME ZONE 'UTC');

UPDATE external_exam ee
SET    started  = ee.started  + INTERVAL '1 hour',
       finished = CASE WHEN ee.finished IS NOT NULL THEN ee.finished + INTERVAL '1 hour' ELSE ee.finished END
FROM   exam_enrolment enr
JOIN   reservation r   ON enr.reservation_id = r.id
JOIN   exam_machine m  ON r.machine_id       = m.id
JOIN   exam_room    rm ON m.room_id          = rm.id
WHERE  enr.external_exam_id = ee.id
  AND  r.external_ref IS NULL
  AND  (ee.started AT TIME ZONE rm.local_timezone) - (ee.started AT TIME ZONE 'UTC')
         =
       (DATE_TRUNC('year', ee.started) AT TIME ZONE rm.local_timezone) - (DATE_TRUNC('year', ee.started) AT TIME ZONE 'UTC');
