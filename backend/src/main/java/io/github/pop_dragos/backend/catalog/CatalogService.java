package io.github.pop_dragos.backend.catalog;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.pop_dragos.backend.catalog.CatalogDtos.CourseDto;
import io.github.pop_dragos.backend.catalog.CatalogDtos.ProgramDto;

/**
 * Citeste catalogul si il transforma in DTO-uri.
 * Transformarea se face IN tranzactie: componentele/conditiile sunt LAZY si se incarca la acces.
 */
@Service
@Transactional(readOnly = true)
public class CatalogService {

    private final CourseRepository courses;
    private final CurriculumRepository curricula;

    CatalogService(CourseRepository courses, CurriculumRepository curricula) {
        this.courses = courses;
        this.curricula = curricula;
    }

    public List<ProgramDto> programs() {
        // grupeaza planurile pe specializare, pastrand ordinea din query
        Map<StudyProgram, List<String>> years = new LinkedHashMap<>();
        for (Curriculum c : curricula.findAllWithProgram()) {
            years.computeIfAbsent(c.getProgram(), p -> new ArrayList<>()).add(c.getAcademicYear());
        }
        return years.entrySet().stream()
                .map(e -> new ProgramDto(e.getKey().getCode(), e.getKey().getName(),
                        e.getKey().getLanguage(), e.getValue()))
                .toList();
    }

    public List<CourseDto> courses(String program, String academicYear, int year, int semester) {
        return courses.findForSemester(program, academicYear, (short) year, (short) semester).stream()
                .map(CourseDto::from)
                .toList();
    }
}
