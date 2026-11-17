package io.github.pop_dragos.backend.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;

/** Importul fisierului YAML real, in baza de date. Catalogul e importat deja la pornirea aplicatiei. */
@SpringBootTest
@Transactional
class CatalogImporterTest {

    private static final int YEAR_1_COURSES = 24;

    @Autowired
    EntityManager em;

    @Autowired
    CatalogImporter importer;

    @Test
    void importsYear1Catalog() {
        assertThat(countCourses()).isEqualTo(YEAR_1_COURSES);

        Course logicDesign = findCourse("4.00");
        assertThat(logicDesign.getName()).isEqualTo("Proiectare logică");
        assertThat(logicDesign.getRulesStatus()).isEqualTo(Course.RulesStatus.CLEAR);
        assertThat(logicDesign.getComponents()).extracting(GradeComponent::getCode).containsExactly("exam", "lab");
        assertThat(logicDesign.getConditions()).hasSize(2);

        Course sport = findCourse("14.00");
        assertThat(sport.getGradingType()).isEqualTo(Course.GradingType.PASS_FAIL);
        assertThat(sport.getComponents()).isEmpty();
    }

    @Test
    void reimportDoesNotDuplicate() throws Exception {
        importer.importAll();
        em.flush();
        em.clear();

        assertThat(countCourses()).isEqualTo(YEAR_1_COURSES);
    }

    private long countCourses() {
        return em.createQuery("""
                        select count(c) from Course c
                        where c.curriculum.program.code = 'CALC-RO' and c.curriculum.academicYear = '2026-2027'
                        """, Long.class)
                .getSingleResult();
    }

    private Course findCourse(String planCode) {
        return em.createQuery("""
                        select c from Course c
                        where c.curriculum.program.code = 'CALC-RO' and c.planCode = :code
                        """, Course.class)
                .setParameter("code", planCode)
                .getSingleResult();
    }
}
