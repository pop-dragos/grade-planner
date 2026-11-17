package io.github.pop_dragos.backend.catalog;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

/** O materie dintr-un plan de invatamant, cu regulile ei de notare. */
@Entity
@Table(name = "course")
public class Course {

    /** Forma de verificare din plan: Examen, Colocviu, Verificare. */
    public enum EvaluationForm { E, C, V }

    /** NUMERIC = nota 1-10; PASS_FAIL = admis/respins (ex. Sport). */
    public enum GradingType { NUMERIC, PASS_FAIL }

    /** Categoria formativa: fundamentala, de domeniu, de specialitate, complementara. */
    public enum Category { DF, DD, DS, DC }

    /** Obligatorie, optionala, facultativa. */
    public enum Regime { DOB, DOP, DFA }

    /** Cat de mult ne putem baza pe regulile din fisa pentru simulatorul pe componente. */
    public enum RulesStatus { CLEAR, AMBIGUOUS, NONE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "curriculum_id")
    private Curriculum curriculum;

    @Column(name = "plan_code", nullable = false)
    private String planCode;

    @Column(nullable = false)
    private String name;

    @Column(name = "year_of_study", nullable = false)
    private short yearOfStudy;

    @Column(nullable = false)
    private short semester;

    @Column(nullable = false)
    private short credits;

    @Enumerated(EnumType.STRING)
    @Column(name = "evaluation_form", nullable = false)
    private EvaluationForm evaluationForm;

    @Enumerated(EnumType.STRING)
    @Column(name = "grading_type", nullable = false)
    private GradingType gradingType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Regime regime;

    @Column(name = "option_group")
    private String optionGroup;

    @Enumerated(EnumType.STRING)
    @Column(name = "rules_status", nullable = false)
    private RulesStatus rulesStatus;

    @Column(name = "syllabus_url")
    private String syllabusUrl;

    @Column(name = "syllabus_year")
    private String syllabusYear;

    @Column(name = "syllabus_date")
    private LocalDate syllabusDate;

    @Column(name = "extra_requirements")
    private String extraRequirements;

    /*
     * mappedBy = "course": cheia straina (course_id) e detinuta de GradeComponent.course;
     *   lista de aici e doar „partea inversa” a aceleiasi relatii.
     * cascade = ALL: cand salvezi/stergi materia, se salveaza/sterg si componentele.
     * orphanRemoval: o componenta scoasa din lista e stearsa si din baza de date.
     */
    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    private List<GradeComponent> components = new ArrayList<>();

    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private List<GradingCondition> conditions = new ArrayList<>();

    protected Course() {
    }

    public Course(Curriculum curriculum, String planCode, String name,
                  int yearOfStudy, int semester, int credits,
                  EvaluationForm evaluationForm, GradingType gradingType,
                  Category category, Regime regime, RulesStatus rulesStatus) {
        this.curriculum = curriculum;
        this.planCode = planCode;
        this.name = name;
        this.yearOfStudy = (short) yearOfStudy;
        this.semester = (short) semester;
        this.credits = (short) credits;
        this.evaluationForm = evaluationForm;
        this.gradingType = gradingType;
        this.category = category;
        this.regime = regime;
        this.rulesStatus = rulesStatus;
    }

    /** Adauga o componenta de notare; pozitia de afisare e ordinea adaugarii. */
    public GradeComponent addComponent(String code, GradeComponent.Kind kind, String label,
                                       BigDecimal weight, String sourceText) {
        var component = new GradeComponent(this, code, kind, label, weight,
                components.size() + 1, sourceText);
        components.add(component);
        return component;
    }

    /** Adauga o conditie. component == null inseamna ca se aplica notei finale. */
    public GradingCondition addCondition(GradingCondition.Type type, GradeComponent component,
                                         BigDecimal minGrade, String sourceText) {
        var condition = new GradingCondition(this, type, component, minGrade, sourceText);
        conditions.add(condition);
        return condition;
    }

    public void setOptionGroup(String optionGroup) {
        this.optionGroup = optionGroup;
    }

    public void setSyllabus(String url, String academicYear, LocalDate completedOn) {
        this.syllabusUrl = url;
        this.syllabusYear = academicYear;
        this.syllabusDate = completedOn;
    }

    public void setExtraRequirements(String extraRequirements) {
        this.extraRequirements = extraRequirements;
    }

    public Long getId() {
        return id;
    }

    public Curriculum getCurriculum() {
        return curriculum;
    }

    public String getPlanCode() {
        return planCode;
    }

    public String getName() {
        return name;
    }

    public int getYearOfStudy() {
        return yearOfStudy;
    }

    public int getSemester() {
        return semester;
    }

    public int getCredits() {
        return credits;
    }

    public EvaluationForm getEvaluationForm() {
        return evaluationForm;
    }

    public GradingType getGradingType() {
        return gradingType;
    }

    public Category getCategory() {
        return category;
    }

    public Regime getRegime() {
        return regime;
    }

    public String getOptionGroup() {
        return optionGroup;
    }

    public RulesStatus getRulesStatus() {
        return rulesStatus;
    }

    public String getSyllabusUrl() {
        return syllabusUrl;
    }

    public String getSyllabusYear() {
        return syllabusYear;
    }

    public LocalDate getSyllabusDate() {
        return syllabusDate;
    }

    public String getExtraRequirements() {
        return extraRequirements;
    }

    /** Lista e read-only in afara clasei: componentele se adauga doar prin addComponent(). */
    public List<GradeComponent> getComponents() {
        return Collections.unmodifiableList(components);
    }

    public List<GradingCondition> getConditions() {
        return Collections.unmodifiableList(conditions);
    }
}
