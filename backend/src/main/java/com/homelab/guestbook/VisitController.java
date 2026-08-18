package com.homelab.guestbook;

import java.time.Instant;
import java.util.Map;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/visits")
@CrossOrigin
public class VisitController {

    private final VisitRepository visitRepository;

    public VisitController(VisitRepository visitRepository) {
        this.visitRepository = visitRepository;
    }

    @GetMapping
    public Map<String, Long> getCount() {
        return Map.of("count", visitRepository.count());
    }

    @PostMapping
    public Map<String, Long> recordVisit() {
        visitRepository.save(new Visit(Instant.now()));
        return Map.of("count", visitRepository.count());
    }
}
