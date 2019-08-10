-- !Ups
ALTER TABLE comment ADD feedback_status VARCHAR(255) DEFAULT 'false';

-- !Downs
ALTER TABLE comment DROP feedback_status;
