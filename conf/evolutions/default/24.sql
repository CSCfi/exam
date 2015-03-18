# --- !Ups
CREATE TABLE exam_owners (
  exam_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  CONSTRAINT pk_exam_owners PRIMARY KEY(exam_id, user_id)
);

ALTER TABLE exam ADD CONSTRAINT fk_exam_exam_owners_01 FOREIGN KEY(exam_id) REFERENCES exam_owners(exam_id);
ALTER TABLE sitnet_users ADD CONSTRAINT fk_sitnet_users_exam_owners_01 FOREIGN KEY (user_id) REFERENCES exam_owners(user_id);


# --- !Downs
ALTER TABLE exam DROP CONSTRAINT fk_exam_exam_owners_01;
ALTER TABLE sitnet_users DROP CONSTRAINT fk_sitnet_users_exam_owners_01;

DROP TABLE exam_owners;