package com.hirepath.org.controller;

import java.util.List;
import java.util.Map;

import com.hirepath.org.domain.Department;
import com.hirepath.org.dto.CreateDepartmentRequest;
import com.hirepath.org.repository.DepartmentRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/departments")
public class DepartmentController {

    private final DepartmentRepository repository;

    public DepartmentController(DepartmentRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public Map<String, List<Department>> list() {
        return Map.of("data", repository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateDepartmentRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            return ResponseEntity.badRequest().body("Name is required");
        }
        Department department = new Department();
        department.setName(request.getName().trim());
        department.setHeadName(request.getHead());
        Department saved = repository.save(department);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of("id", saved.getId(), "message", "Department created"));
    }
}
