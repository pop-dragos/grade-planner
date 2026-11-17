-- Catalogul public: specializari, planuri de invatamant, materii si regulile lor de notare.
-- Notele studentilor NU ajung niciodata aici (raman in browser).

CREATE TABLE study_program (
    id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code     VARCHAR(32)  NOT NULL UNIQUE,          -- ex. 'CALC-RO'
    name     VARCHAR(200) NOT NULL,                 -- ex. 'Calculatoare'
    language VARCHAR(8)   NOT NULL                  -- ex. 'ro'
);

-- Un plan de invatamant = o specializare intr-un an universitar.
CREATE TABLE curriculum (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    program_id    BIGINT     NOT NULL REFERENCES study_program (id),
    academic_year VARCHAR(9) NOT NULL CHECK (academic_year ~ '^[0-9]{4}-[0-9]{4}$'),
    source_url    TEXT,
    UNIQUE (program_id, academic_year)
);

CREATE TABLE course (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    curriculum_id      BIGINT       NOT NULL REFERENCES curriculum (id) ON DELETE CASCADE,
    plan_code          VARCHAR(16)  NOT NULL,       -- codul din plan, ex. '4.00'
    name               VARCHAR(300) NOT NULL,
    year_of_study      SMALLINT     NOT NULL CHECK (year_of_study BETWEEN 1 AND 4),
    semester           SMALLINT     NOT NULL CHECK (semester IN (1, 2)),
    credits            SMALLINT     NOT NULL CHECK (credits BETWEEN 0 AND 30),
    evaluation_form    VARCHAR(1)   NOT NULL CHECK (evaluation_form IN ('E', 'C', 'V')),
    grading_type       VARCHAR(16)  NOT NULL CHECK (grading_type IN ('NUMERIC', 'PASS_FAIL')),
    category           VARCHAR(2)   NOT NULL CHECK (category IN ('DF', 'DD', 'DS', 'DC')),
    regime             VARCHAR(3)   NOT NULL CHECK (regime IN ('DOB', 'DOP', 'DFA')),
    option_group       VARCHAR(16),                 -- ex. '7' pentru 7.10 / 7.20 / 7.30
    rules_status       VARCHAR(16)  NOT NULL CHECK (rules_status IN ('CLEAR', 'AMBIGUOUS', 'NONE')),
    syllabus_url       TEXT,
    syllabus_year      VARCHAR(9),
    syllabus_date      DATE,
    extra_requirements TEXT,                        -- conditii care nu sunt note (ex. absente)
    UNIQUE (curriculum_id, plan_code)
);

CREATE TABLE grade_component (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_id   BIGINT       NOT NULL REFERENCES course (id) ON DELETE CASCADE,
    code        VARCHAR(32)  NOT NULL,              -- ex. 'lab', 'exam'
    kind        VARCHAR(16)  NOT NULL CHECK (kind IN ('EXAM', 'LAB', 'SEMINAR', 'PROJECT',
                                                     'PARTIAL', 'COLLOQUIUM', 'CONTINUOUS', 'OTHER')),
    label       VARCHAR(200) NOT NULL,
    weight      NUMERIC(5, 2) NOT NULL CHECK (weight > 0 AND weight <= 100),
    position    SMALLINT     NOT NULL,              -- ordinea de afisare
    source_text TEXT,                               -- citatul exact din fisa
    UNIQUE (course_id, code),
    UNIQUE (id, course_id)                          -- tinta pentru cheia compusa de mai jos
);

CREATE TABLE grading_condition (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_id      BIGINT       NOT NULL REFERENCES course (id) ON DELETE CASCADE,
    condition_type VARCHAR(16)  NOT NULL CHECK (condition_type IN ('ADMISSION', 'PROMOTION')),
    component_id   BIGINT,                          -- NULL = conditia se aplica notei finale
    min_grade      NUMERIC(4, 2) NOT NULL CHECK (min_grade BETWEEN 1 AND 10),
    source_text    TEXT,
    note           TEXT,
    -- Componenta trebuie sa apartina ACELEIASI materii ca si conditia.
    FOREIGN KEY (component_id, course_id) REFERENCES grade_component (id, course_id) ON DELETE CASCADE
);
