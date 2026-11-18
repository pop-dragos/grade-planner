package io.github.pop_dragos.backend.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import io.github.pop_dragos.backend.TestcontainersConfiguration;
import jakarta.persistence.EntityManagerFactory;

/**
 * Dovada ca nu avem problema N+1: numarul de query-uri SQL e constant, oricate materii ar fi.
 * generate_statistics = Hibernate numara fiecare query trimis la baza de date.
 */
@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@Import(TestcontainersConfiguration.class)
class CatalogQueryCountTest {

    @Autowired
    CatalogService catalog;

    @Autowired
    EntityManagerFactory emf;

    @Test
    void loadsSemesterWithConstantNumberOfQueries() {
        Statistics stats = emf.unwrap(SessionFactory.class).getStatistics();
        stats.clear();

        var courses = catalog.courses("CALC-RO", "2026-2027", 1, 1);

        assertThat(courses).hasSize(12);
        // 1 query materiile + 1 query toate componentele + 1 query toate conditiile.
        // Fara batch fetching ar fi 1 + 12 + 12 = 25.
        assertThat(stats.getPrepareStatementCount()).isLessThanOrEqualTo(3);
    }
}
