package com.fawnix.inventory.products.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fawnix.inventory.products.dto.ProductDtos;
import com.fawnix.inventory.products.dto.ProductDtos.ProductImportPreviewResult;
import com.fawnix.inventory.products.dto.ProductDtos.ProductImportResult;
import com.fawnix.inventory.products.entity.ProductEntity;
import com.fawnix.inventory.products.repository.ProductRepository;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class ProductImportServiceTest {

  @Mock
  private ProductRepository productRepository;

  @Mock
  private ProductService productService;

  private ProductImportService productImportService;

  @BeforeEach
  void setUp() {
    productImportService = new ProductImportService(productRepository, productService);
  }

  private MockMultipartFile csvFile(String content) {
    return new MockMultipartFile(
        "file",
        "products.csv",
        "text/csv",
        content.getBytes(StandardCharsets.UTF_8)
    );
  }

  @Test
  void commitImport_createsNewProductForValidRow() {
    when(productRepository.findBySku("SKU-100")).thenReturn(Optional.empty());
    when(productService.createProduct(any())).thenReturn(null);

    MockMultipartFile file = csvFile(
        "sku,name,category,price,stock_qty\n"
            + "SKU-100,Smart Switch,Smart Switches,499.00,20\n"
    );

    ProductImportResult result = productImportService.commitImport(file);

    assertThat(result.total()).isEqualTo(1);
    assertThat(result.created()).isEqualTo(1);
    assertThat(result.updated()).isZero();
    assertThat(result.failed()).isZero();
    assertThat(result.skipped()).isZero();

    verify(productService).createProduct(any(ProductDtos.CreateProductRequest.class));
  }

  @Test
  void commitImport_updatesExistingProductMatchedBySku() {
    ProductEntity existing = new ProductEntity();
    existing.setId("product-1");
    existing.setSku("SKU-200");
    existing.setName("Old Name");
    when(productRepository.findBySku("SKU-200")).thenReturn(Optional.of(existing));

    MockMultipartFile file = csvFile(
        "sku,name,category\n"
            + "SKU-200,Updated Name,Smart Switches\n"
    );

    ProductImportResult result = productImportService.commitImport(file);

    assertThat(result.created()).isZero();
    assertThat(result.updated()).isEqualTo(1);
    verify(productService).updateProduct(eq("product-1"), any(ProductDtos.UpdateProductRequest.class));
    verify(productService, never()).createProduct(any());
  }

  @Test
  void commitImport_marksNegativePriceAsFailedWithoutPersisting() {
    MockMultipartFile file = csvFile(
        "sku,name,category,price\n"
            + "SKU-300,Smart Switch,Smart Switches,-5\n"
    );

    ProductImportResult result = productImportService.commitImport(file);

    assertThat(result.failed()).isEqualTo(1);
    assertThat(result.created()).isZero();
    assertThat(result.errors()).hasSize(1);
    verify(productService, never()).createProduct(any());
  }

  @Test
  void commitImport_skipsSecondRowWithDuplicateSkuWithinFile() {
    when(productRepository.findBySku("SKU-400")).thenReturn(Optional.empty());
    when(productService.createProduct(any())).thenReturn(null);

    MockMultipartFile file = csvFile(
        "sku,name,category\n"
            + "SKU-400,Smart Switch,Smart Switches\n"
            + "SKU-400,Smart Switch Duplicate,Smart Switches\n"
    );

    ProductImportResult result = productImportService.commitImport(file);

    assertThat(result.total()).isEqualTo(2);
    assertThat(result.created()).isEqualTo(1);
    assertThat(result.skipped()).isEqualTo(1);
    verify(productService, times(1)).createProduct(any());
  }

  @Test
  void previewImport_reportsCountsWithoutPersisting() {
    when(productRepository.findBySku("SKU-500")).thenReturn(Optional.empty());

    MockMultipartFile file = csvFile(
        "sku,name,category\n"
            + "SKU-500,Smart Switch,Smart Switches\n"
            + ",Missing SKU Item,Smart Switches\n"
    );

    ProductImportPreviewResult result = productImportService.previewImport(file);

    assertThat(result.total()).isEqualTo(2);
    assertThat(result.valid()).isEqualTo(1);
    assertThat(result.invalid()).isEqualTo(1);
    verify(productService, never()).createProduct(any());
    verify(productService, never()).updateProduct(any(), any());
  }

  @Test
  void generateTemplate_returnsReadableWorkbookWithExpectedSheets() throws Exception {
    byte[] template = productImportService.generateTemplate();

    assertThat(template).isNotEmpty();

    try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(template))) {
      assertThat(workbook.getNumberOfSheets()).isEqualTo(2);
      assertThat(workbook.getSheetName(0)).isEqualTo("Products");
      assertThat(workbook.getSheetName(1)).isEqualTo("Instructions");
      assertThat(workbook.getSheet("Products").getRow(0).getCell(0).getStringCellValue()).isEqualTo("sku");
      assertThat(workbook.getSheet("Products").getRow(1).getCell(0).getStringCellValue()).isEqualTo("SKU-1001");
      assertThat(workbook.getSheet("Instructions").getRow(0).getCell(0).getStringCellValue()).isEqualTo("Column");
    }
  }
}
