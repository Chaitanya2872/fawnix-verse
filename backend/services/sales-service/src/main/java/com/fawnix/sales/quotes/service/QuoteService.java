package com.fawnix.sales.quotes.service;

import com.fawnix.sales.common.exception.BadRequestException;
import com.fawnix.sales.common.exception.ResourceNotFoundException;
import com.fawnix.sales.quotes.dto.QuoteDtos;
import com.fawnix.sales.quotes.entity.DiscountType;
import com.fawnix.sales.quotes.entity.QuoteEntity;
import com.fawnix.sales.quotes.entity.QuoteLineItemEntity;
import com.fawnix.sales.quotes.entity.QuoteStatus;
import com.fawnix.sales.quotes.repository.QuoteRepository;
import com.fawnix.sales.quotes.specification.QuoteSpecifications;
import com.fawnix.sales.security.service.AppUserDetails;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
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
public class QuoteService {

  private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

  private final QuoteRepository quoteRepository;

  public QuoteService(QuoteRepository quoteRepository) {
    this.quoteRepository = quoteRepository;
  }

  @Transactional(readOnly = true)
  public QuoteDtos.QuoteListResponse getQuotes(
      String search,
      String status,
      int page,
      int pageSize
  ) {
    QuoteStatus statusFilter = parseStatus(status);
    Specification<QuoteEntity> specification = QuoteSpecifications.withFilters(search, statusFilter);

    int resolvedPage = Math.max(page, 1);
    int resolvedPageSize = Math.max(pageSize, 1);
    Page<QuoteEntity> quotePage = quoteRepository.findAll(
        specification,
        PageRequest.of(resolvedPage - 1, resolvedPageSize, Sort.by(Sort.Direction.DESC, "updatedAt"))
    );

    List<QuoteDtos.QuoteSummary> summaries = quotePage.getContent().stream()
        .map(this::toSummary)
        .toList();

    return new QuoteDtos.QuoteListResponse(
        summaries,
        quotePage.getTotalElements(),
        resolvedPage,
        resolvedPageSize,
        quotePage.getTotalPages()
    );
  }

  @Transactional(readOnly = true)
  public QuoteDtos.QuoteResponse getQuote(String id) {
    QuoteEntity quote = requireQuote(id);
    return toResponse(quote);
  }

  @Transactional
  public QuoteDtos.QuoteResponse createQuote(
      QuoteDtos.CreateQuoteRequest request,
      AppUserDetails actor
  ) {
    Instant now = Instant.now();
    QuoteEntity quote = new QuoteEntity();
    quote.setId(UUID.randomUUID().toString());
    quote.setQuoteNumber(generateQuoteNumber());
    quote.setCreatedAt(now);
    quote.setUpdatedAt(now);
    quote.setCreatedByUserId(actor.getUserId());
    quote.setCreatedByName(actor.getFullName());
    quote.setUpdatedByUserId(actor.getUserId());
    quote.setUpdatedByName(actor.getFullName());
    applyBaseFields(quote, request.leadId(), request.customerName(), request.company(), request.email(), request.phone(),
        request.billingAddress(), request.shippingAddress(), request.currency(), request.status(),
        request.discountType(), request.discountValue(), request.taxRate(), request.validUntil(),
        request.notes(), request.terms());
    replaceItems(quote, request.items());
    calculateTotals(quote);
    QuoteEntity saved = quoteRepository.save(quote);
    return toResponse(saved);
  }

  @Transactional
  public QuoteDtos.QuoteResponse updateQuote(
      String id,
      QuoteDtos.UpdateQuoteRequest request,
      AppUserDetails actor
  ) {
    QuoteEntity quote = requireQuote(id);
    Instant now = Instant.now();

    if (request.customerName() != null) {
      quote.setCustomerName(trimToNull(request.customerName()));
    }
    if (request.leadId() != null) {
      quote.setLeadId(trimToNull(request.leadId()));
    }
    if (request.company() != null) {
      quote.setCompany(trimToNull(request.company()));
    }
    if (request.email() != null) {
      quote.setEmail(trimToNull(request.email()));
    }
    if (request.phone() != null) {
      quote.setPhone(trimToNull(request.phone()));
    }
    if (request.billingAddress() != null) {
      quote.setBillingAddress(trimToNull(request.billingAddress()));
    }
    if (request.shippingAddress() != null) {
      quote.setShippingAddress(trimToNull(request.shippingAddress()));
    }
    if (request.currency() != null) {
      quote.setCurrency(normalizeCurrency(request.currency()));
    }
    if (request.status() != null) {
      quote.setStatus(request.status());
    }
    if (request.discountType() != null || request.discountValue() != null) {
      quote.setDiscountType(request.discountType());
      quote.setDiscountValue(scaleMoney(defaultMoney(request.discountValue())));
    }
    if (request.taxRate() != null) {
      quote.setTaxRate(scaleRate(request.taxRate()));
    }
    if (request.validUntil() != null) {
      quote.setValidUntil(request.validUntil());
    }
    if (request.notes() != null) {
      quote.setNotes(trimToNull(request.notes()));
    }
    if (request.terms() != null) {
      quote.setTerms(trimToNull(request.terms()));
    }
    if (request.items() != null) {
      replaceItems(quote, request.items());
    }

    quote.setUpdatedAt(now);
    quote.setUpdatedByUserId(actor.getUserId());
    quote.setUpdatedByName(actor.getFullName());
    calculateTotals(quote);
    QuoteEntity saved = quoteRepository.save(quote);
    return toResponse(saved);
  }

