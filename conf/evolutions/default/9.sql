# --- !Ups

ALTER TABLE answer ADD attachment_id bigint;
ALTER TABLE answer ADD CONSTRAINT fk_answer_attachment FOREIGN KEY (attachment_id) REFERENCES attachment (id) on delete restrict on update restrict;
CREATE index fk_answer_attachment ON answer (attachment_id);

# --- !Downs

ALTER TABLE answer DROP attachment_id;