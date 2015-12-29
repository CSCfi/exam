# --- !Ups
INSERT INTO role (id, name, object_version) SELECT 1, 'ADMIN', 1 WHERE NOT EXISTS (
    SELECT id FROM role WHERE id = 1
);
INSERT INTO role (id, name, object_version) SELECT 2, 'STUDENT', 1 WHERE NOT EXISTS (
    SELECT id FROM role WHERE id = 2
);
INSERT INTO role (id, name, object_version) SELECT 3, 'TEACHER', 1 WHERE NOT EXISTS (
    SELECT id FROM role WHERE id = 3
);

INSERT INTO exam_type (id, type, deprecated, object_version) SELECT 1, 'PARTIAL', false, 1 WHERE NOT EXISTS (
    SELECT id FROM exam_type WHERE id = 1
);
INSERT INTO exam_type (id, type, deprecated, object_version) SELECT 2, 'FINAL', false, 1 WHERE NOT EXISTS (
    SELECT id FROM exam_type WHERE id = 2
);

# --- !Downs
-- N/A

