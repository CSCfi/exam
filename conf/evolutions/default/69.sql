# --- !Ups
ALTER TABLE exam_record ADD CONSTRAINT ak_exam_record_exam UNIQUE (exam_id);
ALTER TABLE exam_record ADD CONSTRAINT ak_exam_record_exam_score UNIQUE (exam_score_id);

# --- !Downs
ALTER TABLE exam_record DROP CONSTRAINT ak_exam_record_exam;
ALTER TABLE exam_record DROP CONSTRAINT ak_exam_record_exam_score;

