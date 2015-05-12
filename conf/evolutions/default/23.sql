# --- !Ups
CREATE TABLE grade_scale (
  id INTEGER NOT NULL,
  description VARCHAR(32) NOT NULL,
  CONSTRAINT pk_grade_scale PRIMARY KEY (id)
);

INSERT INTO grade_scale VALUES(1, 'ZERO_TO_FIVE');
INSERT INTO grade_scale VALUES(2, 'LATIN');
INSERT INTO grade_scale VALUES(3, 'APPROVED_REJECTED');

DROP TABLE IF EXISTS grade CASCADE;
CREATE TABLE grade (
  id INTEGER NOT NULL,
  name VARCHAR(32) NOT NULL,
  grade_scale_id INTEGER NOT NULL,
  CONSTRAINT pk_grade PRIMARY KEY(id)
);

INSERT INTO grade values (1, 'APPROVED', 3);
INSERT INTO grade values (2, 'REJECTED', 3);
INSERT INTO grade values (3, '0', 1);
INSERT INTO grade values (4, '1', 1);
INSERT INTO grade values (5, '2', 1);
INSERT INTO grade values (6, '3', 1);
INSERT INTO grade values (7, '4', 1);
INSERT INTO grade values (8, '5', 1);
INSERT INTO grade values (9, 'I', 2);
INSERT INTO grade values (10, 'A', 2);
INSERT INTO grade values (11, 'B', 2);
INSERT INTO grade values (12, 'N', 2);
INSERT INTO grade values (13, 'C', 2);
INSERT INTO grade values (14, 'M', 2);
INSERT INTO grade values (15, 'E', 2);
INSERT INTO grade values (16, 'L', 2);

ALTER TABLE course ADD grade_scale_id INTEGER;
ALTER TABLE course DROP COLUMN grade_scale;
ALTER TABLE course ADD CONSTRAINT fk_course_grade_scale FOREIGN KEY (grade_scale_id) REFERENCES grade_scale(id);

ALTER TABLE exam ADD grade_scale_id INTEGER;
UPDATE exam SET grade_scale_id=1 WHERE (grading IS NULL or grading='0-5');
UPDATE exam SET grade_scale_id=2 WHERE grading='Improbatur-Laudatur';
UPDATE exam SET grade_scale_id=3 WHERE grading='Hyväksytty-Hylätty';
ALTER TABLE exam ADD CONSTRAINT fk_exam_grade_scale FOREIGN KEY (grade_scale_id) REFERENCES grade_scale(id);

ALTER TABLE exam ADD grade_id INTEGER;
UPDATE exam SET grade_id=1 WHERE grade='hyväksytty';
UPDATE exam SET grade_id=2 WHERE grade='Hylätty';
UPDATE exam SET grade_id=3 WHERE grade='0';
UPDATE exam SET grade_id=4 WHERE grade='1';
UPDATE exam SET grade_id=5 WHERE grade='2';
UPDATE exam SET grade_id=6 WHERE grade='3';
UPDATE exam SET grade_id=7 WHERE grade='4';
UPDATE exam SET grade_id=8 WHERE grade='5';
UPDATE exam SET grade_id=9 WHERE grade='Improbatur';
UPDATE exam SET grade_id=10 WHERE grade='Approbatur';
UPDATE exam SET grade_id=11 WHERE grade='Lubenter approbatur';
UPDATE exam SET grade_id=12 WHERE grade='Non sine laude approbatur';
UPDATE exam SET grade_id=13 WHERE grade='Cum laude approbatur';
UPDATE exam SET grade_id=14 WHERE grade='Magna cum laude approbatur';
UPDATE exam SET grade_id=15 WHERE grade='Eximia cum laude approbatur';
UPDATE exam SET grade_id=16 WHERE grade='Laudatur';

ALTER TABLE exam DROP COLUMN grading;
ALTER TABLE exam ADD CONSTRAINT fk_exam_grade FOREIGN KEY (grade_id) REFERENCES grade(id);

# --- !Downs
--- no going back :(