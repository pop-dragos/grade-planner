package io.github.pop_dragos.backend.catalog;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;

/**
 * La pornirea aplicatiei, incarca toate fisierele classpath:catalog/*.yaml in baza de date.
 * YAML-ul e sursa adevarului: catalogul fiecarui an universitar e sters si reincarcat complet.
 */
@Component
public class CatalogImporter implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(CatalogImporter.class);
    private static final String LOCATION = "classpath:catalog/*.yaml";

    private final EntityManager em;
    private final ResourcePatternResolver resources;

    CatalogImporter(EntityManager em, ResourcePatternResolver resources) {
        this.em = em;
        this.resources = resources;
    }

    /** Apelat automat de Spring Boot dupa ce aplicatia a pornit (si dupa migrarile Flyway). */
    @Override
    @Transactional
    public void run(ApplicationArguments args) throws IOException {
        importAll();
    }

    /** Totul intr-o singura tranzactie: daca un fisier e invalid, nu se schimba nimic in baza de date. */
    @Transactional
    public void importAll() throws IOException {
        for (Resource file : resources.getResources(LOCATION)) {
            CatalogFile catalog;
            try (InputStream in = file.getInputStream()) {
                catalog = CatalogFile.parse(in);
            }
            try {
                catalog.validate();
            } catch (IllegalArgumentException e) {
                throw new IllegalStateException("Fisierul " + file.getFilename() + " e invalid. " + e.getMessage(), e);
            }
            importCatalog(catalog);
            log.info("Catalog importat din {}: {} {}, {} materii", file.getFilename(),
                    catalog.program().code(), catalog.curriculum().academicYear(), catalog.courses().size());
        }
    }

    private void importCatalog(CatalogFile catalog) {
        StudyProgram program = findOrCreateProgram(catalog.program());
        String academicYear = catalog.curriculum().academicYear();

        // Sterge planul vechi; ON DELETE CASCADE din schema sterge si materiile, componentele, conditiile.
        em.createQuery("delete from Curriculum c where c.program = :program and c.academicYear = :year")
                .setParameter("program", program)
                .setParameter("year", academicYear)
                .executeUpdate();

        var curriculum = new Curriculum(program, academicYear, catalog.curriculum().sourceUrl());
        em.persist(curriculum);

        for (CatalogFile.CourseDef def : catalog.courses()) {
            em.persist(toEntity(def, curriculum));
        }
    }

    private StudyProgram findOrCreateProgram(CatalogFile.ProgramDef def) {
        return em.createQuery("select p from StudyProgram p where p.code = :code", StudyProgram.class)
                .setParameter("code", def.code())
                .getResultStream()
                .findFirst()
                .orElseGet(() -> {
                    var program = new StudyProgram(def.code(), def.name(), def.language());
                    em.persist(program);
                    return program;
                });
    }

    private static Course toEntity(CatalogFile.CourseDef def, Curriculum curriculum) {
        var course = new Course(curriculum, def.planCode(), def.name(),
                def.yearOfStudy(), def.semester(), def.credits(),
                def.evaluationForm(), def.gradingType(), def.category(), def.regime(), def.rulesStatus());
        course.setOptionGroup(def.optionGroup());
        if (def.syllabus() != null) {
            course.setSyllabus(def.syllabus().url(), def.syllabus().academicYear(), def.syllabus().completedOn());
        }
        if (!def.extraRequirements().isEmpty()) {
            course.setExtraRequirements(String.join("\n", def.extraRequirements()));
        }

        Map<String, GradeComponent> byCode = new HashMap<>();
        for (CatalogFile.ComponentDef c : def.components()) {
            byCode.put(c.code(), course.addComponent(c.code(), c.kind(), c.label(), c.weight(), c.sourceText()));
        }
        for (CatalogFile.ConditionDef c : def.conditions()) {
            GradeComponent target = c.component() == null ? null : byCode.get(c.component());
            course.addCondition(c.type(), target, c.minGrade(), c.sourceText()).setNote(c.note());
        }
        return course;
    }
}
