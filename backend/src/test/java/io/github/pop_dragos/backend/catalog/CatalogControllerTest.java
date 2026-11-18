package io.github.pop_dragos.backend.catalog;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import io.github.pop_dragos.backend.TestcontainersConfiguration;

/** Testeaza API-ul HTTP cap-coada: cerere -> controller -> baza de date (Testcontainers) -> JSON. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CatalogControllerTest {

    @Autowired
    MockMvc mvc;

    @Test
    void listsPrograms() throws Exception {
        mvc.perform(get("/api/catalog/programs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("CALC-RO"))
                .andExpect(jsonPath("$[0].academicYears[0]").value("2026-2027"));
    }

    @Test
    void listsCoursesForSemesterWithRules() throws Exception {
        mvc.perform(get("/api/catalog/courses")
                        .param("program", "CALC-RO")
                        .param("academicYear", "2026-2027")
                        .param("year", "1")
                        .param("semester", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(12))
                .andExpect(jsonPath("$[3].planCode").value("4.00"))
                .andExpect(jsonPath("$[3].name").value("Proiectare logică"))
                .andExpect(jsonPath("$[3].components[1].code").value("lab"))
                .andExpect(jsonPath("$[3].components[1].weight").value(30))
                .andExpect(jsonPath("$[3].conditions[0].type").value("ADMISSION"))
                .andExpect(jsonPath("$[3].conditions[0].component").value("lab"))
                .andExpect(jsonPath("$[3].syllabus.completedOn").value("2026-06-12"));
    }

    @Test
    void rejectsInvalidSemester() throws Exception {
        mvc.perform(get("/api/catalog/courses")
                        .param("program", "CALC-RO")
                        .param("academicYear", "2026-2027")
                        .param("year", "1")
                        .param("semester", "3"))
                .andExpect(status().isBadRequest());
    }
}
