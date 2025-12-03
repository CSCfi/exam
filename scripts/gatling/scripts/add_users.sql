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
    with new_user as (insert into app_user
        (id,
         first_name,
         last_name,
         eppn,
         email,
         language_id,
         object_version,
         password
            )
        VALUES
        ((select nextval('app_user_seq')),
         concat('Etunimi',counter),
         concat('Sukunimi',counter),
         concat('testi',counter,'@funet.fi'),
         concat('testi.kayttaja',counter,'@funet.fi'),
         'fi',
         1,
         md5('test'))
        RETURNING id)
    insert into app_user_role
    (app_user_id, role_id) VALUES ((select id from new_user), 2);
    END LOOP;
END; $$
