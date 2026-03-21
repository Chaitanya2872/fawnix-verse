package com.fawnix.crm.contacts.controller;

import com.fawnix.crm.contacts.dto.ContactDtos;
import com.fawnix.crm.contacts.service.ContactService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/contacts")
public class ContactController {

  private final ContactService contactService;

  public ContactController(ContactService contactService) {
    this.contactService = contactService;
  }

  @GetMapping
  @PreAuthorize("isAuthenticated()")
  public ContactDtos.PaginatedContactResponse getContacts(
      @RequestParam(defaultValue = "") String search,
      @RequestParam(defaultValue = "") String accountId,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "10") int pageSize
  ) {
    return contactService.getContacts(search, accountId, page, pageSize);
  }

  @GetMapping("/{id}")
  @PreAuthorize("isAuthenticated()")
  public ContactDtos.ContactResponse getContact(@PathVariable String id) {
    return contactService.getContact(id);
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public ContactDtos.ContactResponse createContact(
      @Valid @RequestBody ContactDtos.CreateContactRequest request
  ) {
    return contactService.createContact(request);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','SALES_REP')")
  public ContactDtos.ContactResponse updateContact(
      @PathVariable String id,
      @Valid @RequestBody ContactDtos.UpdateContactRequest request
  ) {
    return contactService.updateContact(id, request);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER')")
  public ResponseEntity<Void> deleteContact(@PathVariable String id) {
    contactService.deleteContact(id);
    return ResponseEntity.noContent().build();
  }
}
