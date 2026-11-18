package io.github.pop_dragos.backend.catalog;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import io.github.pop_dragos.backend.catalog.CatalogDtos.CourseDto;
import io.github.pop_dragos.backend.catalog.CatalogDtos.ProgramDto;

/** API-ul public, doar de citire, al catalogului. */
@RestController
@RequestMapping("/api/catalog")
public class CatalogController {

    private final CatalogService catalog;

    CatalogController(CatalogService catalog) {
        this.catalog = catalog;
    }

    /** GET /api/catalog/programs -> specializarile si anii universitari disponibili. */
    @GetMapping("/programs")
    public List<ProgramDto> programs() {
        return catalog.programs();
    }

    /** GET /api/catalog/courses?program=CALC-RO&academicYear=2026-2027&year=1&semester=1 */
    @GetMapping("/courses")
    public List<CourseDto> courses(@RequestParam String program,
                                   @RequestParam String academicYear,
                                   @RequestParam int year,
                                   @RequestParam int semester) {
        if (year < 1 || year > 4 || (semester != 1 && semester != 2)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "year trebuie 1-4, semester 1 sau 2");
        }
        return catalog.courses(program, academicYear, year, semester);
    }
}
