# --- !Ups
ALTER TABLE question ALTER shared SET DEFAULT FALSE;

CREATE TABLE question_owner (
  question_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  CONSTRAINT pk_question_owner PRIMARY KEY(question_id, user_id)
);
ALTER TABLE question_owner ADD CONSTRAINT fk_question_owner_question FOREIGN KEY(question_id) REFERENCES question(id);
ALTER TABLE question_owner ADD CONSTRAINT fk_question_owner_user FOREIGN KEY (user_id) REFERENCES app_user(id);

CREATE INDEX IX_QUESTION_OWNER_QUESTION ON question_owner (question_id);
CREATE INDEX IX_QUESTION_OWNER_USER ON question_owner (user_id);

INSERT INTO question_owner (question_id, user_id) (SELECT id, creator_id FROM question);

# --- !Downs

DROP TABLE question_owner CASCADE;
ALTER TABLE question ALTER shared DROP DEFAULT;
