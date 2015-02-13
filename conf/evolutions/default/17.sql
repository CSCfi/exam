# --- !Ups
CREATE TABLE tag (
    id BIGINT NOT NULL,
    name VARCHAR(32) NOT NULL,
    created TIMESTAMP WITHOUT TIME ZONE,
    creator_id BIGINT,
    modified TIMESTAMP WITHOUT TIME ZONE,
    modifier_id BIGINT,
    ebean_timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT pk_tag PRIMARY KEY (id)
);
ALTER TABLE tag ADD CONSTRAINT fk_tag_creator FOREIGN KEY (creator_id) REFERENCES sitnet_users(id);
ALTER TABLE tag ADD CONSTRAINT fk_tag_modifier FOREIGN KEY (modifier_id) REFERENCES sitnet_users(id);
ALTER TABLE tag ADD CONSTRAINT ak_tag_name UNIQUE (name);

CREATE TABLE question_tag (
    question_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    CONSTRAINT pk_question_tag PRIMARY KEY (question_id, tag_id)
);
ALTER TABLE question_tag ADD CONSTRAINT fk_question_tag_question_01 FOREIGN KEY (question_id) REFERENCES question(id);
ALTER TABLE question_tag ADD CONSTRAINT fk_question_tag_tag_02 FOREIGN KEY (tag_id) REFERENCES tag(id);

# --- !Downs
DROP TABLE question_tag;
DROP TABLE tag;
