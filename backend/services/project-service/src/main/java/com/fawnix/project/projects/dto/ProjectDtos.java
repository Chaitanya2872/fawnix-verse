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
      @NotBlank @Size(max = 200) String name,
      @Size(max = 5000) String description,
      @NotNull LocalDate startDate,
      @NotNull LocalDate targetEndDate
  ) {
  }

  public record ProjectResponse(
      String id,
      String name,
      String description,
      ProjectStatus status,
      LocalDate startDate,
      LocalDate targetEndDate,
      Instant createdAt,
      Instant updatedAt
  ) {
    public static ProjectResponse fromEntity(ProjectEntity entity) {
      return new ProjectResponse(
          entity.getId(),
          entity.getName(),
          entity.getDescription(),
          entity.getStatus(),
          entity.getStartDate(),
          entity.getTargetEndDate(),
          entity.getCreatedAt(),
          entity.getUpdatedAt()
      );
    }
  }
}
