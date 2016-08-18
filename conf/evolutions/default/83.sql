# --- !Ups
CREATE TABLE external_reservation (
  id BIGINT NOT NULL,
  org_ref VARCHAR(32) NOT NULL,
  room_ref VARCHAR(32) NOT NULL,
  machine_name VARCHAR(255) NOT NULL,
  room_name VARCHAR(255) NOT NULL,
  room_code  VARCHAR(255),
  room_tz VARCHAR(32),
  object_version BIGINT NOT NULL,
  CONSTRAINT PK_EXTERNAL_RESERVATION PRIMARY KEY (id)
);

CREATE SEQUENCE external_reservation_seq;

ALTER TABLE reservation ADD external_ref VARCHAR(32);
ALTER TABLE reservation ADD external_user_ref VARCHAR(255);
ALTER TABLE reservation ADD external_reservation_id BIGINT;

ALTER TABLE reservation ADD CONSTRAINT FK_EXTERNAL_RES_INFO FOREIGN KEY (external_reservation_id) REFERENCES external_reservation(id);

# --- !Downs
ALTER TABLE reservation DROP external_ref;
ALTER TABLE reservation DROP external_user_ref;
ALTER TABLE reservation DROP external_reservation_id;

DROP TABLE external_reservation CASCADE;
DROP SEQUENCE external_reservation_seq;
