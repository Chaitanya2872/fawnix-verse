package com.fawnix.inventory.warehouses.service;

import com.fawnix.inventory.common.exception.BadRequestException;
import com.fawnix.inventory.common.exception.ResourceNotFoundException;
import com.fawnix.inventory.warehouses.dto.WarehouseDtos;
import com.fawnix.inventory.warehouses.entity.WarehouseEntity;
import com.fawnix.inventory.warehouses.repository.WarehouseRepository;
import com.fawnix.inventory.warehouses.specification.WarehouseSpecifications;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WarehouseService {

  private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

  private final WarehouseRepository warehouseRepository;

  public WarehouseService(WarehouseRepository warehouseRepository) {
    this.warehouseRepository = warehouseRepository;
  }

  @Transactional(readOnly = true)
  public WarehouseDtos.WarehouseListResponse getWarehouses(
      String search,
      String status,
      int page,
      int pageSize
  ) {
    Boolean active = parseStatus(status);
    Specification<WarehouseEntity> specification = WarehouseSpecifications.withFilters(search, active);

    int resolvedPage = Math.max(page, 1);
    int resolvedPageSize = Math.max(pageSize, 1);
    Page<WarehouseEntity> result = warehouseRepository.findAll(
        specification,
        PageRequest.of(
            resolvedPage - 1,
            resolvedPageSize,
            Sort.by(Sort.Direction.DESC, "active")
                .and(Sort.by(Sort.Direction.ASC, "name"))
        )
    );

    List<WarehouseDtos.WarehouseResponse> data = result.getContent().stream()
        .map(this::toResponse)
        .toList();

    return new WarehouseDtos.WarehouseListResponse(
        data,
        result.getTotalElements(),
        resolvedPage,
        resolvedPageSize,
        result.getTotalPages()
    );
  }

  @Transactional(readOnly = true)
  public WarehouseDtos.WarehouseResponse getWarehouse(String id) {
    return toResponse(requireWarehouse(id));
  }

  @Transactional
  public WarehouseDtos.WarehouseResponse createWarehouse(WarehouseDtos.CreateWarehouseRequest request) {
    String code = normalizeCode(request.code());
    if (warehouseRepository.existsByCodeIgnoreCase(code)) {
      throw new BadRequestException("Warehouse code already exists.");
    }

    Instant now = Instant.now();
    WarehouseEntity warehouse = new WarehouseEntity();
    warehouse.setId(UUID.randomUUID().toString());
    warehouse.setCode(code);
    warehouse.setName(normalizeRequired(request.name(), "Warehouse name is required."));
    warehouse.setType(trimToNull(request.type()));
    warehouse.setAddressLine1(trimToNull(request.addressLine1()));
    warehouse.setAddressLine2(trimToNull(request.addressLine2()));
    warehouse.setCity(normalizeRequired(request.city(), "City is required."));
    warehouse.setState(trimToNull(request.state()));
    warehouse.setPostalCode(trimToNull(request.postalCode()));
    warehouse.setCountry(normalizeCountry(request.country()));
    warehouse.setManagerName(trimToNull(request.managerName()));
    warehouse.setContactPhone(trimToNull(request.contactPhone()));
    warehouse.setContactEmail(trimToNull(request.contactEmail()));
    warehouse.setCapacity(scale(defaultCapacity(request.capacity())));
    warehouse.setActive(request.active() == null || request.active());
    warehouse.setNotes(trimToNull(request.notes()));
    warehouse.setCreatedAt(now);
    warehouse.setUpdatedAt(now);

    return toResponse(warehouseRepository.save(warehouse));
  }

  @Transactional
  public WarehouseDtos.WarehouseResponse updateWarehouse(String id, WarehouseDtos.UpdateWarehouseRequest request) {
    WarehouseEntity warehouse = requireWarehouse(id);

    if (request.code() != null) {
      String code = normalizeCode(request.code());
      if (!code.equalsIgnoreCase(warehouse.getCode()) && warehouseRepository.existsByCodeIgnoreCase(code)) {
        throw new BadRequestException("Warehouse code already exists.");
      }
      warehouse.setCode(code);
    }
    if (request.name() != null) {
      warehouse.setName(normalizeRequired(request.name(), "Warehouse name is required."));
    }
    if (request.type() != null) {
      warehouse.setType(trimToNull(request.type()));
    }
    if (request.addressLine1() != null) {
      warehouse.setAddressLine1(trimToNull(request.addressLine1()));
    }
    if (request.addressLine2() != null) {
      warehouse.setAddressLine2(trimToNull(request.addressLine2()));
    }
    if (request.city() != null) {
      warehouse.setCity(normalizeRequired(request.city(), "City is required."));
    }
    if (request.state() != null) {
      warehouse.setState(trimToNull(request.state()));
    }
    if (request.postalCode() != null) {
      warehouse.setPostalCode(trimToNull(request.postalCode()));
    }
    if (request.country() != null) {
      warehouse.setCountry(normalizeCountry(request.country()));
    }
    if (request.managerName() != null) {
      warehouse.setManagerName(trimToNull(request.managerName()));
    }
    if (request.contactPhone() != null) {
      warehouse.setContactPhone(trimToNull(request.contactPhone()));
    }
    if (request.contactEmail() != null) {
      warehouse.setContactEmail(trimToNull(request.contactEmail()));
    }
    if (request.capacity() != null) {
      warehouse.setCapacity(scale(request.capacity()));
    }
    if (request.active() != null) {
      warehouse.setActive(request.active());
    }
    if (request.notes() != null) {
      warehouse.setNotes(trimToNull(request.notes()));
    }

    warehouse.setUpdatedAt(Instant.now());
    return toResponse(warehouseRepository.save(warehouse));
  }

  @Transactional
  public void deleteWarehouse(String id) {
    WarehouseEntity warehouse = requireWarehouse(id);
    warehouseRepository.delete(warehouse);
  }

  private WarehouseDtos.WarehouseResponse toResponse(WarehouseEntity warehouse) {
    return new WarehouseDtos.WarehouseResponse(
        warehouse.getId(),
        warehouse.getCode(),
        warehouse.getName(),
        warehouse.getType(),
        warehouse.getAddressLine1(),
        warehouse.getAddressLine2(),
        warehouse.getCity(),
        warehouse.getState(),
        warehouse.getPostalCode(),
        warehouse.getCountry(),
        warehouse.getManagerName(),
        warehouse.getContactPhone(),
        warehouse.getContactEmail(),
        warehouse.getCapacity(),
        warehouse.isActive(),
        warehouse.getNotes(),
        warehouse.getCreatedAt(),
        warehouse.getUpdatedAt()
    );
  }

  private WarehouseEntity requireWarehouse(String id) {
    return warehouseRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found."));
  }

  private Boolean parseStatus(String status) {
    if (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)) {
      return null;
    }
    if ("ACTIVE".equalsIgnoreCase(status)) {
      return true;
    }
    if ("INACTIVE".equalsIgnoreCase(status)) {
      return false;
    }
    throw new BadRequestException("Invalid warehouse status.");
  }

  private String normalizeCode(String value) {
    String normalized = normalizeRequired(value, "Warehouse code is required.").toUpperCase(Locale.ROOT);
    if (normalized.length() > 30) {
      throw new BadRequestException("Warehouse code cannot exceed 30 characters.");
    }
    return normalized;
  }

  private String normalizeCountry(String value) {
    String country = trimToNull(value);
    return country == null ? "India" : country;
  }

  private String normalizeRequired(String value, String message) {
    String normalized = trimToNull(value);
    if (normalized == null) {
      throw new BadRequestException(message);
    }
    return normalized;
  }

  private BigDecimal defaultCapacity(BigDecimal value) {
    return value == null ? ZERO : value;
  }

  private BigDecimal scale(BigDecimal value) {
    return value.setScale(2, RoundingMode.HALF_UP);
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
