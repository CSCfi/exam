# --- !Ups
CREATE TABLE permission (
  id BIGINT NOT NULL,
  value VARCHAR(32),
  object_version BIGINT NOT NULL,
  CONSTRAINT pk_permission PRIMARY KEY (id)
);

CREATE TABLE app_user_permission (
  app_user_id BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  CONSTRAINT pk_app_user_permission PRIMARY KEY (app_user_id, permission_id)
);
ALTER TABLE app_user_permission ADD CONSTRAINT fk_app_user_permission_app_user FOREIGN KEY (app_user_id) REFERENCES app_user(id);
ALTER TABLE app_user_permission ADD CONSTRAINT fk_app_user_permission_permission FOREIGN KEY (permission_id) REFERENCES permission(id);

# --- !Downs
DROP TABLE app_user_permission CASCADE;
DROP TABLE permission CASCADE;