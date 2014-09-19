# --- !Ups
ALTER TABLE answer ALTER COLUMN ebean_timestamp SET DATA TYPE bigint USING 0::bigint;
ALTER TABLE question ALTER COLUMN ebean_timestamp SET DATA TYPE bigint USING 0::bigint;
ALTER TABLE attachment ALTER COLUMN ebean_timestamp SET DATA TYPE bigint USING 0::bigint;
ALTER TABLE comment ALTER COLUMN ebean_timestamp SET DATA TYPE bigint USING 0::bigint;
ALTER TABLE evaluation_criteria ALTER COLUMN ebean_timestamp SET DATA TYPE bigint USING 0::bigint;
ALTER TABLE evaluation_phrase ALTER COLUMN ebean_timestamp SET DATA TYPE bigint USING 0::bigint;
ALTER TABLE exam ALTER COLUMN ebean_timestamp SET DATA TYPE bigint USING 0::bigint;
ALTER TABLE exam_section ALTER COLUMN ebean_timestamp SET DATA TYPE bigint USING 0::bigint;
ALTER TABLE grade ALTER COLUMN ebean_timestamp SET DATA TYPE bigint USING 0::bigint;
ALTER TABLE material ALTER COLUMN ebean_timestamp SET DATA TYPE bigint USING 0::bigint;

# --- !Downs

ALTER TABLE answer
ALTER COLUMN ebean_timestamp DROP DEFAULT,
ALTER COLUMN ebean_timestamp TYPE timestamp with time zone,
ALTER COLUMN ebean_timestamp SET DEFAULT now();
ALTER TABLE question
ALTER COLUMN ebean_timestamp DROP DEFAULT,
ALTER COLUMN ebean_timestamp TYPE timestamp with time zone,
ALTER COLUMN ebean_timestamp SET DEFAULT now();
ALTER TABLE attachment
ALTER COLUMN ebean_timestamp DROP DEFAULT,
ALTER COLUMN ebean_timestamp TYPE timestamp with time zone,
ALTER COLUMN ebean_timestamp SET DEFAULT now();
ALTER TABLE comment
ALTER COLUMN ebean_timestamp DROP DEFAULT,
ALTER COLUMN ebean_timestamp TYPE timestamp with time zone,
ALTER COLUMN ebean_timestamp SET DEFAULT now();
ALTER TABLE evaluation_criteria
ALTER COLUMN ebean_timestamp DROP DEFAULT,
ALTER COLUMN ebean_timestamp TYPE timestamp with time zone,
ALTER COLUMN ebean_timestamp SET DEFAULT now();
ALTER TABLE evaluation_phrase
ALTER COLUMN ebean_timestamp DROP DEFAULT,
ALTER COLUMN ebean_timestamp TYPE timestamp with time zone,
ALTER COLUMN ebean_timestamp SET DEFAULT now();
ALTER TABLE exam
ALTER COLUMN ebean_timestamp DROP DEFAULT,
ALTER COLUMN ebean_timestamp TYPE timestamp with time zone,
ALTER COLUMN ebean_timestamp SET DEFAULT now();
ALTER TABLE exam_section
ALTER COLUMN ebean_timestamp DROP DEFAULT,
ALTER COLUMN ebean_timestamp TYPE timestamp with time zone,
ALTER COLUMN ebean_timestamp SET DEFAULT now();
ALTER TABLE grade
ALTER COLUMN ebean_timestamp DROP DEFAULT,
ALTER COLUMN ebean_timestamp TYPE timestamp with time zone,
ALTER COLUMN ebean_timestamp SET DEFAULT now();
ALTER TABLE material
ALTER COLUMN ebean_timestamp DROP DEFAULT,
ALTER COLUMN ebean_timestamp TYPE timestamp with time zone,
ALTER COLUMN ebean_timestamp SET DEFAULT now();