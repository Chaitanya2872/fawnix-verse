package com.hirepath.org.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hirepath.org.domain.BusinessUnit;
import com.hirepath.org.domain.Designation;
import com.hirepath.org.domain.Location;
import com.hirepath.org.domain.OrgNode;
import com.hirepath.org.domain.OrgUnit;
import com.hirepath.org.domain.RoleMapping;
import com.hirepath.org.domain.Team;
import com.hirepath.org.domain.Vacancy;
import com.hirepath.org.domain.VacancyStatus;
import com.hirepath.org.dto.CreateBusinessUnitRequest;
import com.hirepath.org.dto.CreateDesignationRequest;
import com.hirepath.org.dto.CreateLocationRequest;
import com.hirepath.org.dto.CreateOrgUnitRequest;
import com.hirepath.org.dto.CreateTeamRequest;
import com.hirepath.org.dto.UpdateManagerRequest;
import com.hirepath.org.dto.UpdateRoleMappingRequest;
import com.hirepath.org.dto.UpdateVacancyRequest;
import com.hirepath.org.repository.BusinessUnitRepository;
import com.hirepath.org.repository.DesignationRepository;
import com.hirepath.org.repository.LocationRepository;
import com.hirepath.org.repository.OrgNodeRepository;
import com.hirepath.org.repository.OrgUnitRepository;
import com.hirepath.org.repository.RoleMappingRepository;
import com.hirepath.org.repository.TeamRepository;
import com.hirepath.org.repository.VacancyRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/org")
public class OrgAdminController {

    private final BusinessUnitRepository businessUnitRepository;
    private final TeamRepository teamRepository;
    private final OrgUnitRepository orgUnitRepository;
    private final LocationRepository locationRepository;
    private final DesignationRepository designationRepository;
    private final OrgNodeRepository orgNodeRepository;
    private final RoleMappingRepository roleMappingRepository;
    private final VacancyRepository vacancyRepository;

    public OrgAdminController(
        BusinessUnitRepository businessUnitRepository,
        TeamRepository teamRepository,
        OrgUnitRepository orgUnitRepository,
        LocationRepository locationRepository,
        DesignationRepository designationRepository,
        OrgNodeRepository orgNodeRepository,
        RoleMappingRepository roleMappingRepository,
        VacancyRepository vacancyRepository
    ) {
        this.businessUnitRepository = businessUnitRepository;
        this.teamRepository = teamRepository;
        this.orgUnitRepository = orgUnitRepository;
        this.locationRepository = locationRepository;
        this.designationRepository = designationRepository;
        this.orgNodeRepository = orgNodeRepository;
        this.roleMappingRepository = roleMappingRepository;
        this.vacancyRepository = vacancyRepository;
    }

    @GetMapping("/business-units")
    public Map<String, List<BusinessUnit>> listBusinessUnits() {
        return Map.of("data", businessUnitRepository.findAll());
    }

