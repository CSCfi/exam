# --- !Ups
ALTER TABLE default_working_hours ALTER start_time TYPE TIMESTAMPTZ;
ALTER TABLE default_working_hours ALTER end_time TYPE TIMESTAMPTZ;

ALTER TABLE reservation ALTER start_at TYPE TIMESTAMPTZ;
ALTER TABLE reservation ALTER end_at TYPE TIMESTAMPTZ;

ALTER TABLE exam_enrolment ALTER enrolled_on TYPE TIMESTAMPTZ;

ALTER TABLE exam_participation ALTER started TYPE TIMESTAMPTZ;
ALTER TABLE exam_participation ALTER ended TYPE TIMESTAMPTZ;
ALTER TABLE exam_participation ALTER duration TYPE TIMESTAMPTZ;
ALTER TABLE exam_participation ALTER deadline TYPE TIMESTAMPTZ;

ALTER TABLE exam ALTER exam_active_start_date TYPE TIMESTAMPTZ;
ALTER TABLE exam ALTER exam_active_end_date TYPE TIMESTAMPTZ;
ALTER TABLE exam ALTER graded_time TYPE TIMESTAMPTZ;

ALTER TABLE exam_record ALTER time_stamp TYPE TIMESTAMPTZ;
ALTER TABLE exam_record ALTER recorded_on TYPE TIMESTAMPTZ;

# --- !Downs
ALTER TABLE exam_record ALTER time_stamp TYPE TIMESTAMP;
ALTER TABLE exam_record ALTER recorded_on TYPE TIMESTAMPTZ;

ALTER TABLE exam ALTER exam_active_start_date TYPE TIMESTAMP;
ALTER TABLE exam ALTER exam_active_end_date TYPE TIMESTAMP;
ALTER TABLE exam ALTER graded_time TYPE TIMESTAMP;

ALTER TABLE exam_participation ALTER started TYPE TIMESTAMP;
ALTER TABLE exam_participation ALTER ended TYPE TIMESTAMP;
ALTER TABLE exam_participation ALTER duration TYPE TIMESTAMP;
ALTER TABLE exam_participation ALTER deadline TYPE TIMESTAMP;

ALTER TABLE exam_enrolment ALTER enrolled_on TYPE TIMESTAMP;

ALTER TABLE reservation ALTER start_at TYPE TIMESTAMP;
ALTER TABLE reservation ALTER end_at TYPE TIMESTAMP;

ALTER TABLE default_working_hours ALTER start_time TYPE TIMESTAMP;
ALTER TABLE default_working_hours ALTER end_time TYPE TIMESTAMP;