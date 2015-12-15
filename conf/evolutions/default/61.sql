# --- !Ups
UPDATE exam_participation SET ended = ended + '1 hour', started = started + '1 hour'
WHERE id IN (
  SELECT id FROM exam_participation
  WHERE (started, ended) OVERLAPS ('2015-03-29 00:00:00'::DATE, '2015-10-25 01:00:00'::DATE)
);

# --- !Downs
UPDATE exam_participation SET ended = ended + '-1 hour', started = started + '-1 hour'
WHERE id IN (
  SELECT id FROM exam_participation
  WHERE (started, ended) OVERLAPS ('2015-03-29 00:00:00'::DATE, '2015-10-25 01:00:00'::DATE)
);
