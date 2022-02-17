# --- !Ups
CREATE TABLE maintenance_period(
    id BIGINT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    description TEXT,
    object_version BIGINT NOT NULL,
    CONSTRAINT PK_MAINTENANCE_PERIOD PRIMARY KEY (id)
);
CREATE SEQUENCE maintenance_period_seq;

# --- !Downs
DROP SEQUENCE maintenance_period_seq;
DROP TABLE maintenance_period;