  @Transactional
  public QuoteDtos.QuoteResponse updateStatus(
      String id,
      QuoteDtos.UpdateQuoteStatusRequest request,
      AppUserDetails actor
  ) {
    QuoteEntity quote = requireQuote(id);
    quote.setStatus(request.status());
    quote.setUpdatedAt(Instant.now());
    quote.setUpdatedByUserId(actor.getUserId());
    quote.setUpdatedByName(actor.getFullName());
    return toResponse(quoteRepository.save(quote));
  }

  @Transactional
  public void deleteQuote(String id) {
    QuoteEntity quote = requireQuote(id);
    quoteRepository.delete(quote);
  }

  private void applyBaseFields(
      QuoteEntity quote,
      String leadId,
      String customerName,
      String company,
      String email,
      String phone,
      String billingAddress,
      String shippingAddress,
      String currency,
      QuoteStatus status,
      DiscountType discountType,
      BigDecimal discountValue,
      BigDecimal taxRate,
      Instant validUntil,
      String notes,
      String terms
  ) {
    quote.setLeadId(trimToNull(leadId));
    quote.setCustomerName(trimToNull(customerName));
    quote.setCompany(trimToNull(company));
    quote.setEmail(trimToNull(email));
    quote.setPhone(trimToNull(phone));
    quote.setBillingAddress(trimToNull(billingAddress));
    quote.setShippingAddress(trimToNull(shippingAddress));
    quote.setCurrency(normalizeCurrency(currency));
    quote.setStatus(status != null ? status : QuoteStatus.DRAFT);
    quote.setDiscountType(discountType);
    quote.setDiscountValue(scaleMoney(defaultMoney(discountValue)));
    quote.setTaxRate(scaleRate(taxRate));
    quote.setValidUntil(validUntil);
    quote.setNotes(trimToNull(notes));
    quote.setTerms(trimToNull(terms));
  }

  private void replaceItems(QuoteEntity quote, List<QuoteDtos.QuoteLineItemRequest> items) {
    if (items == null || items.isEmpty()) {
      throw new BadRequestException("At least one line item is required.");
    }

    quote.getItems().clear();
    int position = 1;
    for (QuoteDtos.QuoteLineItemRequest item : items) {
      QuoteLineItemEntity line = new QuoteLineItemEntity();
      line.setId(UUID.randomUUID().toString());
      line.setQuote(quote);
      line.setPosition(position++);
      line.setInventoryProductId(trimToNull(item.inventoryProductId()));
      line.setName(item.name().trim());
      line.setMake(trimToNull(item.make()));
      line.setDescription(trimToNull(item.description()));
      line.setUtility(trimToNull(item.utility()));
      line.setQuantity(scaleQuantity(item.quantity()));
      line.setUnit(trimToNull(item.unit()));
      line.setUnitPrice(scaleMoney(item.unitPrice()));
      line.setLineTotal(scaleMoney(item.quantity().multiply(item.unitPrice())));
      quote.getItems().add(line);
    }

    quote.getItems().sort(Comparator.comparingInt(QuoteLineItemEntity::getPosition));
  }

