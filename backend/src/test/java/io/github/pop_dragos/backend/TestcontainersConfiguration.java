package io.github.pop_dragos.backend;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Porneste un Postgres temporar in Docker pentru teste.
 * Aceeasi versiune ca in compose.yml, ca testele sa ruleze pe acelasi Postgres ca aplicatia.
 * Se foloseste cu @Import(TestcontainersConfiguration.class) pe clasele de test.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    @Bean
    @ServiceConnection // Spring ia URL-ul, user-ul si parola direct de la container
    PostgreSQLContainer postgres() {
        return new PostgreSQLContainer("postgres:18-alpine");
    }
}
