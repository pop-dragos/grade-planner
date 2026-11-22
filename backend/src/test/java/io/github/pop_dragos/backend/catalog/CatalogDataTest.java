package io.github.pop_dragos.backend.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

import org.junit.jupiter.api.Test;

/**
 * Verifica datele reale din catalog (fara Spring, fara baza de date):
 * fiecare semestru are exact 30 de credite, numarand o singura materie din fiecare pachet optional
 * si ignorand facultativele. Prinde greselile de transcriere din planul de invatamant.
 */
class CatalogDataTest {

    private static final String FILE = "/catalog/calculatoare-ro-2026-2027.yaml";

    @Test
    void everySemesterHas30Credits() throws Exception {
        CatalogFile catalog;
        try (InputStream in = getClass().getResourceAsStream(FILE)) {
            catalog = CatalogFile.parse(in);
        }
        catalog.validate();

        Map<String, Integer> creditsPerSemester = new TreeMap<>();
        Set<String> countedGroups = new HashSet<>();
        for (CatalogFile.CourseDef c : catalog.courses()) {
            if (c.regime() == Course.Regime.DFA) continue;
            String semester = "anul " + c.yearOfStudy() + " sem " + c.semester();
            if (c.optionGroup() != null && !countedGroups.add(semester + "/" + c.optionGroup())) continue;
            creditsPerSemester.merge(semester, c.credits(), Integer::sum);
        }

        assertThat(creditsPerSemester).hasSize(8);
        assertThat(creditsPerSemester).allSatisfy((semester, credits) ->
                assertThat(credits).as(semester).isEqualTo(30));
    }
}
