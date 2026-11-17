package io.github.pop_dragos.backend.catalog;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import tools.jackson.databind.exc.UnrecognizedPropertyException;

/** Test unitar (fara Spring, fara baza de date): validarea fisierelor YAML. */
class CatalogFileValidationTest {

    private static final String HEADER = """
            program: { code: TEST, name: Test, language: ro }
            curriculum: { academic_year: "2026-2027" }
            courses:
            """;

    @Test
    void acceptsValidCourse() {
        var catalog = CatalogFile.parse(HEADER + """
                  - plan_code: "4.00"
                    name: Proiectare logica
                    year_of_study: 1
                    semester: 1
                    credits: 5
                    evaluation_form: E
                    category: DF
                    rules_status: CLEAR
                    components:
                      - { code: exam, kind: EXAM, label: Examen, weight: 70 }
                      - { code: lab, kind: LAB, label: Laborator, weight: 30 }
                    conditions:
                      - { type: ADMISSION, component: lab, min_grade: 5 }
                """);

        assertThatCode(catalog::validate).doesNotThrowAnyException();
    }

    @Test
    void rejectsWeightsThatDoNotSumTo100() {
        var catalog = CatalogFile.parse(HEADER + """
                  - plan_code: "4.00"
                    name: Proiectare logica
                    year_of_study: 1
                    semester: 1
                    credits: 5
                    evaluation_form: E
                    category: DF
                    components:
                      - { code: exam, kind: EXAM, label: Examen, weight: 70 }
                      - { code: lab, kind: LAB, label: Laborator, weight: 20 }
                """);

        assertThatThrownBy(catalog::validate).hasMessageContaining("ponderile insumeaza 90");
    }

    @Test
    void rejectsConditionOnUnknownComponent() {
        var catalog = CatalogFile.parse(HEADER + """
                  - plan_code: "4.00"
                    name: Proiectare logica
                    year_of_study: 1
                    semester: 1
                    credits: 5
                    evaluation_form: E
                    category: DF
                    components:
                      - { code: exam, kind: EXAM, label: Examen, weight: 100 }
                    conditions:
                      - { type: ADMISSION, component: laborator, min_grade: 5 }
                """);

        assertThatThrownBy(catalog::validate).hasMessageContaining("componenta inexistenta 'laborator'");
    }

    @Test
    void rejectsMalformedPlanCode() {
        var catalog = CatalogFile.parse(HEADER + """
                  - plan_code: "4"
                    name: Proiectare logica
                    year_of_study: 1
                    semester: 1
                    credits: 5
                    evaluation_form: E
                    category: DF
                """);

        assertThatThrownBy(catalog::validate).hasMessageContaining("plan_code");
    }

    @Test
    void rejectsMisspelledKey() {
        assertThatThrownBy(() -> CatalogFile.parse(HEADER + """
                  - plan_code: "4.00"
                    name: Proiectare logica
                    year_of_study: 1
                    semester: 1
                    credit: 5
                    evaluation_form: E
                    category: DF
                """)).isInstanceOf(UnrecognizedPropertyException.class);
    }
}
