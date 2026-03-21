package com.fawnix.crm.contacts.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.List;

public final class ContactDtos {

  private ContactDtos() {
  }

  public record CreateContactRequest(
      @NotBlank String name,
      @Email String email,
      String phone,
      String title,
      String source,
      String accountId
  ) {
  }

  public record UpdateContactRequest(
      String name,
      @Email String email,
      String phone,
      String title,
      String source,
      String accountId
  ) {
  }

  public record ContactAccountSummary(
      String id,
      String name
  ) {
  }

  public record ContactResponse(
      String id,
      String name,
      String email,
      String phone,
      String title,
      String source,
      ContactAccountSummary account,
      Instant createdAt,
      Instant updatedAt
  ) {
  }

  public record PaginatedContactResponse(
      List<ContactResponse> data,
      long total,
      int page,
      int pageSize,
      int totalPages
  ) {
  }
}
