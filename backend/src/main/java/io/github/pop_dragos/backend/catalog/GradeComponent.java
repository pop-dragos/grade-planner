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

/** O componenta a notei, ex. „Laborator 30%”. */
@Entity
@Table(name = "grade_component")
public class GradeComponent {

    public enum Kind { EXAM, LAB, SEMINAR, PROJECT, PARTIAL, COLLOQUIUM, CONTINUOUS, OTHER }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id")
    private Course course;

    @Column(nullable = false)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Kind kind;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal weight;

    @Column(nullable = false)
    private short position;

    @Column(name = "source_text")
    private String sourceText;

    protected GradeComponent() {
    }

    /** Package-private: se creeaza doar prin Course.addComponent(). */
    GradeComponent(Course course, String code, Kind kind, String label,
                   BigDecimal weight, int position, String sourceText) {
        this.course = course;
        this.code = code;
        this.kind = kind;
        this.label = label;
        this.weight = weight;
        this.position = (short) position;
        this.sourceText = sourceText;
    }

    public Long getId() {
        return id;
    }

    public Course getCourse() {
        return course;
    }

    public String getCode() {
        return code;
    }

    public Kind getKind() {
        return kind;
    }

    public String getLabel() {
        return label;
    }

    public BigDecimal getWeight() {
        return weight;
    }

    public int getPosition() {
        return position;
    }

    public String getSourceText() {
        return sourceText;
    }
}
