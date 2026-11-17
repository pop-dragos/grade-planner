package io.github.pop_dragos.backend.catalog;

import java.math.BigDecimal;

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
import jakarta.persistence.Table;

/** O conditie de notare, ex. „Laborator >= 5 pentru intrarea in examen”. */
@Entity
@Table(name = "grading_condition")
public class GradingCondition {

    /** ADMISSION = conditie de intrare in examen; PROMOTION = conditie de promovare. */
    public enum Type { ADMISSION, PROMOTION }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id")
    private Course course;

    @Enumerated(EnumType.STRING)
    @Column(name = "condition_type", nullable = false)
    private Type type;

    /** null = conditia se aplica notei finale, nu unei componente. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "component_id")
    private GradeComponent component;

    @Column(name = "min_grade", nullable = false, precision = 4, scale = 2)
    private BigDecimal minGrade;

    @Column(name = "source_text")
    private String sourceText;

    @Column
    private String note;

    protected GradingCondition() {
    }

    /** Package-private: se creeaza doar prin Course.addCondition(). */
    GradingCondition(Course course, Type type, GradeComponent component,
                     BigDecimal minGrade, String sourceText) {
        this.course = course;
        this.type = type;
        this.component = component;
        this.minGrade = minGrade;
        this.sourceText = sourceText;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public Long getId() {
        return id;
    }

    public Course getCourse() {
        return course;
    }

    public Type getType() {
        return type;
    }

    public GradeComponent getComponent() {
        return component;
    }

    public BigDecimal getMinGrade() {
        return minGrade;
    }

    public String getSourceText() {
        return sourceText;
    }

    public String getNote() {
        return note;
    }
}
