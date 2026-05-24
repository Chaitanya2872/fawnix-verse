package com.fawnix.inventory.reservations.service;

import com.fawnix.inventory.common.exception.BadRequestException;
import com.fawnix.inventory.common.exception.ResourceNotFoundException;
import com.fawnix.inventory.products.entity.ProductEntity;
import com.fawnix.inventory.products.repository.ProductRepository;
import com.fawnix.inventory.products.service.ProductService;
import com.fawnix.inventory.reservations.dto.InventoryReservationDtos;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryReservationService {

  private final ProductRepository productRepository;
  private final ProductService productService;

  public InventoryReservationService(ProductRepository productRepository, ProductService productService) {
    this.productRepository = productRepository;
    this.productService = productService;
  }

  @Transactional
  public InventoryReservationDtos.ReserveInventoryResponse reserve(
      InventoryReservationDtos.ReserveInventoryRequest request
  ) {
    List<InventoryReservationDtos.ReserveInventoryLineResponse> responses = new ArrayList<>();

    for (InventoryReservationDtos.ReserveInventoryLineRequest item : request.items()) {
      ProductEntity product = productRepository.findById(item.productId().trim())
          .orElseThrow(() -> new ResourceNotFoundException("Product not found."));

      BigDecimal available = productService.getAvailableStock(product);
      if (available.compareTo(item.quantity()) < 0) {
        throw new BadRequestException("Insufficient stock for " + product.getName() + ".");
      }

      productService.reserveStock(product, item.quantity());

      responses.add(new InventoryReservationDtos.ReserveInventoryLineResponse(
          product.getId(),
          product.getSku(),
          product.getName(),
          item.quantity(),
          available,
          item.quantity()
      ));
    }

    return new InventoryReservationDtos.ReserveInventoryResponse(
        request.orderId(),
        true,
        "Inventory reserved successfully.",
        responses
    );
  }
}
