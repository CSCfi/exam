# --- !Ups
ALTER TABLE course ADD end_date TIMESTAMPTZ;
ALTER TABLE course ALTER start_date TYPE TIMESTAMPTZ USING timestamptz(start_date);

# --- !Downs
ALTER TABLE course ALTER start_date TYPE VARCHAR(255) USING to_char(start_date, 'YYYYMMDD');
ALTER TABLE course DROP end_date;
