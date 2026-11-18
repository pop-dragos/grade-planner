package io.github.pop_dragos.backend.catalog;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Forma JSON pe care o expune API-ul. Separata de entitati: o schimbare in baza de date
 * nu schimba automat contractul cu frontend-ul.
 */
public final class CatalogDtos {

    private CatalogDtos() {
    }

    public record ProgramDto(String code, String name, String language, List<String> academicYears) {
    }

    public record CourseDto(String planCode, String name, int yearOfStudy, int semester, int credits,
                            Course.EvaluationForm evaluationForm, Course.GradingType gradingType,
                            Course.Category category, Course.Regime regime, String optionGroup,
                            Course.RulesStatus rulesStatus, SyllabusDto syllabus, List<String> extraRequirements,
                            List<ComponentDto> components, List<ConditionDto> conditions) {

        static CourseDto from(Course c) {
            return new CourseDto(c.getPlanCode(), c.getName(), c.getYearOfStudy(), c.getSemester(), c.getCredits(),
                    c.getEvaluationForm(), c.getGradingType(), c.getCategory(), c.getRegime(), c.getOptionGroup(),
                    c.getRulesStatus(),
                    c.getSyllabusYear() == null && c.getSyllabusUrl() == null ? null
                            : new SyllabusDto(c.getSyllabusUrl(), c.getSyllabusYear(), c.getSyllabusDate()),
                    c.getExtraRequirements() == null ? List.of() : c.getExtraRequirements().lines().toList(),
                    c.getComponents().stream().map(ComponentDto::from).toList(),
                    c.getConditions().stream().map(ConditionDto::from).toList());
        }
    }

    public record SyllabusDto(String url, String academicYear, LocalDate completedOn) {
    }

    public record ComponentDto(String code, GradeComponent.Kind kind, String label,
                               BigDecimal weight, String sourceText) {

        static ComponentDto from(GradeComponent g) {
            return new ComponentDto(g.getCode(), g.getKind(), g.getLabel(), g.getWeight(), g.getSourceText());
        }
    }

    /** component = codul componentei; null = conditia se aplica notei finale. */
    public record ConditionDto(GradingCondition.Type type, String component, BigDecimal minGrade,
                               String sourceText, String note) {

        static ConditionDto from(GradingCondition c) {
            return new ConditionDto(c.getType(), c.getComponent() == null ? null : c.getComponent().getCode(),
                    c.getMinGrade(), c.getSourceText(), c.getNote());
        }
    }
}
