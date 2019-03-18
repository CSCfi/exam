-- !Ups
ALTER TABLE external_reservation ADD mail_address_id BIGINT;
ALTER TABLE external_reservation ADD CONSTRAINT FK_EXTERNAL_RESERVATION_MAIL_ADDRESS FOREIGN KEY (mail_address_id) REFERENCES mail_address(id);
CREATE INDEX ix_external_reservation_mail_address ON external_reservation (mail_address_id);

ALTER TABLE external_reservation ADD building_name VARCHAR(255);
ALTER TABLE external_reservation ADD campus VARCHAR(255);

-- !Downs
DROP INDEX ix_external_reservation_mail_address;
ALTER TABLE external_reservation DROP mail_address_id CASCADE;

ALTER TABLE external_reservation DROP building_name;
ALTER TABLE external_reservation DROP campus;
