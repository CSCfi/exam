# --- !Ups
UPDATE exam_feedback_config SET release_type = 1;
UPDATE exam_feedback_config SET release_date = NULL;
DELETE FROM exam_feedback_config WHERE exam_id IN (SELECT id FROM exam WHERE parent_id IS NOT NULL);

# --- !Downs
--- no can do
