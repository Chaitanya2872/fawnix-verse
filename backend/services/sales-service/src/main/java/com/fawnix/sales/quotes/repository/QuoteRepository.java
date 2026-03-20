package com.fawnix.sales.quotes.repository;

import com.fawnix.sales.quotes.entity.QuoteEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface QuoteRepository extends JpaRepository<QuoteEntity, String>, JpaSpecificationExecutor<QuoteEntity> {
  boolean existsByQuoteNumber(String quoteNumber);
}
