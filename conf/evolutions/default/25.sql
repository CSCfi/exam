# --- !Ups
ALTER TABLE exam ADD credit_type_id INTEGER;
UPDATE exam SET credit_type_id=1 where credit_type ilike 'PARTIAL';
UPDATE exam SET credit_type_id=2 where credit_type ilike 'FINAL';
ALTER TABLE exam DROP credit_type;
ALTER TABLE exam ADD CONSTRAINT fk_exam_credit_type FOREIGN KEY(exam_type_id) REFERENCES exam_type(id);

# --- !Downs
ALTER TABLE exam DROP CONSTRAINT fk_exam_credit_type;
ALTER TABLE exam ADD credit_type VARCHAR (32);
UPDATE exam SET credit_type='Partial' where credit_type_id = 1;
UPDATE exam SET credit_type='Final' where credit_type_id = 2;
ALTER TABLE exam DROP credit_type_id;