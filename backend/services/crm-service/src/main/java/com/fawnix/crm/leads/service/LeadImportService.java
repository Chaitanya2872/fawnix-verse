package com.fawnix.crm.leads.service;

import com.fawnix.crm.common.exception.BadRequestException;
import com.fawnix.crm.leads.dto.LeadDtos;
import com.fawnix.crm.leads.dto.LeadDtos.LeadImportError;
import com.fawnix.crm.leads.dto.LeadDtos.LeadImportResult;
import com.fawnix.crm.leads.entity.LeadEntity;
import com.fawnix.crm.leads.entity.LeadPriority;
import com.fawnix.crm.leads.entity.LeadSource;
import com.fawnix.crm.leads.entity.LeadStatus;
import com.fawnix.crm.leads.repository.LeadRepository;
import com.fawnix.crm.leads.validator.LeadRequestValidator;
import com.fawnix.crm.security.service.AppUserDetails;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class LeadImportService {

  private static final DateTimeFormatter[] SUPPORTED_DATE_FORMATS = new DateTimeFormatter[] {
      DateTimeFormatter.ISO_DATE_TIME,
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"),
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
      DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm")
  };

  private final LeadRepository leadRepository;
  private final LeadService leadService;
  private final LeadRequestValidator leadRequestValidator;

  public LeadImportService(
      LeadRepository leadRepository,
      LeadService leadService,
      LeadRequestValidator leadRequestValidator
  ) {
    this.leadRepository = leadRepository;
    this.leadService = leadService;
    this.leadRequestValidator = leadRequestValidator;
  }

  public LeadImportResult importLeads(MultipartFile file, AppUserDetails actor) {
    if (file == null || file.isEmpty()) {
      throw new BadRequestException("Import file is required.");
    }

    String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "";
    String lowerName = filename.toLowerCase(Locale.ROOT);

    List<Map<String, String>> rows;
    try (InputStream inputStream = file.getInputStream()) {
      if (lowerName.endsWith(".csv")) {
        rows = parseCsv(inputStream);
      } else if (lowerName.endsWith(".xlsx")) {
        rows = parseXlsx(inputStream);
      } else {
        throw new BadRequestException("Unsupported file type. Please upload CSV or XLSX.");
      }
    } catch (Exception ex) {
      throw new BadRequestException("Failed to read import file.");
    }

    int created = 0;
    int updated = 0;
    int skipped = 0;
    List<LeadImportError> errors = new ArrayList<>();

    for (int i = 0; i < rows.size(); i++) {
      Map<String, String> row = rows.get(i);
      int rowNumber = i + 2; // header row + 1
      try {
        boolean result = processRow(row, actor);
        if (result) {
          created++;
        } else {
          updated++;
        }
      } catch (Exception ex) {
        errors.add(new LeadImportError(rowNumber, ex.getMessage()));
        skipped++;
      }
    }

    return new LeadImportResult(rows.size(), created, updated, skipped, errors);
  }

  private boolean processRow(Map<String, String> row, AppUserDetails actor) {
    String name = value(row, "name", "full_name", "full name");
    String company = value(row, "company", "company_name", "business_name");

    String community = trimToNull(value(row, "community"));
    String projectLocation = trimToNull(value(row, "project_location", "location", "location_of_the_property"));
    String projectState = trimToNull(value(row, "project_state", "state"));
    String propertyType = trimToNull(value(row, "property_type", "propertytype"));

    if (!StringUtils.hasText(company)) {
      company = firstNonBlank(community, projectLocation, projectState, propertyType, "Unknown");
    }

    if (!StringUtils.hasText(name) || !StringUtils.hasText(company)) {
      throw new BadRequestException("Name and company are required.");
    }

    String email = trimToNull(value(row, "email", "email_address"));
    String phone = trimToNull(value(row, "phone", "phone_number"));

    String externalLeadId = trimToNull(value(row, "lead_id", "leadid", "external_lead_id"));

    Optional<LeadEntity> existing = findDuplicate(email, phone, externalLeadId);

    String statusValue = value(row, "status", "lead_status");
    String priorityValue = value(row, "priority", "lead_priority");
    String sourceValue = value(row, "source", "lead_source");

    LeadStatus status = statusValue != null ? leadRequestValidator.parseStatus(statusValue) : LeadStatus.NEW;
    LeadPriority priority = priorityValue != null ? leadRequestValidator.parsePriority(priorityValue) : LeadPriority.MEDIUM;
    LeadSource source = sourceValue != null ? leadRequestValidator.parseSource(sourceValue) : LeadSource.OTHER;

    BigDecimal estimatedValue = parseDecimal(value(row, "estimatedvalue", "estimated_value", "est_value"));
    String notes = trimToNull(value(row, "notes", "remark"));
    List<String> tags = parseTags(value(row, "tags", "tag"));
    Instant followUpAt = parseInstant(value(row, "followupat", "follow_up_at", "follow_up"));

    String sourceMonth = trimToNull(value(row, "month"));
    String sourceDate = trimToNull(value(row, "date"));
    String alternativePhone = trimToNull(value(row, "alternative_number", "alternate_number", "alternative_phone", "alternate_phone"));
    String projectStage = trimToNull(value(row, "project_stage", "projectstage", "project_stage"));
    String expectedTimeline = trimToNull(value(row, "expected_timeline", "expectedtimeline", "how_soon_do_you_wish_to_automate_your_home"));
    String sqft = trimToNull(value(row, "sqft"));
    String presalesResponse = trimToNull(value(row, "pre_sales", "presales", "response"));
    String demoVisit = trimToNull(value(row, "demo_visit", "demovisit"));
    String presalesRemarks = trimToNull(value(row, "pre_sales_remarks", "presales_remarks", "pre_sales_comments"));
    String adSetName = trimToNull(value(row, "ad_set_name", "adset_name"));
    String campaignName = trimToNull(value(row, "campaign_name", "campaign"));

    String assignedToUserId = trimToNull(value(row, "assignedtouserid", "assigned_to_user_id"));
    String assignedTo = trimToNull(value(row, "assignedto", "assigned_to"));

    if (existing.isPresent()) {
      LeadDtos.UpdateLeadRequest updateRequest = new LeadDtos.UpdateLeadRequest(
          StringUtils.hasText(name) ? name : null,
          StringUtils.hasText(company) ? company : null,
          email,
          phone,
          sourceValue != null ? source.name() : null,
          statusValue != null ? status.name() : null,
          priorityValue != null ? priority.name() : null,
          assignedTo,
          assignedToUserId,
          estimatedValue,
          notes,
          tags.isEmpty() ? null : tags,
          null,
          followUpAt,
          null,
          externalLeadId,
          sourceMonth,
          sourceDate,
          alternativePhone,
          projectStage,
          expectedTimeline,
          propertyType,
          sqft,
          community,
          projectLocation,
          projectState,
          presalesResponse,
          demoVisit,
          presalesRemarks,
          adSetName,
          campaignName,
          null,
          null,
          null,
          null
      );
      leadService.updateLead(existing.get().getId(), updateRequest, actor);
      return false;
    }

    LeadDtos.CreateLeadRequest createRequest = new LeadDtos.CreateLeadRequest(
        name.trim(),
        company.trim(),
        email,
        phone,
        source.name(),
        status.name(),
        priority.name(),
        assignedTo,
        assignedToUserId,
        estimatedValue != null ? estimatedValue : BigDecimal.ZERO,
        notes,
        tags,
        followUpAt,
        externalLeadId,
        sourceMonth,
        sourceDate,
        alternativePhone,
        projectStage,
        expectedTimeline,
        propertyType,
        sqft,
        community,
        projectLocation,
        projectState,
        presalesResponse,
        demoVisit,
        presalesRemarks,
        adSetName,
        campaignName,
        null,
        null,
        null,
        null
    );
    leadService.createLead(createRequest, actor);
    return true;
  }

  private Optional<LeadEntity> findDuplicate(String email, String phone, String externalLeadId) {
    if (StringUtils.hasText(externalLeadId)) {
      return leadRepository.findFirstByExternalLeadId(externalLeadId.trim());
    }
    if (StringUtils.hasText(email)) {
      return leadRepository.findFirstByEmailIgnoreCase(email.trim());
    }
    if (StringUtils.hasText(phone)) {
      return leadRepository.findFirstByPhone(phone.trim());
    }
    return Optional.empty();
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

  private List<Map<String, String>> parseXlsx(InputStream inputStream) throws Exception {
    List<Map<String, String>> rows = new ArrayList<>();
    DataFormatter formatter = new DataFormatter();

    try (Workbook workbook = new XSSFWorkbook(inputStream)) {
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
      LocalDateTime dateTime = cell.getLocalDateTimeCellValue();
      return dateTime != null ? dateTime.toString() : null;
    }
    if (cell.getCellType() == CellType.FORMULA) {
      CellType cached = cell.getCachedFormulaResultType();
      if (cached == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
        LocalDateTime dateTime = cell.getLocalDateTimeCellValue();
        return dateTime != null ? dateTime.toString() : null;
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

  private List<String> parseTags(String raw) {
    if (!StringUtils.hasText(raw)) {
      return List.of();
    }
    String[] parts = raw.split("[,;]");
    List<String> tags = new ArrayList<>();
    for (String part : parts) {
      String trimmed = part.trim();
      if (!trimmed.isEmpty()) {
        tags.add(trimmed);
      }
    }
    return leadRequestValidator.normalizeTags(tags);
  }

  private BigDecimal parseDecimal(String raw) {
    if (!StringUtils.hasText(raw)) {
      return null;
    }
    try {
      return new BigDecimal(raw.trim());
    } catch (NumberFormatException ex) {
      throw new BadRequestException("Invalid estimated value.");
    }
  }

  private Instant parseInstant(String raw) {
    if (!StringUtils.hasText(raw)) {
      return null;
    }
    String value = raw.trim();
    try {
      return Instant.parse(value);
    } catch (DateTimeParseException ignored) {
    }

    for (DateTimeFormatter formatter : SUPPORTED_DATE_FORMATS) {
      try {
        LocalDateTime dateTime = LocalDateTime.parse(value, formatter);
        return dateTime.atZone(ZoneId.systemDefault()).toInstant();
      } catch (DateTimeParseException ignored) {
      }
    }

    try {
      LocalDate date = LocalDate.parse(value, DateTimeFormatter.ISO_DATE);
      return date.atStartOfDay(ZoneId.systemDefault()).toInstant();
    } catch (DateTimeParseException ignored) {
    }

    throw new BadRequestException("Invalid follow-up date.");
  }

  private String firstNonBlank(String... values) {
    for (String value : values) {
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
}
