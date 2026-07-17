package com.fawnix.procurement.service;

import com.fawnix.procurement.common.exception.BadRequestException;
import com.fawnix.procurement.domain.Vendor;
import com.fawnix.procurement.domain.VendorStatus;
import com.fawnix.procurement.dto.ProcurementDtos;
import com.fawnix.procurement.dto.ProcurementDtos.VendorImportError;
import com.fawnix.procurement.dto.ProcurementDtos.VendorImportPreviewResult;
import com.fawnix.procurement.dto.ProcurementDtos.VendorImportPreviewRow;
import com.fawnix.procurement.dto.ProcurementDtos.VendorImportResult;
import com.fawnix.procurement.repository.VendorRepository;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
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
public class VendorImportService {

  private static final String STATUS_VALID = "VALID";
  private static final String STATUS_INVALID = "INVALID";
  private static final String STATUS_DUPLICATE = "DUPLICATE";
  private static final String STATUS_DUPLICATE_IN_FILE = "DUPLICATE_IN_FILE";

  private static final Pattern GST_PATTERN = Pattern.compile("^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$");
  private static final Pattern PAN_PATTERN = Pattern.compile("^[A-Z]{5}[0-9]{4}[A-Z]$");
  private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

  private static final String[] TEMPLATE_HEADERS = {
      "display_name", "vendor_type", "salutation", "first_name", "last_name", "company_name",
      "email", "phone", "work_phone", "mobile", "vendor_language", "gst_number", "pan_number",
      "website", "status", "remarks"
  };

  private final VendorRepository vendorRepository;
  private final VendorService vendorService;

  public VendorImportService(VendorRepository vendorRepository, VendorService vendorService) {
    this.vendorRepository = vendorRepository;
    this.vendorService = vendorService;
  }

