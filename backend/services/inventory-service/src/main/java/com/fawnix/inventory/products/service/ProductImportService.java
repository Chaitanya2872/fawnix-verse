package com.fawnix.inventory.products.service;

import com.fawnix.inventory.common.exception.BadRequestException;
import com.fawnix.inventory.products.dto.ProductDtos;
import com.fawnix.inventory.products.dto.ProductDtos.ProductImportError;
import com.fawnix.inventory.products.dto.ProductDtos.ProductImportPreviewResult;
import com.fawnix.inventory.products.dto.ProductDtos.ProductImportPreviewRow;
import com.fawnix.inventory.products.dto.ProductDtos.ProductImportResult;
import com.fawnix.inventory.products.entity.ProductEntity;
import com.fawnix.inventory.products.repository.ProductRepository;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ProductImportService {

  private static final String STATUS_VALID = "VALID";
  private static final String STATUS_INVALID = "INVALID";
  private static final String STATUS_DUPLICATE = "DUPLICATE";
  private static final String STATUS_DUPLICATE_IN_FILE = "DUPLICATE_IN_FILE";

  private static final String[] TEMPLATE_HEADERS = {
      "sku", "name", "category", "sub_category", "brand", "unit", "reorder_level",
      "description", "hsn_code", "notes", "price", "price_tier_1", "price_tier_2",
      "price_tier_3", "stock_qty"
  };

  private final ProductRepository productRepository;
  private final ProductService productService;

  public ProductImportService(ProductRepository productRepository, ProductService productService) {
    this.productRepository = productRepository;
    this.productService = productService;
  }

  public ProductImportPreviewResult previewImport(MultipartFile file) {
    List<Map<String, String>> rows = parseFile(file);
    List<RowEvaluation> evaluations = evaluateRows(rows);

    int valid = 0;
    int invalid = 0;
    int duplicate = 0;
    List<ProductImportPreviewRow> previewRows = new ArrayList<>();

    for (RowEvaluation evaluation : evaluations) {
      previewRows.add(new ProductImportPreviewRow(
          evaluation.rowNumber(),
          evaluation.rawRow(),
          evaluation.status(),
          evaluation.duplicateNote(),
          evaluation.errors()
      ));
      switch (evaluation.status()) {
        case STATUS_INVALID -> invalid++;
        case STATUS_DUPLICATE, STATUS_DUPLICATE_IN_FILE -> duplicate++;
        default -> valid++;
      }
    }

    return new ProductImportPreviewResult(rows.size(), valid, invalid, duplicate, previewRows);
  }

  public ProductImportResult commitImport(MultipartFile file) {
    List<Map<String, String>> rows = parseFile(file);
    List<RowEvaluation> evaluations = evaluateRows(rows);

    int created = 0;
    int updated = 0;
    int skipped = 0;
    int failed = 0;
    List<ProductImportError> errors = new ArrayList<>();

    for (RowEvaluation evaluation : evaluations) {
      if (STATUS_INVALID.equals(evaluation.status())) {
        failed++;
        errors.addAll(evaluation.errors());
        continue;
      }
      if (STATUS_DUPLICATE_IN_FILE.equals(evaluation.status())) {
        skipped++;
        errors.add(new ProductImportError(evaluation.rowNumber(), null, evaluation.duplicateNote()));
        continue;
      }

      try {
        boolean createdRow = persistRow(evaluation.parsed());
        if (createdRow) {
          created++;
        } else {
          updated++;
        }
      } catch (Exception ex) {
        failed++;
        errors.add(new ProductImportError(evaluation.rowNumber(), null, ex.getMessage()));
      }
    }

    return new ProductImportResult(rows.size(), created, updated, skipped, failed, errors);
  }

  public byte[] generateTemplate() {
    try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      CellStyle headerStyle = workbook.createCellStyle();
      Font headerFont = workbook.createFont();
      headerFont.setBold(true);
      headerStyle.setFont(headerFont);

      Sheet productSheet = workbook.createSheet("Products");
      Row header = productSheet.createRow(0);
      for (int i = 0; i < TEMPLATE_HEADERS.length; i++) {
        Cell cell = header.createCell(i);
        cell.setCellValue(TEMPLATE_HEADERS[i]);
        cell.setCellStyle(headerStyle);
        productSheet.setColumnWidth(i, 20 * 256);
      }

      String[] sampleValues = {
          "SKU-1001", "Smart Touch Panel - 4 Gang", "Smart Switches", "Touch Panel", "Fawnix",
          "pcs", "10", "4-gang touch panel with app control", "8536.69", "Preferred bulk supplier",
          "1499.00", "1399.00", "1299.00", "1199.00", "50"
      };
      Row sample = productSheet.createRow(1);
      for (int i = 0; i < sampleValues.length; i++) {
        sample.createCell(i).setCellValue(sampleValues[i]);
      }

      Sheet instructionsSheet = workbook.createSheet("Instructions");
      String[][] instructionRows = {
          {"Column", "Required", "Format / Allowed Values", "Example"},
          {"sku", "Yes", "Text, max 30 characters; unique identifier", "SKU-1001"},
          {"name", "Yes", "Text, product name", "Smart Touch Panel - 4 Gang"},
          {"category", "Yes", "Free text", "Smart Switches"},
          {"sub_category", "No", "Free text", "Touch Panel"},
          {"brand", "No", "Free text", "Fawnix"},
          {"unit", "No", "Free text (defaults to \"pcs\")", "pcs"},
          {"reorder_level", "No", "Non-negative number", "10"},
          {"description", "No", "Free text", "4-gang touch panel with app control"},
          {"hsn_code", "No", "Free text", "8536.69"},
          {"notes", "No", "Free text", "Preferred bulk supplier"},
          {"price", "No", "Non-negative number (defaults to 0)", "1499.00"},
          {"price_tier_1", "No", "Non-negative number", "1399.00"},
          {"price_tier_2", "No", "Non-negative number", "1299.00"},
          {"price_tier_3", "No", "Non-negative number", "1199.00"},
          {"stock_qty", "No", "Non-negative number (defaults to 0)", "50"},
          {"", "", "", ""},
          {"Notes", "", "", ""},
          {"Accepted files: .csv, .xls, .xlsx", "", "", ""},
          {"Existing items are matched by SKU and will be updated (not duplicated). Blank cells on an update leave the existing value unchanged.", "", "", ""},
          {"Column headers are case-insensitive; spaces are treated the same as underscores.", "", "", ""},
          {"Item status (In Stock / Low Stock / Out of Stock) and warehouse storage mappings are not imported here; set them from the item editor after import.", "", "", ""},
      };
      for (int r = 0; r < instructionRows.length; r++) {
        Row row = instructionsSheet.createRow(r);
        for (int c = 0; c < instructionRows[r].length; c++) {
          Cell cell = row.createCell(c);
          cell.setCellValue(instructionRows[r][c]);
          if (r == 0) {
            cell.setCellStyle(headerStyle);
          }
        }
      }
      for (int i = 0; i < 4; i++) {
        instructionsSheet.setColumnWidth(i, 34 * 256);
      }

      workbook.write(out);
      return out.toByteArray();
    } catch (IOException ex) {
      throw new BadRequestException("Failed to generate product import template.");
    }
  }

  private boolean persistRow(ParsedProductRow parsed) {
    Optional<ProductEntity> existing = productRepository.findBySku(parsed.sku());

    if (existing.isPresent()) {
      ProductDtos.UpdateProductRequest updateRequest = new ProductDtos.UpdateProductRequest(
          null,
          parsed.name(),
          parsed.category(),
          parsed.subCategory(),
          parsed.brand(),
          parsed.unit(),
          parsed.reorderLevel(),
          parsed.description(),
          parsed.hsnCode(),
          parsed.notes(),
          parsed.price(),
          parsed.priceTier1(),
          parsed.priceTier2(),
          parsed.priceTier3(),
          parsed.stockQty(),
          null
      );
      productService.updateProduct(existing.get().getId(), updateRequest);
      return false;
    }

    ProductDtos.CreateProductRequest createRequest = new ProductDtos.CreateProductRequest(
        parsed.sku(),
        parsed.name(),
        parsed.category(),
        parsed.subCategory(),
        parsed.brand(),
        parsed.unit(),
        parsed.reorderLevel(),
        parsed.description(),
        parsed.hsnCode(),
        parsed.notes(),
        parsed.price(),
        parsed.priceTier1(),
        parsed.priceTier2(),
        parsed.priceTier3(),
        parsed.stockQty(),
        null
    );
    productService.createProduct(createRequest);
    return true;
  }

  private List<RowEvaluation> evaluateRows(List<Map<String, String>> rows) {
    Map<String, Integer> seenSkuRows = new LinkedHashMap<>();
    List<RowEvaluation> evaluations = new ArrayList<>();

    for (int i = 0; i < rows.size(); i++) {
      Map<String, String> row = rows.get(i);
      int rowNumber = i + 2; // header row + 1-based
      ParsedProductRow parsed = parseRow(row, rowNumber);
      List<ProductImportError> errors = new ArrayList<>(parsed.errors());

      String status;
      String duplicateNote = null;
      if (!errors.isEmpty()) {
        status = STATUS_INVALID;
      } else {
        DuplicateCheck duplicateCheck = checkDuplicate(parsed, rowNumber, seenSkuRows);
        status = duplicateCheck.status();
        duplicateNote = duplicateCheck.note();
      }

      evaluations.add(new RowEvaluation(rowNumber, row, parsed, status, duplicateNote, errors));
    }

    return evaluations;
  }

  private DuplicateCheck checkDuplicate(ParsedProductRow parsed, int rowNumber, Map<String, Integer> seenSkuRows) {
    Integer firstRow = seenSkuRows.putIfAbsent(parsed.sku(), rowNumber);
    if (firstRow != null) {
      return new DuplicateCheck(STATUS_DUPLICATE_IN_FILE, "Duplicate of row " + firstRow + " in this file (matching SKU); this row will be skipped.");
    }
    if (productRepository.findBySku(parsed.sku()).isPresent()) {
      return new DuplicateCheck(STATUS_DUPLICATE, "Matches an existing item by SKU; the existing item will be updated.");
    }
    return new DuplicateCheck(STATUS_VALID, null);
  }

  private ParsedProductRow parseRow(Map<String, String> row, int rowNumber) {
    List<ProductImportError> errors = new ArrayList<>();

    String sku = trimToNull(value(row, "sku", "product_code", "code"));
    if (sku == null) {
      errors.add(new ProductImportError(rowNumber, "sku", "SKU is required."));
    } else if (sku.length() > 30) {
      errors.add(new ProductImportError(rowNumber, "sku", "SKU cannot exceed 30 characters."));
    }

    String name = trimToNull(value(row, "name", "product_name", "item_name"));
    if (name == null) {
      errors.add(new ProductImportError(rowNumber, "name", "Product name is required."));
    }

    String category = trimToNull(value(row, "category"));
    if (category == null) {
      errors.add(new ProductImportError(rowNumber, "category", "Category is required."));
    }

    String subCategory = trimToNull(value(row, "sub_category", "subcategory"));
    String brand = trimToNull(value(row, "brand"));
    String unit = trimToNull(value(row, "unit"));
    String description = trimToNull(value(row, "description"));
    String hsnCode = trimToNull(value(row, "hsn_code", "hsn"));
    String notes = trimToNull(value(row, "notes", "remark", "remarks"));

    BigDecimal reorderLevel = parseDecimalField(row, rowNumber, "reorder_level", "Reorder level", errors, "reorder_level", "reorderlevel");
    BigDecimal price = parseDecimalField(row, rowNumber, "price", "Price", errors, "price");
    BigDecimal priceTier1 = parseDecimalField(row, rowNumber, "price_tier_1", "Price 1", errors, "price_tier_1", "price1");
    BigDecimal priceTier2 = parseDecimalField(row, rowNumber, "price_tier_2", "Price 2", errors, "price_tier_2", "price2");
    BigDecimal priceTier3 = parseDecimalField(row, rowNumber, "price_tier_3", "Price 3", errors, "price_tier_3", "price3");
    BigDecimal stockQty = parseDecimalField(row, rowNumber, "stock_qty", "Stock quantity", errors, "stock_qty", "quantity", "qty");

    return new ParsedProductRow(
        sku, name, category, subCategory, brand, unit, reorderLevel,
        description, hsnCode, notes, price, priceTier1, priceTier2, priceTier3, stockQty, errors
    );
  }

  private BigDecimal parseDecimalField(
      Map<String, String> row,
      int rowNumber,
      String field,
      String label,
      List<ProductImportError> errors,
      String... keys
  ) {
    String raw = trimToNull(value(row, keys));
    if (raw == null) {
      return null;
    }
    try {
      BigDecimal parsed = new BigDecimal(raw.replace(",", ""));
      if (parsed.compareTo(BigDecimal.ZERO) < 0) {
        errors.add(new ProductImportError(rowNumber, field, label + " cannot be negative."));
        return null;
      }
      return parsed;
    } catch (NumberFormatException ex) {
      errors.add(new ProductImportError(rowNumber, field, "Invalid " + label.toLowerCase(Locale.ROOT) + "."));
      return null;
    }
  }

  private List<Map<String, String>> parseFile(MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new BadRequestException("Import file is required.");
    }

    String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "";
    String lowerName = filename.toLowerCase(Locale.ROOT);

    try (InputStream inputStream = file.getInputStream()) {
      if (lowerName.endsWith(".csv")) {
        return parseCsv(inputStream);
      }
      if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
        return parseExcel(inputStream);
      }
      throw new BadRequestException("Unsupported file type. Please upload CSV, XLS, or XLSX.");
    } catch (BadRequestException ex) {
      throw ex;
    } catch (Exception ex) {
      throw new BadRequestException("Failed to read import file.");
    }
  }

  private List<Map<String, String>> parseCsv(InputStream inputStream) throws Exception {
    try (CSVParser parser = CSVFormat.DEFAULT
        .withFirstRecordAsHeader()
        .withIgnoreEmptyLines()
        .withTrim()
        .parse(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
      Map<String, Integer> headers = parser.getHeaderMap();
      List<Map<String, String>> rows = new ArrayList<>();
      for (CSVRecord record : parser) {
        Map<String, String> row = new HashMap<>();
        for (String header : headers.keySet()) {
          row.put(normalizeHeader(header), record.get(header));
        }
        rows.add(row);
      }
      return rows;
    }
  }

  private List<Map<String, String>> parseExcel(InputStream inputStream) throws Exception {
    List<Map<String, String>> rows = new ArrayList<>();
    DataFormatter formatter = new DataFormatter();

    try (Workbook workbook = WorkbookFactory.create(inputStream)) {
      Sheet sheet = workbook.getSheetAt(0);
      if (sheet == null) {
        return rows;
      }

      Row headerRow = sheet.getRow(sheet.getFirstRowNum());
      if (headerRow == null) {
        return rows;
      }

      Map<Integer, String> headers = new HashMap<>();
      for (Cell cell : headerRow) {
        String header = formatter.formatCellValue(cell);
        if (StringUtils.hasText(header)) {
          headers.put(cell.getColumnIndex(), normalizeHeader(header));
        }
      }

      int lastRow = sheet.getLastRowNum();
      for (int i = headerRow.getRowNum() + 1; i <= lastRow; i++) {
        Row row = sheet.getRow(i);
        if (row == null) {
          continue;
        }
        Map<String, String> rowData = new HashMap<>();
        boolean hasValue = false;
        for (Map.Entry<Integer, String> entry : headers.entrySet()) {
          Cell cell = row.getCell(entry.getKey());
          String value = formatCellValue(cell, formatter);
          if (StringUtils.hasText(value)) {
            hasValue = true;
          }
          rowData.put(entry.getValue(), value);
        }
        if (hasValue) {
          rows.add(rowData);
        }
      }
    }

    return rows;
  }

  private String formatCellValue(Cell cell, DataFormatter formatter) {
    if (cell == null) {
      return null;
    }
    if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
      return cell.getLocalDateTimeCellValue() != null ? cell.getLocalDateTimeCellValue().toString() : null;
    }
    if (cell.getCellType() == CellType.FORMULA) {
      CellType cached = cell.getCachedFormulaResultType();
      if (cached == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
        return cell.getLocalDateTimeCellValue() != null ? cell.getLocalDateTimeCellValue().toString() : null;
      }
    }
    String value = formatter.formatCellValue(cell);
    return StringUtils.hasText(value) ? value.trim() : null;
  }

  private String normalizeHeader(String header) {
    if (header == null) {
      return "";
    }
    String normalized = header.trim().toLowerCase(Locale.ROOT);
    normalized = normalized.replace(" ", "_");
    normalized = normalized.replaceAll("[^a-z0-9_]", "");
    return normalized;
  }

  private String value(Map<String, String> row, String... keys) {
    for (String key : keys) {
      String normalized = normalizeHeader(key);
      String value = row.get(normalized);
      if (StringUtils.hasText(value)) {
        return value.trim();
      }
    }
    return null;
  }

  private String trimToNull(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    return value.trim();
  }

  private record ParsedProductRow(
      String sku,
      String name,
      String category,
      String subCategory,
      String brand,
      String unit,
      BigDecimal reorderLevel,
      String description,
      String hsnCode,
      String notes,
      BigDecimal price,
      BigDecimal priceTier1,
      BigDecimal priceTier2,
      BigDecimal priceTier3,
      BigDecimal stockQty,
      List<ProductImportError> errors
  ) {
  }

  private record RowEvaluation(
      int rowNumber,
      Map<String, String> rawRow,
      ParsedProductRow parsed,
      String status,
      String duplicateNote,
      List<ProductImportError> errors
  ) {
  }

  private record DuplicateCheck(String status, String note) {
  }
}