  private void calculateTotals(QuoteEntity quote) {
    BigDecimal subtotal = quote.getItems().stream()
        .map(QuoteLineItemEntity::getLineTotal)
        .reduce(BigDecimal.ZERO, BigDecimal::add);

    BigDecimal discountTotal = BigDecimal.ZERO;
    DiscountType discountType = quote.getDiscountType();
    BigDecimal discountValue = defaultMoney(quote.getDiscountValue());
    if (discountType != null && discountValue.compareTo(BigDecimal.ZERO) > 0) {
      if (discountType == DiscountType.PERCENT) {
        if (discountValue.compareTo(ONE_HUNDRED) > 0) {
          throw new BadRequestException("Discount percentage cannot exceed 100%.");
        }
        discountTotal = subtotal.multiply(discountValue).divide(ONE_HUNDRED, 4, RoundingMode.HALF_UP);
      } else {
        discountTotal = discountValue;
      }
    }

    if (discountTotal.compareTo(subtotal) > 0) {
      discountTotal = subtotal;
    }

    BigDecimal taxable = subtotal.subtract(discountTotal);
    if (taxable.compareTo(BigDecimal.ZERO) < 0) {
      taxable = BigDecimal.ZERO;
    }

    BigDecimal taxRate = defaultMoney(quote.getTaxRate());
    BigDecimal taxTotal = BigDecimal.ZERO;
    if (taxRate.compareTo(BigDecimal.ZERO) > 0) {
      taxTotal = taxable.multiply(taxRate).divide(ONE_HUNDRED, 4, RoundingMode.HALF_UP);
    }

    BigDecimal total = taxable.add(taxTotal);

    quote.setSubtotal(scaleMoney(subtotal));
    quote.setDiscountTotal(scaleMoney(discountTotal));
    quote.setTaxTotal(scaleMoney(taxTotal));
    quote.setTotal(scaleMoney(total));
    quote.setDiscountValue(scaleMoney(defaultMoney(quote.getDiscountValue())));
    quote.setTaxRate(scaleRate(quote.getTaxRate()));
  }

  private QuoteDtos.QuoteResponse toResponse(QuoteEntity quote) {
    List<QuoteDtos.QuoteLineItemResponse> items = quote.getItems().stream()
        .sorted(Comparator.comparingInt(QuoteLineItemEntity::getPosition))
        .map(item -> new QuoteDtos.QuoteLineItemResponse(
            item.getId(),
            item.getInventoryProductId(),
            item.getName(),
            item.getMake(),
            item.getDescription(),
            item.getUtility(),
            item.getQuantity(),
            item.getUnit(),
            item.getUnitPrice(),
            item.getLineTotal()
        ))
        .toList();

    return new QuoteDtos.QuoteResponse(
        quote.getId(),
        quote.getQuoteNumber(),
        quote.getStatus(),
        quote.getLeadId(),
        quote.getCustomerName(),
        quote.getCompany(),
        quote.getEmail(),
        quote.getPhone(),
        quote.getBillingAddress(),
        quote.getShippingAddress(),
        quote.getCurrency(),
        quote.getDiscountType(),
        quote.getDiscountValue(),
        quote.getSubtotal(),
        quote.getDiscountTotal(),
        quote.getTaxRate(),
        quote.getTaxTotal(),
        quote.getTotal(),
        quote.getValidUntil(),
        quote.getNotes(),
        quote.getTerms(),
        items,
        quote.getCreatedAt(),
        quote.getUpdatedAt()
    );
  }

  private QuoteDtos.QuoteSummary toSummary(QuoteEntity quote) {
    return new QuoteDtos.QuoteSummary(
        quote.getId(),
        quote.getQuoteNumber(),
        quote.getStatus(),
        quote.getCustomerName(),
        quote.getCompany(),
        quote.getTotal(),
        quote.getCreatedAt(),
        quote.getUpdatedAt()
    );
  }

  private QuoteEntity requireQuote(String id) {
    return quoteRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Quote not found."));
  }

  private QuoteStatus parseStatus(String value) {
    if (value == null || value.isBlank() || "ALL".equalsIgnoreCase(value)) {
      return null;
    }
    try {
      return QuoteStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      throw new BadRequestException("Invalid status.");
    }
  }

  private String normalizeCurrency(String currency) {
    if (currency == null || currency.isBlank()) {
      return "INR";
    }
    return currency.trim().toUpperCase(Locale.ROOT);
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private BigDecimal defaultMoney(BigDecimal value) {
    if (value == null) {
      return BigDecimal.ZERO;
    }
    return value;
  }

  private BigDecimal scaleMoney(BigDecimal value) {
    return value.setScale(2, RoundingMode.HALF_UP);
  }

  private BigDecimal scaleRate(BigDecimal value) {
    if (value == null) {
      return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }
    if (value.compareTo(BigDecimal.ZERO) < 0) {
      return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }
    return value.setScale(2, RoundingMode.HALF_UP);
  }

  private BigDecimal scaleQuantity(BigDecimal value) {
    return value.setScale(2, RoundingMode.HALF_UP);
  }

  private String generateQuoteNumber() {
    String datePart = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
    for (int i = 0; i < 6; i++) {
      String suffix = String.valueOf((int) (Math.random() * 9000) + 1000);
      String candidate = "QT-" + datePart + "-" + suffix;
      if (!quoteRepository.existsByQuoteNumber(candidate)) {
        return candidate;
      }
    }
    return "QT-" + datePart + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase(Locale.ROOT);
  }
}
