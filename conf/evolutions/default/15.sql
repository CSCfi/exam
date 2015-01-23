# --- !Ups
alter table exam_score add column additional_info TEXT;
# --- !Downs
alter table exam_score drop column additional_info TEXT;
