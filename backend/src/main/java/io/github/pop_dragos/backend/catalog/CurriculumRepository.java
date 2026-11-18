package io.github.pop_dragos.backend.catalog;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CurriculumRepository extends JpaRepository<Curriculum, Long> {

    /** join fetch: aduce si specializarea in acelasi query (altfel: un query in plus pentru fiecare plan). */
    @Query("select c from Curriculum c join fetch c.program order by c.program.code, c.academicYear desc")
    List<Curriculum> findAllWithProgram();
}
