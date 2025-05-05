DELETE FROM exam_enrolment
WHERE ctid IN (
    SELECT ctid
    FROM exam_enrolment
    where enrolled_on > 'now'::timestamp - '1 hour'::interval
    )

DELETE FROM exam_participation
WHERE ctid IN (
    SELECT ctid
    FROM exam_participation
    where started > 'now'::timestamp - '1 hour'::interval
)

DELETE FROM reservation
WHERE ctid IN (
    SELECT ctid
    FROM reservation
    where start_at > 'now'::timestamp - '1 hour'::interval
    )
