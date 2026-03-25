package com.hirepath.org.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.org.domain.Department;

public interface DepartmentRepository extends JpaRepository<Department, UUID> {}
