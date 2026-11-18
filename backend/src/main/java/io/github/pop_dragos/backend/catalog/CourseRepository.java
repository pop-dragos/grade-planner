package io.github.pop_dragos.backend.catalog;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Spring Data genereaza implementarea la pornire; noi scriem doar interfata si query-ul. */
public interface CourseRepository extends JpaRepository<Course, Long> {

    @Query("""
            select c from Course c
            where c.curriculum.program.code = :program
              and c.curriculum.academicYear = :academicYear
              and c.yearOfStudy = :year
              and c.semester = :semester
            order by c.id
            """)
    List<Course> findForSemester(@Param("program") String program,
                                 @Param("academicYear") String academicYear,
                                 @Param("year") short year,
                                 @Param("semester") short semester);
}
