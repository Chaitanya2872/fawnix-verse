package com.hirepath.org.controller;

import java.util.List;
import java.util.Map;

import com.hirepath.org.client.ApprovalClient;
import com.hirepath.org.client.IdentityClient;
import com.hirepath.org.client.dto.ApprovalFlowSummaryResponse;
import com.hirepath.org.client.dto.UserSummaryResponse;
import com.hirepath.org.domain.CompanyProfile;
import com.hirepath.org.domain.Policy;
import com.hirepath.org.domain.PolicyStatus;
import com.hirepath.org.domain.SetupConfig;
import com.hirepath.org.domain.SetupEmployee;
import com.hirepath.org.dto.CompanyProfileRequest;
import com.hirepath.org.dto.SetupEmployeeRequest;
import com.hirepath.org.repository.CompanyProfileRepository;
import com.hirepath.org.repository.DepartmentRepository;
import com.hirepath.org.repository.DesignationRepository;
import com.hirepath.org.repository.LocationRepository;
import com.hirepath.org.repository.OrgNodeRepository;
import com.hirepath.org.repository.PolicyRepository;
import com.hirepath.org.repository.SetupConfigRepository;
import com.hirepath.org.repository.SetupEmployeeRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/setup")
public class SetupController {

    private final CompanyProfileRepository companyRepository;
    private final SetupEmployeeRepository employeeRepository;
    private final PolicyRepository policyRepository;
    private final DepartmentRepository departmentRepository;
    private final OrgNodeRepository orgNodeRepository;
    private final LocationRepository locationRepository;
    private final DesignationRepository designationRepository;
    private final SetupConfigRepository setupConfigRepository;
    private final IdentityClient identityClient;
    private final ApprovalClient approvalClient;

    public SetupController(
        CompanyProfileRepository companyRepository,
        SetupEmployeeRepository employeeRepository,
        PolicyRepository policyRepository,
        DepartmentRepository departmentRepository,
        OrgNodeRepository orgNodeRepository,
        LocationRepository locationRepository,
        DesignationRepository designationRepository,
        SetupConfigRepository setupConfigRepository,
        IdentityClient identityClient,
        ApprovalClient approvalClient
    ) {
        this.companyRepository = companyRepository;
        this.employeeRepository = employeeRepository;
        this.policyRepository = policyRepository;
        this.departmentRepository = departmentRepository;
        this.orgNodeRepository = orgNodeRepository;
        this.locationRepository = locationRepository;
        this.designationRepository = designationRepository;
        this.setupConfigRepository = setupConfigRepository;
        this.identityClient = identityClient;
        this.approvalClient = approvalClient;
    }

    @GetMapping("/company")
    public Map<String, Object> getCompany() {
        CompanyProfile profile = companyRepository.findAll().stream().findFirst().orElse(null);
        return Map.of("data", profile);
    }

    @PutMapping("/company")
    public ResponseEntity<?> updateCompany(@RequestBody CompanyProfileRequest request) {
        if (request.getName() == null || request.getName().isBlank()
            || request.getLegalEntity() == null || request.getLegalEntity().isBlank()
            || request.getCountry() == null || request.getCountry().isBlank()
            || request.getTimezone() == null || request.getTimezone().isBlank()) {
            return ResponseEntity.badRequest().body("Missing required fields");
        }

        CompanyProfile profile = companyRepository.findAll().stream().findFirst().orElseGet(CompanyProfile::new);
        profile.setName(request.getName());
        profile.setLegalEntity(request.getLegalEntity());
        profile.setCountry(request.getCountry());
        profile.setTimezone(request.getTimezone());
        CompanyProfile saved = companyRepository.save(profile);
        return ResponseEntity.ok(Map.of("data", saved));
    }

    @GetMapping("/employees")
    public Map<String, List<SetupEmployee>> listEmployees() {
        return Map.of("data", employeeRepository.findAll());
    }

