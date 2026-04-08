package com.fawnix.inventory.products.controller;

import com.fawnix.inventory.products.dto.ProductDtos;
import com.fawnix.inventory.products.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/inventory")
public class ProductController {

  private final ProductService productService;

  public ProductController(ProductService productService) {
    this.productService = productService;
  }

  @GetMapping
  public ProductDtos.ProductListResponse listProducts(
      @RequestParam(required = false) String search,
      @RequestParam(required = false) String category,
      @RequestParam(required = false) String status,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "20") int pageSize
  ) {
    return productService.getProducts(search, category, status, page, pageSize);
  }

  @GetMapping("/{id}")
  public ProductDtos.ProductResponse getProduct(@PathVariable String id) {
    return productService.getProduct(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ProductDtos.ProductResponse createProduct(@Valid @RequestBody ProductDtos.CreateProductRequest request) {
    return productService.createProduct(request);
  }

  @PatchMapping("/{id}")
  public ProductDtos.ProductResponse updateProduct(
      @PathVariable String id,
      @RequestBody ProductDtos.UpdateProductRequest request
  ) {
    return productService.updateProduct(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteProduct(@PathVariable String id) {
    productService.deleteProduct(id);
  }
}
