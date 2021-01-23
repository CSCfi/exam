# --- !Ups
DROP TABLE organisation_organisation CASCADE;
ALTER TABLE organisation DROP course_unit_info_url;
ALTER TABLE organisation DROP records_whitelist_ip;
ALTER TABLE organisation DROP vat_id_number;
ALTER TABLE organisation ALTER name_abbreviation TYPE varchar(32);
ALTER TABLE organisation ALTER code TYPE varchar(32);
ALTER TABLE organisation ADD parent_id BIGINT;
ALTER TABLE organisation ADD CONSTRAINT FK_ORGANISATION_PARENT FOREIGN KEY (parent_id) REFERENCES organisation(id);
ALTER TABLE organisation ALTER name SET NOT NULL;

# --- !Downs
ALTER TABLE organisation ADD course_unit_info_url VARCHAR(255);
ALTER TABLE organisation ADD records_whitelist_ip VARCHAR(255);
ALTER TABLE organisation ADD vat_id_number VARCHAR(255);
ALTER TABLE organisation ALTER name_abbreviation TYPE VARCHAR(255);
ALTER TABLE organisation ALTER code TYPE VARCHAR(255);
ALTER TABLE organisation DROP parent_id CASCADE;
ALTER TABLE organisation ALTER name DROP NOT NULL;

CREATE TABLE organisation_organisation (
  parent_id BIGINT NOT NULL,
  child_id BIGINT NOT NULL,
  CONSTRAINT PK_ORG_ORG PRIMARY KEY (parent_id, child_id),
  CONSTRAINT FK_ORG_ORG_C FOREIGN KEY (child_id) REFERENCES organisation(id),
  CONSTRAINT FK_ORG_ORG_P FOREIGN KEY (parent_id) REFERENCES organisation(id)
);
