package io.github.pop_dragos.backend.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** O specializare, ex. „Calculatoare (română)”. */
@Entity
@Table(name = "study_program")
public class StudyProgram {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String language;

    /** Cerut de JPA: Hibernate creeaza obiectul gol, apoi completeaza campurile din rezultatul query-ului. */
    protected StudyProgram() {
    }

    public StudyProgram(String code, String name, String language) {
        this.code = code;
        this.name = name;
        this.language = language;
    }

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public String getLanguage() {
        return language;
    }
}
