-- Planurile din anii 2-3 folosesc categoria DID (disciplina in domeniu).
-- Coloana devine VARCHAR(3) si constrangerea accepta noua valoare.

ALTER TABLE course DROP CONSTRAINT course_category_check;
ALTER TABLE course ALTER COLUMN category TYPE VARCHAR(3);
ALTER TABLE course ADD CONSTRAINT course_category_check
    CHECK (category IN ('DF', 'DD', 'DID', 'DS', 'DC'));