    @PostMapping("/business-units")
    public ResponseEntity<?> createBusinessUnit(@RequestBody CreateBusinessUnitRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            return ResponseEntity.badRequest().body("Name is required");
        }
        BusinessUnit unit = new BusinessUnit();
        unit.setName(request.getName().trim());
        unit.setOwner(request.getOwner());
        BusinessUnit saved = businessUnitRepository.save(unit);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", saved.getId(), "message", "Business unit created"));
    }

    @GetMapping("/teams")
    public Map<String, List<Team>> listTeams() {
        return Map.of("data", teamRepository.findAll());
    }

    @PostMapping("/teams")
    public ResponseEntity<?> createTeam(@RequestBody CreateTeamRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            return ResponseEntity.badRequest().body("Name is required");
        }
        Team team = new Team();
        team.setName(request.getName().trim());
        team.setDepartment(request.getDepartment() != null ? request.getDepartment() : "Unassigned");
        Team saved = teamRepository.save(team);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", saved.getId(), "message", "Team created"));
    }

    @GetMapping("/org-units")
    public Map<String, List<OrgUnit>> listOrgUnits() {
        return Map.of("data", orgUnitRepository.findAll());
    }

    @PostMapping("/org-units")
    public ResponseEntity<?> createOrgUnit(@RequestBody CreateOrgUnitRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            return ResponseEntity.badRequest().body("Name is required");
        }
        OrgUnit unit = new OrgUnit();
        unit.setName(request.getName().trim());
        OrgUnit saved = orgUnitRepository.save(unit);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", saved.getId(), "message", "Org unit created"));
    }

    @GetMapping("/locations")
    public Map<String, List<Location>> listLocations() {
        return Map.of("data", locationRepository.findAll());
    }

    @PostMapping("/locations")
    public ResponseEntity<?> createLocation(@RequestBody CreateLocationRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            return ResponseEntity.badRequest().body("Name is required");
        }
        Location location = new Location();
        location.setName(request.getName().trim());
        Location saved = locationRepository.save(location);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", saved.getId(), "message", "Location created"));
    }

    @GetMapping("/designations")
    public Map<String, List<Designation>> listDesignations() {
        return Map.of("data", designationRepository.findAll());
    }

    @PostMapping("/designations")
    public ResponseEntity<?> createDesignation(@RequestBody CreateDesignationRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            return ResponseEntity.badRequest().body("Name is required");
        }
        Designation designation = new Designation();
        designation.setName(request.getName().trim());
        Designation saved = designationRepository.save(designation);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", saved.getId(), "message", "Designation created"));
    }

    @GetMapping("/nodes")
    public Map<String, List<OrgNode>> listOrgNodes() {
        return Map.of("data", orgNodeRepository.findAll());
    }

    @PatchMapping("/nodes/{id}/manager")
    public ResponseEntity<?> updateManager(@PathVariable UUID id, @RequestBody UpdateManagerRequest request) {
        OrgNode node = orgNodeRepository.findById(id).orElse(null);
        if (node == null) {
            return ResponseEntity.notFound().build();
        }
        UUID managerId = null;
        if (request.getManagerId() != null && !request.getManagerId().isBlank()) {
            try {
                managerId = UUID.fromString(request.getManagerId());
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body("Invalid manager_id");
            }
        }
        node.setManagerId(managerId);
        node.setLevel(managerId == null ? 0 : 1);
        OrgNode saved = orgNodeRepository.save(node);
        return ResponseEntity.ok(Map.of("data", saved));
    }

    @GetMapping("/role-mappings")
    public Map<String, List<RoleMapping>> listRoleMappings() {
        return Map.of("data", roleMappingRepository.findAll());
    }

    @PatchMapping("/role-mappings/{id}")
    public ResponseEntity<?> updateRoleMapping(@PathVariable UUID id, @RequestBody UpdateRoleMappingRequest request) {
        RoleMapping mapping = roleMappingRepository.findById(id).orElse(null);
        if (mapping == null) {
            return ResponseEntity.notFound().build();
        }
        if (request.getDepartment() != null && !request.getDepartment().isBlank()) {
            mapping.setDepartment(request.getDepartment());
        }
        RoleMapping saved = roleMappingRepository.save(mapping);
        return ResponseEntity.ok(Map.of("data", saved));
    }

    @GetMapping("/vacancies")
    public Map<String, List<Vacancy>> listVacancies() {
        return Map.of("data", vacancyRepository.findAll());
    }

    @PatchMapping("/vacancies/{id}")
    public ResponseEntity<?> updateVacancy(@PathVariable UUID id, @RequestBody UpdateVacancyRequest request) {
        Vacancy vacancy = vacancyRepository.findById(id).orElse(null);
        if (vacancy == null) {
            return ResponseEntity.notFound().build();
        }
        if (request.getStatus() != null) {
            try {
                vacancy.setStatus(VacancyStatus.valueOf(request.getStatus().toUpperCase()));
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body("Invalid status");
            }
        }
        Vacancy saved = vacancyRepository.save(vacancy);
        return ResponseEntity.ok(Map.of("data", saved));
    }
}
