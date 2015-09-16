# --- !Ups
ALTER TABLE multiple_choice_option ALTER option TYPE TEXT;

# --- !Downs
ALTER TABLE multiple_choice_option ALTER option TYPE VARCHAR(255);
