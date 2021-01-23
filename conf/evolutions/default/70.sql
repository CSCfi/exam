# --- !Ups
ALTER TABLE exam_section DROP total_score;

# --- !Downs
ALTER TABLE exam_section ADD total_score BIGINT;
