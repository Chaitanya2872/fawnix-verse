package com.fawnix.inventory.products.controller;

import com.fawnix.inventory.products.dto.ProductDtos;
import com.fawnix.inventory.products.dto.InventoryOverviewDtos;
import com.fawnix.inventory.products.service.ProductImportService;
import com.fawnix.inventory.products.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/inventory")
public class ProductController {

  private final ProductService productService;
  private final ProductImportService productImportService;

  public ProductController(ProductService productService, ProductImportService productImportService) {
    this.productService = productService;
    this.productImportService = productImportService;
  }

  @GetMapping
  public ProductDtos.ProductListResponse listProducts(
      @RequestParam(required = false) String search,
      @RequestParam(required = false) String category,
      @RequestParam(required = false) String brand,
      @RequestParam(required = false) String status,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "20") int pageSize
  ) {
    return productService.getProducts(search, category, brand, status, page, pageSize);
  }

  @GetMapping("/overview")
  public InventoryOverviewDtos.InventoryOverviewResponse getOverview() {
    return productService.getOverview();
  }

  @GetMapping("/{id}")
  public ProductDtos.ProductResponse getProduct(@PathVariable String id) {
    return productService.getProduct(id);
  }

  @GetMapping("/import/template")
  public ResponseEntity<ByteArrayResource> downloadProductImportTemplate() {
    byte[] template = productImportService.generateTemplate();
    return ResponseEntity.ok()
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename("product_import_template.xlsx").build().toString()
        )
        .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .contentLength(template.length)
        .body(new ByteArrayResource(template));
  }

  @PostMapping(path = "/import/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ProductDtos.ProductImportPreviewResult previewProductImport(@RequestParam("file") MultipartFile file) {
    return productImportService.previewImport(file);
  }

  @PostMapping(path = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ProductDtos.ProductImportResult importProducts(@RequestParam("file") MultipartFile file) {
    return productImportService.commitImport(file);
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
