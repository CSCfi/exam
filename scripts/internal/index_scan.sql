CREATE FUNCTION pg_temp.sortarray(int2[]) returns int2[] as '
  SELECT ARRAY(
      SELECT $1[i]
        FROM generate_series(array_lower($1, 1), array_upper($1, 1)) i
    ORDER BY 1
  )
' language sql;

  SELECT conrelid::regclass
         ,conname
         ,reltuples::bigint
    FROM pg_constraint
         JOIN pg_class ON (conrelid = pg_class.oid)
   WHERE contype = 'f'
         AND NOT EXISTS (
           SELECT 1
             FROM pg_index
            WHERE indrelid = conrelid
                  AND pg_temp.sortarray(conkey) = pg_temp.sortarray(indkey)
         )
ORDER BY reltuples DESC
;
