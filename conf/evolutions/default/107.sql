# --- !Ups
ALTER TABLE external_reservation ADD COLUMN org_name VARCHAR(64);
ALTER TABLE external_reservation ADD COLUMN org_code VARCHAR(12);


# --- !Downs
ALTER TABLE external_reservation DROP COLUMN org_name;
ALTER TABLE external_reservation DROP COLUMN org_code;

