# --- !Ups
ALTER TABLE answer DROP COLUMN ebean_timestamp;
ALTER TABLE question DROP COLUMN ebean_timestamp;
ALTER TABLE attachment DROP COLUMN ebean_timestamp;
ALTER TABLE comment DROP COLUMN ebean_timestamp;
ALTER TABLE evaluation_criteria DROP COLUMN ebean_timestamp;
ALTER TABLE evaluation_phrase DROP COLUMN ebean_timestamp;
ALTER TABLE exam DROP COLUMN ebean_timestamp;
ALTER TABLE exam_section DROP COLUMN ebean_timestamp;
ALTER TABLE grade DROP COLUMN ebean_timestamp;

ALTER TABLE answer ADD COLUMN ebean_timestamp bigint;
ALTER TABLE question ADD COLUMN ebean_timestamp bigint;
ALTER TABLE attachment ADD COLUMN ebean_timestamp bigint;
ALTER TABLE comment ADD COLUMN ebean_timestamp bigint;
ALTER TABLE evaluation_criteria ADD COLUMN ebean_timestamp bigint;
ALTER TABLE evaluation_phrase ADD COLUMN ebean_timestamp bigint;
ALTER TABLE exam ADD COLUMN ebean_timestamp bigint;
ALTER TABLE exam_section ADD COLUMN ebean_timestamp bigint;
ALTER TABLE grade ADD COLUMN ebean_timestamp bigint;

# --- !Downs
# these may be incorrect
ALTER TABLE answer
ALTER COLUMN ebean_timestamp DROP DEFAULT,
ALTER COLUMN ebean_timestamp TYPE timestamp with time zone,
   USING
        timestamp with time zone 'epoch' + foo_timestamp * interval '1 second',
    ALTER COLUMN ebean_timestamp SET DEFAULT now();
ALTER TABLE question
ALTER COLUMN ebean_timestamp DROP DEFAUL,
ALTER COLUMN ebean_timestamp TYPE timestamp with time zone,
   USING
        timestamp with time zone 'epoch' + foo_timestamp * interval '1 second',
    ALTER COLUMN ebean_timestamp SET DEFAULT now();
ALTER TABLE attachment
ALTER COLUMN ebean_timestamp DROP DEFAULT,
ALTER COLUMN ebean_timestamp TYPE timestamp with time zone,
   USING
        timestamp with time zone 'epoch' + foo_timestamp * interval '1 second',
    ALTER COLUMN ebean_timestamp SET DEFAULT now();
ALTER TABLE comment
ALTER COLUMN ebean_timestamp DROP DEFAULT,
ALTER COLUMN ebean_timestamp TYPE timestamp with time zone,
   USING
        timestamp with time zone 'epoch' + foo_timestamp * interval '1 second',
    ALTER COLUMN ebean_timestamp SET DEFAULT now();
ALTER TABLE evaluation_criteria
ALTER COLUMN ebean_timestamp DROP DEFAULT,
ALTER COLUMN ebean_timestamp TYPE timestamp with time zone,
   USING
        timestamp with time zone 'epoch' + foo_timestamp * interval '1 second',
    ALTER COLUMN ebean_timestamp SET DEFAULT now();
ALTER TABLE evaluation_phrase
ALTER COLUMN ebean_timestamp DROP DEFAULT,
ALTER COLUMN ebean_timestamp TYPE timestamp with time zone,
   USING
        timestamp with time zone 'epoch' + foo_timestamp * interval '1 second',
    ALTER COLUMN ebean_timestamp SET DEFAULT now();
ALTER TABLE exam
ALTER COLUMN ebean_timestamp DROP DEFAULT,
ALTER COLUMN ebean_timestamp TYPE timestamp with time zone,
   USING
        timestamp with time zone 'epoch' + foo_timestamp * interval '1 second',
    ALTER COLUMN ebean_timestamp SET DEFAULT now();
ALTER TABLE exam_section
ALTER COLUMN ebean_timestamp DROP DEFAULT,
ALTER COLUMN ebean_timestamp TYPE timestamp with time zone,
   USING
        timestamp with time zone 'epoch' + foo_timestamp * interval '1 second',
    ALTER COLUMN ebean_timestamp SET DEFAULT now();
ALTER TABLE grade
ALTER COLUMN ebean_timestamp DROP DEFAULT,
ALTER COLUMN ebean_timestamp TYPE timestamp with time zone,
   USING
        timestamp with time zone 'epoch' + foo_timestamp * interval '1 second',
    ALTER COLUMN ebean_timestamp SET DEFAULT now();
