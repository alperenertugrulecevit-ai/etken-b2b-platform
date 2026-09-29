-- Repair Wave number sequence if the original wave migration is recorded
-- as applied but the PostgreSQL sequence is missing.
CREATE SEQUENCE IF NOT EXISTS "WaveNumberSeq"
START WITH 1
INCREMENT BY 1
MINVALUE 1
NO MAXVALUE
CACHE 1;

-- Keep the sequence ahead of every existing WAVE###### number.
-- setval(..., false) makes the next nextval() return exactly the value supplied.
SELECT setval(
  '"WaveNumberSeq"',
  GREATEST(
    COALESCE(
      (
        SELECT MAX(
          CASE
            WHEN "waveNo" ~ '^WAVE[0-9]+$'
            THEN SUBSTRING("waveNo" FROM 5)::BIGINT
            ELSE NULL
          END
        )
        FROM "Wave"
      ),
      0
    ) + 1,
    1
  ),
  false
);
