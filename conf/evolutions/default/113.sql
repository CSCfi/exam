-- !Ups
ALTER TABLE comment ADD feedback_status BOOLEAN DEFAULT 'false';

-- !Downs
ALTER TABLE comment DROP feedback_status;
