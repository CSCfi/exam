# --- !Ups
ALTER TABLE question RENAME COLUMN max_characters TO expected_word_count;
UPDATE question SET expected_word_count = expected_word_count / 8;

# --- !Downs
UPDATE question SET expected_word_count = expected_word_count * 8;
ALTER TABLE question RENAME COLUMN expected_word_count TO max_characters;
