# --- !Ups
ALTER TABLE exam ADD foo INTEGER;
UPDATE exam SET foo = 1 WHERE state = 'DRAFT';
UPDATE exam SET foo = 2 WHERE state = 'SAVED';
UPDATE exam SET foo = 3 WHERE state = 'PUBLISHED';
UPDATE exam SET foo = 4 WHERE state = 'STUDENT_STARTED';
UPDATE exam SET foo = 5 WHERE state = 'REVIEW';
UPDATE exam SET foo = 6 WHERE state = 'REVIEW_STARTED';
UPDATE exam SET foo = 7 WHERE state = 'GRADED';
UPDATE exam SET foo = 8 WHERE state = 'GRADED_LOGGED';
UPDATE exam SET foo = 9 WHERE state = 'ARCHIVED';
UPDATE exam SET foo = 10 WHERE state = 'ABORTED';
UPDATE exam SET foo = 11 WHERE state = 'DELETED';

ALTER TABLE exam ALTER foo SET NOT NULL;
ALTER TABLE exam DROP state;
ALTER TABLE exam RENAME COLUMN foo TO state;

UPDATE multiple_choice_option set score = NULL;

# --- !Downs
ALTER TABLE exam ADD foo VARCHAR(255);
UPDATE exam SET foo = 'DRAFT' WHERE state = 1;
UPDATE exam SET foo = 'SAVED' WHERE state = 2;
UPDATE exam SET foo = 'PUBLISHED' WHERE state = 3;
UPDATE exam SET foo = 'STUDENT_STARTED' WHERE state = 4;
UPDATE exam SET foo = 'REVIEW' WHERE state = 5;
UPDATE exam SET foo = 'REVIEW_STARTED' WHERE state = 6;
UPDATE exam SET foo = 'GRADED' WHERE state = 7;
UPDATE exam SET foo = 'GRADED_LOGGED' WHERE state = 8;
UPDATE exam SET foo = 'ARCHIVED' WHERE state = 9;
UPDATE exam SET foo = 'ABORTED' WHERE state = 10;
UPDATE exam SET foo = 'DELETED' WHERE state = 11;
ALTER TABLE exam ALTER foo SET NOT NULL;
ALTER TABLE exam DROP state;
ALTER TABLE exam RENAME COLUMN foo TO state;