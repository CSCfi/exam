# --- !Ups
CREATE UNIQUE INDEX ak_exam_participation_exam_id ON exam_participation(exam_id);

# --- !Downs
DROP INDEX ak_exam_participation_exam_id;
