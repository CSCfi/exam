# --- !Ups
CREATE TABLE exam_owner (
  exam_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  CONSTRAINT pk_exam_owner PRIMARY KEY(exam_id, user_id)
);

ALTER TABLE exam_owner ADD CONSTRAINT fk_exam_owner_exam FOREIGN KEY(exam_id) REFERENCES exam(id);
ALTER TABLE exam_owner ADD CONSTRAINT fk_exam_owner_sitnet_users FOREIGN KEY (user_id) REFERENCES sitnet_users(id);

# --- !Downs
DROP TABLE exam_owner;