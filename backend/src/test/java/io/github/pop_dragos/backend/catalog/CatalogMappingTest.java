package io.github.pop_dragos.backend.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;

/**
 * Verifica maparea JPA: salveaza o materie cu componente si conditii, apoi o citeste inapoi din baza de date.
 * @Transactional pe un test = la final se face ROLLBACK, deci baza de date ramane neschimbata.
 */
@SpringBootTest
@Transactional
class CatalogMappingTest {

    @Autowired
    EntityManager em;

    @Test
    void savesAndLoadsCourseWithComponentsAndConditions() {
        var program = new StudyProgram("TEST-PROG", "Program de test", "ro");
        em.persist(program);
        var curriculum = new Curriculum(program, "2026-2027", null);
        em.persist(curriculum);

        var course = new Course(curriculum, "4.00", "Proiectare logica", 1, 1, 5,
                Course.EvaluationForm.E, Course.GradingType.NUMERIC,
                Course.Category.DF, Course.Regime.DOB, Course.RulesStatus.CLEAR);
        var exam = course.addComponent("exam", GradeComponent.Kind.EXAM, "Examen final", new BigDecimal("70"), null);
        var lab = course.addComponent("lab", GradeComponent.Kind.LAB, "Laborator", new BigDecimal("30"), null);
        course.addCondition(GradingCondition.Type.ADMISSION, lab, new BigDecimal("5"), "Laborator >= 5");
        course.addCondition(GradingCondition.Type.PROMOTION, exam, new BigDecimal("5"), "Examen final >= 5");
        em.persist(course); // cascade: salveaza si componentele, si conditiile

        em.flush(); // trimite acum INSERT-urile in baza de date
        em.clear(); // goleste memoria Hibernate, ca find() de mai jos sa citeasca chiar din baza de date

        var loaded = em.find(Course.class, course.getId());

        assertThat(loaded.getComponents())
                .extracting(GradeComponent::getCode)
                .containsExactly("exam", "lab");
        assertThat(loaded.getComponents().get(0).getWeight()).isEqualByComparingTo("70");
        assertThat(loaded.getConditions()).hasSize(2);
        assertThat(loaded.getConditions().get(0).getType()).isEqualTo(GradingCondition.Type.ADMISSION);
        assertThat(loaded.getConditions().get(0).getComponent().getCode()).isEqualTo("lab");
    }
}
