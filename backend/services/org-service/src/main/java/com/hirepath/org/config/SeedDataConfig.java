package com.hirepath.org.config;

import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.hirepath.org.domain.BusinessUnit;
import com.hirepath.org.domain.CompanyProfile;
import com.hirepath.org.domain.Department;
import com.hirepath.org.domain.Designation;
import com.hirepath.org.domain.Location;
import com.hirepath.org.domain.OrgNode;
import com.hirepath.org.domain.Policy;
import com.hirepath.org.domain.PolicyStatus;
import com.hirepath.org.domain.RoleMapping;
import com.hirepath.org.domain.Team;
import com.hirepath.org.domain.Vacancy;
import com.hirepath.org.domain.VacancyStatus;
import com.hirepath.org.repository.BusinessUnitRepository;
import com.hirepath.org.repository.CompanyProfileRepository;
import com.hirepath.org.repository.DepartmentRepository;
import com.hirepath.org.repository.DesignationRepository;
import com.hirepath.org.repository.LocationRepository;
import com.hirepath.org.repository.OrgNodeRepository;
import com.hirepath.org.repository.PolicyRepository;
import com.hirepath.org.repository.RoleMappingRepository;
import com.hirepath.org.repository.TeamRepository;
import com.hirepath.org.repository.VacancyRepository;

@Configuration
public class SeedDataConfig {

    @Bean
    CommandLineRunner seedOrgData(
        CompanyProfileRepository companyRepository,
        DepartmentRepository departmentRepository,
        BusinessUnitRepository businessUnitRepository,
        TeamRepository teamRepository,
        LocationRepository locationRepository,
        DesignationRepository designationRepository,
        OrgNodeRepository orgNodeRepository,
        RoleMappingRepository roleMappingRepository,
        VacancyRepository vacancyRepository,
        PolicyRepository policyRepository
    ) {
        return args -> {
            if (companyRepository.count() == 0) {
                CompanyProfile profile = new CompanyProfile();
                profile.setName("HirePath Technologies");
                profile.setLegalEntity("HirePath Technologies Pvt Ltd");
                profile.setCountry("India");
                profile.setTimezone("Asia/Kolkata");
                companyRepository.save(profile);
            }

            if (departmentRepository.count() == 0) {
                Department engineering = new Department();
                engineering.setName("Engineering");
                engineering.setHeadName("Nisha Kapoor");
                Department design = new Department();
                design.setName("Design");
                design.setHeadName("Meera Rao");
                Department operations = new Department();
                operations.setName("Operations");
                operations.setHeadName("Rohan Sen");
                departmentRepository.saveAll(List.of(engineering, design, operations));
            }

            if (businessUnitRepository.count() == 0) {
                BusinessUnit product = new BusinessUnit();
                product.setName("Product & Tech");
                product.setOwner("CTO Office");
                BusinessUnit ops = new BusinessUnit();
                ops.setName("Operations");
                ops.setOwner("COO Office");
                businessUnitRepository.saveAll(List.of(product, ops));
            }

            if (teamRepository.count() == 0) {
                Team frontend = new Team();
                frontend.setName("Frontend");
                frontend.setDepartment("Engineering");
                Team design = new Team();
                design.setName("Design Systems");
                design.setDepartment("Design");
                Team ops = new Team();
                ops.setName("Ops Support");
                ops.setDepartment("Operations");
                teamRepository.saveAll(List.of(frontend, design, ops));
            }

            if (locationRepository.count() == 0) {
                Location blr = new Location();
                blr.setName("Bengaluru");
                Location delhi = new Location();
                delhi.setName("Delhi");
                Location remote = new Location();
                remote.setName("Remote");
                locationRepository.saveAll(List.of(blr, delhi, remote));
            }

            if (designationRepository.count() == 0) {
                Designation se = new Designation();
                se.setName("Software Engineer");
                Designation hr = new Designation();
                hr.setName("HR Manager");
                Designation sales = new Designation();
                sales.setName("Sales Lead");
                designationRepository.saveAll(List.of(se, hr, sales));
            }

            if (orgNodeRepository.count() == 0) {
                OrgNode nisha = new OrgNode();
                nisha.setName("Nisha Kapoor");
                nisha.setRole("Engineering Manager");
                nisha.setDepartment("Engineering");
                nisha.setLevel(0);

                OrgNode aarav = new OrgNode();
                aarav.setName("Aarav Mehta");
                aarav.setRole("Frontend Engineer");
                aarav.setDepartment("Engineering");

                OrgNode meera = new OrgNode();
                meera.setName("Meera Rao");
                meera.setRole("Product Designer");
                meera.setDepartment("Design");
                meera.setLevel(0);

                OrgNode rohan = new OrgNode();
                rohan.setName("Rohan Sen");
                rohan.setRole("Ops Associate");
                rohan.setDepartment("Operations");
                rohan.setLevel(0);

                orgNodeRepository.save(nisha);
                aarav.setManagerId(nisha.getId());
                aarav.setLevel(1);
                orgNodeRepository.save(aarav);
                orgNodeRepository.saveAll(List.of(meera, rohan));
            }

            if (roleMappingRepository.count() == 0) {
                RoleMapping frontend = new RoleMapping();
                frontend.setRole("Frontend Engineer");
                frontend.setDepartment("Engineering");
                RoleMapping designer = new RoleMapping();
                designer.setRole("Product Designer");
                designer.setDepartment("Design");
                RoleMapping ops = new RoleMapping();
                ops.setRole("Ops Associate");
                ops.setDepartment("Operations");
                roleMappingRepository.saveAll(List.of(frontend, designer, ops));
            }

            if (vacancyRepository.count() == 0) {
                Vacancy backend = new Vacancy();
                backend.setRole("Backend Engineer");
                backend.setDepartment("Engineering");
                backend.setHeadcount(6);
                backend.setFilled(4);
                backend.setStatus(VacancyStatus.OPEN);

                Vacancy ux = new Vacancy();
                ux.setRole("UX Researcher");
                ux.setDepartment("Design");
                ux.setHeadcount(2);
                ux.setFilled(2);
                ux.setStatus(VacancyStatus.CLOSED);
                vacancyRepository.saveAll(List.of(backend, ux));
            }

            if (policyRepository.count() == 0) {
                Policy leave = new Policy();
                leave.setName("Leave Policy (External)");
                leave.setStatus(PolicyStatus.NOT_CONFIGURED);
                leave.setOwner("Operations");
                Policy attendance = new Policy();
                attendance.setName("Attendance Rules (External)");
                attendance.setStatus(PolicyStatus.CONFIGURED);
                attendance.setOwner("Operations");
                Policy payroll = new Policy();
                payroll.setName("Payroll Statutory Settings");
                payroll.setStatus(PolicyStatus.CONFIGURED);
                payroll.setOwner("Finance");
                policyRepository.saveAll(List.of(leave, attendance, payroll));
            }
        };
    }
}