  public VendorImportPreviewResult previewImport(MultipartFile file) {
    List<Map<String, String>> rows = parseFile(file);
    List<RowEvaluation> evaluations = evaluateRows(rows);

    int valid = 0;
    int invalid = 0;
    int duplicate = 0;
    List<VendorImportPreviewRow> previewRows = new ArrayList<>();

    for (RowEvaluation evaluation : evaluations) {
      previewRows.add(new VendorImportPreviewRow(
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

    return new VendorImportPreviewResult(rows.size(), valid, invalid, duplicate, previewRows);
  }

  public VendorImportResult commitImport(MultipartFile file) {
    List<Map<String, String>> rows = parseFile(file);
    List<RowEvaluation> evaluations = evaluateRows(rows);

    int created = 0;
    int updated = 0;
    int skipped = 0;
    int failed = 0;
    List<VendorImportError> errors = new ArrayList<>();

    for (RowEvaluation evaluation : evaluations) {
      if (STATUS_INVALID.equals(evaluation.status())) {
        failed++;
        errors.addAll(evaluation.errors());
        continue;
      }
      if (STATUS_DUPLICATE_IN_FILE.equals(evaluation.status())) {
        skipped++;
        errors.add(new VendorImportError(evaluation.rowNumber(), null, evaluation.duplicateNote()));
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
        errors.add(new VendorImportError(evaluation.rowNumber(), null, ex.getMessage()));
      }
    }

    return new VendorImportResult(rows.size(), created, updated, skipped, failed, errors);
  }

  public byte[] generateTemplate() {
    try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      CellStyle headerStyle = workbook.createCellStyle();
      Font headerFont = workbook.createFont();
      headerFont.setBold(true);
      headerStyle.setFont(headerFont);

      Sheet vendorSheet = workbook.createSheet("Vendors");
      Row header = vendorSheet.createRow(0);
      for (int i = 0; i < TEMPLATE_HEADERS.length; i++) {
        Cell cell = header.createCell(i);
        cell.setCellValue(TEMPLATE_HEADERS[i]);
        cell.setCellStyle(headerStyle);
        vendorSheet.setColumnWidth(i, 22 * 256);
      }

      String[] sampleValues = {
          "Acme Supplies Pvt Ltd", "Manufacturer", "Mr.", "Raj", "Kumar", "Acme Supplies Pvt Ltd",
          "raj.kumar@acmesupplies.com", "022-40001234", "022-40005678", "9876543210", "English",
          "27ABCDE1234F1Z5", "ABCDE1234F", "https://acmesupplies.com", "ACTIVE", "Preferred packaging vendor"
      };
      Row sample = vendorSheet.createRow(1);
      for (int i = 0; i < sampleValues.length; i++) {
        sample.createCell(i).setCellValue(sampleValues[i]);
      }

      Sheet instructionsSheet = workbook.createSheet("Instructions");
      String[][] instructionRows = {
          {"Column", "Required", "Format / Allowed Values", "Example"},
          {"display_name", "Yes", "Text, max 160 characters", "Acme Supplies Pvt Ltd"},
          {"vendor_type", "No", "Free text, max 80 characters", "Manufacturer"},
          {"salutation", "No", "Free text, max 20 characters", "Mr."},
          {"first_name", "No", "Free text, max 80 characters", "Raj"},
          {"last_name", "No", "Free text, max 80 characters", "Kumar"},
          {"company_name", "No", "Free text, max 160 characters", "Acme Supplies Pvt Ltd"},
          {"email", "No", "Valid email address; used to detect existing vendors", "raj.kumar@acmesupplies.com"},
          {"phone", "No", "Free text, max 40 characters", "022-40001234"},
          {"work_phone", "No", "Free text, max 40 characters", "022-40005678"},
          {"mobile", "No", "Digits (spaces removed); used to detect existing vendors", "9876543210"},
          {"vendor_language", "No", "Free text, max 60 characters", "English"},
          {"gst_number", "No", "15-character GSTIN format", "27ABCDE1234F1Z5"},
          {"pan_number", "No", "10-character PAN format", "ABCDE1234F"},
          {"website", "No", "Must start with http:// or https://", "https://acmesupplies.com"},
          {"status", "No", "ACTIVE or INACTIVE (defaults to ACTIVE)", "ACTIVE"},
          {"remarks", "No", "Free text, max 4000 characters", "Preferred packaging vendor"},
          {"", "", "", ""},
          {"Notes", "", "", ""},
          {"Accepted files: .csv, .xls, .xlsx", "", "", ""},
          {"Existing vendors are matched by email first, then mobile, and will be updated (not duplicated).", "", "", ""},
          {"Column headers are case-insensitive; spaces are treated the same as underscores.", "", "", ""},
          {"Vendor code, addresses, contacts, and bank accounts are not imported here; add them from the vendor editor after import.", "", "", ""},
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
      throw new BadRequestException("Failed to generate vendor import template.");
    }
  }

  private boolean persistRow(ParsedVendorRow parsed) {
    Optional<Vendor> existing = Optional.empty();
    if (parsed.email() != null) {
      existing = vendorRepository.findFirstByEmailIgnoreCase(parsed.email());
    }
    if (existing.isEmpty() && parsed.mobile() != null) {
      existing = vendorRepository.findFirstByMobile(parsed.mobile());
    }

    if (existing.isPresent()) {
      updateExistingVendor(existing.get(), parsed);
      return false;
    }

    ProcurementDtos.CreateVendorRequest createRequest = new ProcurementDtos.CreateVendorRequest(
        parsed.vendorType(),
        parsed.salutation(),
        parsed.firstName(),
        parsed.lastName(),
        parsed.companyName(),
        parsed.displayName(),
        parsed.email(),
        parsed.phone(),
        parsed.workPhone(),
        parsed.mobile(),
        parsed.vendorLanguage(),
        parsed.gstNumber(),
        parsed.panNumber(),
        parsed.website(),
        parsed.status(),
        parsed.remarks(),
        null,
        null,
        null,
        null
    );
    vendorService.createVendor(createRequest);
    return true;
  }

  /**
   * Updates only the flat vendor fields on an existing vendor matched during import. Deliberately
   * mutates the entity directly (rather than going through {@link VendorService#updateVendor}) so
   * that the vendor's existing addresses, contact persons, and bank accounts - which the import
   * template does not carry - are left untouched instead of being wiped by a full-replace update.
   */
  private void updateExistingVendor(Vendor vendor, ParsedVendorRow parsed) {
    if (parsed.email() != null && vendorRepository.existsByEmailIgnoreCaseAndIdNot(parsed.email(), vendor.getId())) {
      throw new BadRequestException("Vendor email already exists.");
    }
    if (parsed.mobile() != null && vendorRepository.existsByMobileAndIdNot(parsed.mobile(), vendor.getId())) {
      throw new BadRequestException("Vendor mobile already exists.");
    }

    vendor.setVendorType(parsed.vendorType());
    vendor.setSalutation(parsed.salutation());
    vendor.setFirstName(parsed.firstName());
    vendor.setLastName(parsed.lastName());
    vendor.setCompanyName(parsed.companyName());
    vendor.setVendorName(parsed.displayName());
    vendor.setEmail(parsed.email());
    vendor.setPhone(parsed.phone());
    vendor.setWorkPhone(parsed.workPhone());
    vendor.setMobile(parsed.mobile());
    vendor.setVendorLanguage(parsed.vendorLanguage());
    vendor.setGstNumber(parsed.gstNumber());
    vendor.setPanNumber(parsed.panNumber());
    vendor.setWebsite(parsed.website());
    vendor.setStatus(parsed.status());
    vendor.setRemarks(parsed.remarks());
    vendorRepository.save(vendor);
  }

  private List<RowEvaluation> evaluateRows(List<Map<String, String>> rows) {
    Map<String, Integer> seenEmailRows = new LinkedHashMap<>();
    Map<String, Integer> seenMobileRows = new LinkedHashMap<>();
    List<RowEvaluation> evaluations = new ArrayList<>();

    for (int i = 0; i < rows.size(); i++) {
      Map<String, String> row = rows.get(i);
      int rowNumber = i + 2; // header row + 1-based
      ParsedVendorRow parsed = parseRow(row, rowNumber);
      List<VendorImportError> errors = new ArrayList<>(parsed.errors());

      String status;
      String duplicateNote = null;
      if (!errors.isEmpty()) {
        status = STATUS_INVALID;
      } else {
        DuplicateCheck duplicateCheck = checkDuplicate(parsed, rowNumber, seenEmailRows, seenMobileRows);
        status = duplicateCheck.status();
        duplicateNote = duplicateCheck.note();
      }

      evaluations.add(new RowEvaluation(rowNumber, row, parsed, status, duplicateNote, errors));
    }

    return evaluations;
  }

  private DuplicateCheck checkDuplicate(
      ParsedVendorRow parsed,
      int rowNumber,
      Map<String, Integer> seenEmailRows,
      Map<String, Integer> seenMobileRows
  ) {
    if (parsed.email() != null) {
      Integer firstRow = seenEmailRows.putIfAbsent(parsed.email(), rowNumber);
      if (firstRow != null) {
        return new DuplicateCheck(STATUS_DUPLICATE_IN_FILE, "Duplicate of row " + firstRow + " in this file (matching email); this row will be skipped.");
      }
    }
    if (parsed.mobile() != null) {
      Integer firstRow = seenMobileRows.putIfAbsent(parsed.mobile(), rowNumber);
      if (firstRow != null) {
        return new DuplicateCheck(STATUS_DUPLICATE_IN_FILE, "Duplicate of row " + firstRow + " in this file (matching mobile); this row will be skipped.");
      }
    }
    if (parsed.email() != null && vendorRepository.findFirstByEmailIgnoreCase(parsed.email()).isPresent()) {
      return new DuplicateCheck(STATUS_DUPLICATE, "Matches an existing vendor by email; the existing vendor will be updated.");
    }
    if (parsed.mobile() != null && vendorRepository.findFirstByMobile(parsed.mobile()).isPresent()) {
      return new DuplicateCheck(STATUS_DUPLICATE, "Matches an existing vendor by mobile; the existing vendor will be updated.");
    }
    return new DuplicateCheck(STATUS_VALID, null);
  }

  private ParsedVendorRow parseRow(Map<String, String> row, int rowNumber) {
    List<VendorImportError> errors = new ArrayList<>();

    String displayName = trimToNull(value(row, "display_name", "vendor_name", "name", "supplier_name"));
    if (displayName == null) {
      errors.add(new VendorImportError(rowNumber, "display_name", "Display name is required."));
    } else if (displayName.length() > 160) {
      errors.add(new VendorImportError(rowNumber, "display_name", "Display name cannot exceed 160 characters."));
    }

    String vendorType = trimToNull(value(row, "vendor_type", "type"));
    String salutation = trimToNull(value(row, "salutation"));
    String firstName = trimToNull(value(row, "first_name", "firstname"));
    String lastName = trimToNull(value(row, "last_name", "lastname"));
    String companyName = trimToNull(value(row, "company_name", "company", "business_name"));

    String email = trimToNull(value(row, "email", "email_address"));
    if (email != null) {
      email = email.toLowerCase(Locale.ROOT);
      if (!EMAIL_PATTERN.matcher(email).matches()) {
        errors.add(new VendorImportError(rowNumber, "email", "Email must be valid."));
      }
    }

    String phone = trimToNull(value(row, "phone", "telephone", "landline"));
    String workPhone = trimToNull(value(row, "work_phone", "office_phone"));
    String mobile = trimToNull(value(row, "mobile", "mobile_number", "cell", "cell_number"));
    if (mobile != null) {
      mobile = mobile.replaceAll("\\s+", "");
    }

    String vendorLanguage = trimToNull(value(row, "vendor_language", "language"));

    String gstNumber = trimToNull(value(row, "gst_number", "gst", "gstin"));
    if (gstNumber != null) {
      gstNumber = gstNumber.toUpperCase(Locale.ROOT);
      if (!GST_PATTERN.matcher(gstNumber).matches()) {
        errors.add(new VendorImportError(rowNumber, "gst_number", "GST number format is invalid."));
      }
    }

    String panNumber = trimToNull(value(row, "pan_number", "pan"));
    if (panNumber != null) {
      panNumber = panNumber.toUpperCase(Locale.ROOT);
      if (!PAN_PATTERN.matcher(panNumber).matches()) {
        errors.add(new VendorImportError(rowNumber, "pan_number", "PAN number format is invalid."));
      }
    }

    String website = trimToNull(value(row, "website", "url"));
    if (website != null) {
      String lowerWebsite = website.toLowerCase(Locale.ROOT);
      if (!lowerWebsite.startsWith("http://") && !lowerWebsite.startsWith("https://")) {
        errors.add(new VendorImportError(rowNumber, "website", "Website must start with http:// or https://."));
      }
    }

    String statusRaw = trimToNull(value(row, "status", "vendor_status"));
    VendorStatus status = VendorStatus.ACTIVE;
    if (statusRaw != null) {
      try {
        status = VendorStatus.valueOf(statusRaw.trim().toUpperCase(Locale.ROOT));
      } catch (IllegalArgumentException ex) {
        errors.add(new VendorImportError(rowNumber, "status", "Status must be ACTIVE or INACTIVE."));
      }
    }

    String remarks = trimToNull(value(row, "remarks", "remark", "notes"));

    return new ParsedVendorRow(
        displayName, vendorType, salutation, firstName, lastName, companyName,
        email, phone, workPhone, mobile, vendorLanguage, gstNumber, panNumber,
        website, status, remarks, errors
    );
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

  private record ParsedVendorRow(
      String displayName,
      String vendorType,
      String salutation,
      String firstName,
      String lastName,
      String companyName,
      String email,
      String phone,
      String workPhone,
      String mobile,
      String vendorLanguage,
      String gstNumber,
      String panNumber,
      String website,
      VendorStatus status,
      String remarks,
      List<VendorImportError> errors
  ) {
  }

  private record RowEvaluation(
      int rowNumber,
      Map<String, String> rawRow,
      ParsedVendorRow parsed,
      String status,
      String duplicateNote,
      List<VendorImportError> errors
  ) {
  }

  private record DuplicateCheck(String status, String note) {
  }
}