    @PostMapping("/employees")
    public ResponseEntity<?> addEmployee(@RequestBody SetupEmployeeRequest request) {
        if (request.getName() == null || request.getName().isBlank()
            || request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body("Name and email are required");
        }
        SetupEmployee employee = new SetupEmployee();
        employee.setName(request.getName());
        employee.setEmail(request.getEmail());
        employee.setDepartment(request.getDepartment());
        employee.setRole(request.getRole());
        employee.setManager(request.getManager());
        SetupEmployee saved = employeeRepository.save(employee);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", saved));
    }

    @PostMapping("/employees/import")
    public Map<String, Object> importEmployees() {
        return Map.of("data", Map.of("imported", 12));
    }

    @GetMapping("/policies")
    public Map<String, List<Policy>> listPolicies() {
        return Map.of("data", policyRepository.findAll());
    }

    @GetMapping("/progress")
    public Map<String, Object> getProgress() {
        CompanyProfile profile = companyRepository.findAll().stream().findFirst().orElse(null);
        boolean companyDone = profile != null
            && profile.getName() != null && !profile.getName().isBlank()
            && profile.getLegalEntity() != null && !profile.getLegalEntity().isBlank()
            && profile.getCountry() != null && !profile.getCountry().isBlank()
            && profile.getTimezone() != null && !profile.getTimezone().isBlank();

        int departments = (int) departmentRepository.count();
        int employees = (int) employeeRepository.count();
        int managers = (int) orgNodeRepository.findAll().stream().filter(n -> n.getManagerId() != null).count();
        int locations = (int) locationRepository.count();
        int designations = (int) designationRepository.count();

        boolean orgDone = departments > 0;
        boolean employeesDone = employees > 0;
        boolean hierarchyDone = managers > 0;
        boolean locationsDone = locations > 0 && designations > 0;

        boolean policiesDone = policyRepository.findAll().stream()
            .anyMatch(policy -> policy.getStatus() == PolicyStatus.CONFIGURED);

        UserSummaryResponse userSummary = safeUserSummary();
        int adminCount = userSummary.getByRole() != null ? userSummary.getByRole().getOrDefault("admin", 0) : 0;
        int hrCount = userSummary.getByRole() != null ? userSummary.getByRole().getOrDefault("hr_manager", 0) : 0;
        boolean usersDone = adminCount >= 1 && hrCount >= 1;

        ApprovalFlowSummaryResponse approvalSummary = safeApprovalSummary();
        boolean workflowsDone = approvalSummary.getActive() > 0;

        boolean activated = setupConfigRepository.findAll().stream().findFirst()
            .map(SetupConfig::isActivate)
            .orElse(false);

        Map<String, Object> progress = Map.of(
            "company", companyDone,
            "users", usersDone,
            "organization", orgDone,
            "locations", locationsDone,
            "employees", employeesDone,
            "hierarchy", hierarchyDone,
            "policies", policiesDone,
            "workflows", workflowsDone,
            "activate", activated
        );

        return Map.of("data", progress);
    }

    @PostMapping("/activate")
    public Map<String, Object> activate() {
        SetupConfig config = setupConfigRepository.findAll().stream().findFirst().orElseGet(SetupConfig::new);
        config.setActivate(true);
        setupConfigRepository.save(config);
        return getProgress();
    }

    private UserSummaryResponse safeUserSummary() {
        try {
            UserSummaryResponse summary = identityClient.summary();
            return summary != null ? summary : new UserSummaryResponse();
        } catch (Exception ex) {
            return new UserSummaryResponse();
        }
    }

    private ApprovalFlowSummaryResponse safeApprovalSummary() {
        try {
            ApprovalFlowSummaryResponse summary = approvalClient.summary();
            return summary != null ? summary : new ApprovalFlowSummaryResponse();
        } catch (Exception ex) {
            return new ApprovalFlowSummaryResponse();
        }
    }
}
