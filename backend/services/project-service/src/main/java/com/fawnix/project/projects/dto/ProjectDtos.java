package com.fawnix.project.projects.dto;

import com.fawnix.project.projects.domain.ProjectEntity;
import com.fawnix.project.projects.domain.ProjectStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;

public final class ProjectDtos {

  private ProjectDtos() {
  }

  public record ProjectRequest(
      @Size(max = 40) String projectCode,
      @NotBlank @Size(max = 200) String name,
      @Size(max = 5000) String description,
      @Size(max = 80) String department,
      @Size(max = 160) String managerName,
      @Size(max = 40) String priority,
      Integer progress,
      Integer teamSize,
      @NotNull LocalDate startDate,
      @NotNull LocalDate targetEndDate
  ) {
  }

  public record ProjectResponse(
      String id,
      String projectCode,
      String name,
      String description,
      ProjectStatus status,
      String department,
      String managerName,
      String priority,
      Integer progress,
      Integer teamSize,
      LocalDate startDate,
      LocalDate targetEndDate,
      Instant createdAt,
      Instant updatedAt
  ) {
    public static ProjectResponse fromEntity(ProjectEntity entity) {
      return new ProjectResponse(
          entity.getId(),
          entity.getProjectCode(),
          entity.getName(),
          entity.getDescription(),
          entity.getStatus(),
          entity.getDepartment(),
          entity.getManagerName(),
          entity.getPriorityLevel(),
          entity.getProgressPercent(),
          entity.getTeamSize(),
          entity.getStartDate(),
          entity.getTargetEndDate(),
          entity.getCreatedAt(),
          entity.getUpdatedAt()
      );
    }
  }

  public record ProjectSummaryResponse(
      long totalProjects,
      long activeProjects,
      long completedProjects,
      long pendingApprovalProjects,
      long overdueProjects
  ) {
  }
}
