package io.github.pop_dragos.backend.catalog;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.dataformat.yaml.YAMLMapper;

/**
 * Structura unui fisier YAML de catalog (un plan de invatamant intr-un an universitar).
 * Record-urile oglindesc exact cheile din YAML (snake_case in YAML -> camelCase in Java).
 */
public record CatalogFile(ProgramDef program, CurriculumDef curriculum, List<CourseDef> courses) {

    private static final YAMLMapper MAPPER = YAMLMapper.builder()
            .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
            // o cheie scrisa gresit in YAML (ex. "credit" in loc de "credits") = eroare, nu e ignorata
            .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();

    public static CatalogFile parse(InputStream in) {
        return MAPPER.readValue(in, CatalogFile.class);
    }

    public static CatalogFile parse(String yaml) {
        return MAPPER.readValue(yaml, CatalogFile.class);
    }

    public record ProgramDef(String code, String name, String language) {
    }

    public record CurriculumDef(String academicYear, String sourceUrl) {
    }

    public record SyllabusDef(String url, String academicYear, LocalDate completedOn) {
    }

    public record ComponentDef(String code, GradeComponent.Kind kind, String label,
                               BigDecimal weight, String sourceText) {
    }

    /** component = codul componentei (ex. "lab"); lipsa = conditie pe nota finala. */
    public record ConditionDef(GradingCondition.Type type, String component, BigDecimal minGrade,
                               String sourceText, String note) {
    }

    public record CourseDef(String planCode, String name, Integer yearOfStudy, Integer semester, Integer credits,
                            Course.EvaluationForm evaluationForm, Course.GradingType gradingType,
                            Course.Category category, Course.Regime regime, String optionGroup,
                            Course.RulesStatus rulesStatus, SyllabusDef syllabus, List<String> extraRequirements,
                            List<ComponentDef> components, List<ConditionDef> conditions) {

        /** Valori implicite, ca YAML-ul sa contina doar ce difera de cazul obisnuit. */
        public CourseDef {
            gradingType = gradingType == null ? Course.GradingType.NUMERIC : gradingType;
            regime = regime == null ? Course.Regime.DOB : regime;
            rulesStatus = rulesStatus == null ? Course.RulesStatus.NONE : rulesStatus;
            extraRequirements = extraRequirements == null ? List.of() : extraRequirements;
            components = components == null ? List.of() : components;
            conditions = conditions == null ? List.of() : conditions;
        }
    }

    /** Verifica tot fisierul si raporteaza TOATE erorile odata, nu doar prima. */
    public void validate() {
        List<String> errors = new ArrayList<>();

        if (program == null || isBlank(program.code()) || isBlank(program.name()) || isBlank(program.language())) {
            errors.add("program: code, name si language sunt obligatorii");
        }
        if (curriculum == null || curriculum.academicYear() == null
                || !curriculum.academicYear().matches("\\d{4}-\\d{4}")) {
            errors.add("curriculum.academic_year trebuie sa fie de forma 2026-2027");
        }
        if (courses == null || courses.isEmpty()) {
            errors.add("courses: lista de materii e goala");
        } else {
            Set<String> planCodes = new HashSet<>();
            for (CourseDef course : courses) {
                validateCourse(course, planCodes, errors);
            }
        }

        if (!errors.isEmpty()) {
            throw new IllegalArgumentException("Catalog invalid:\n - " + String.join("\n - ", errors));
        }
    }

    private static void validateCourse(CourseDef c, Set<String> planCodes, List<String> errors) {
        String id = "materia " + c.planCode() + " (" + c.name() + ")";

        if (c.planCode() == null || !c.planCode().matches("\\d+\\.\\d{2}")) {
            errors.add(id + ": plan_code trebuie sa fie de forma \"4.00\"");
        } else if (!planCodes.add(c.planCode())) {
            errors.add(id + ": plan_code duplicat");
        }
        if (isBlank(c.name())) {
            errors.add(id + ": name lipseste");
        }
        if (c.yearOfStudy() == null || c.yearOfStudy() < 1 || c.yearOfStudy() > 4) {
            errors.add(id + ": year_of_study trebuie sa fie intre 1 si 4");
        }
        if (c.semester() == null || (c.semester() != 1 && c.semester() != 2)) {
            errors.add(id + ": semester trebuie sa fie 1 sau 2");
        }
        if (c.credits() == null || c.credits() < 1 || c.credits() > 30) {
            errors.add(id + ": credits trebuie sa fie intre 1 si 30");
        }
        if (c.evaluationForm() == null || c.category() == null) {
            errors.add(id + ": evaluation_form si category sunt obligatorii");
        }

        if (c.gradingType() == Course.GradingType.PASS_FAIL && !c.components().isEmpty()) {
            errors.add(id + ": o materie admis/respins nu poate avea componente cu ponderi");
        }
        if (c.rulesStatus() == Course.RulesStatus.CLEAR && c.components().isEmpty()) {
            errors.add(id + ": rules_status CLEAR cere cel putin o componenta");
        }

        if (!c.components().isEmpty()) {
            BigDecimal sum = c.components().stream()
                    .map(ComponentDef::weight)
                    .map(w -> w == null ? BigDecimal.ZERO : w)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (sum.compareTo(new BigDecimal("100")) != 0) {
                errors.add(id + ": ponderile insumeaza " + sum.stripTrailingZeros().toPlainString() + ", nu 100");
            }
        }

        Set<String> componentCodes = new HashSet<>();
        for (ComponentDef comp : c.components()) {
            if (isBlank(comp.code()) || comp.kind() == null || isBlank(comp.label())) {
                errors.add(id + ": fiecare componenta are nevoie de code, kind si label");
            } else if (!componentCodes.add(comp.code())) {
                errors.add(id + ": componenta '" + comp.code() + "' apare de doua ori");
            }
            if (comp.weight() == null || comp.weight().signum() <= 0) {
                errors.add(id + ": componenta '" + comp.code() + "' are pondere lipsa sau <= 0");
            }
        }

        for (ConditionDef cond : c.conditions()) {
            if (cond.type() == null || cond.minGrade() == null) {
                errors.add(id + ": fiecare conditie are nevoie de type si min_grade");
            } else if (cond.minGrade().compareTo(BigDecimal.ONE) < 0
                    || cond.minGrade().compareTo(BigDecimal.TEN) > 0) {
                errors.add(id + ": min_grade trebuie sa fie intre 1 si 10");
            }
            if (cond.component() != null && !componentCodes.contains(cond.component())) {
                errors.add(id + ": conditia se refera la componenta inexistenta '" + cond.component()
                        + "' (exista: " + componentCodes.stream().sorted().collect(Collectors.joining(", ")) + ")");
            }
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
