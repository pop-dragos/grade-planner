package io.github.pop_dragos.backend.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Planul de invatamant al unei specializari intr-un an universitar, ex. Calculatoare 2026-2027. */
@Entity
@Table(name = "curriculum")
public class Curriculum {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "program_id")
    private StudyProgram program;

    @Column(name = "academic_year", nullable = false)
    private String academicYear;

    @Column(name = "source_url")
    private String sourceUrl;

    protected Curriculum() {
    }

    public Curriculum(StudyProgram program, String academicYear, String sourceUrl) {
        this.program = program;
        this.academicYear = academicYear;
        this.sourceUrl = sourceUrl;
    }

    public Long getId() {
        return id;
    }

    public StudyProgram getProgram() {
        return program;
    }

    public String getAcademicYear() {
        return academicYear;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }
}
