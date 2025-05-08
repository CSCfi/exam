-- SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
--
-- SPDX-License-Identifier: EUPL-1.2

SET count.max to :v1;
DO $$
DECLARE
  countmax integer := current_setting('count.max');
BEGIN
    FOR counter IN 1..countmax LOOP
    RAISE NOTICE 'Counter: %', counter;
    insert into exam_machine
     (id,
      name,
      other_identifier,
      ip_address,
      room_id,
      object_version,
      archived,
      out_of_service
     )
     VALUES
     ((select nextval('exam_machine_seq')),
      concat('Testikone',counter),
      'Testikone',
      concat('1.1.1.',counter),
      1,
      1,
      false,
      false);
    END LOOP;
END; $$
