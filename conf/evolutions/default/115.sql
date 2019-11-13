# --- !Ups
ALTER TABLE multiple_choice_option ADD claim_choice_type INTEGER;


# --- !Downs
ALTER TABLE multiple_choice_option DROP COLUMN claim_choice_type;