package com.fawnix.inventory.transactions.controller;

import com.fawnix.inventory.transactions.dto.TransactionDtos;
import com.fawnix.inventory.transactions.service.StockTransactionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/inventory/transactions")
public class StockTransactionController {

  private final StockTransactionService transactionService;

  public StockTransactionController(StockTransactionService transactionService) {
    this.transactionService = transactionService;
  }

  @GetMapping
  public TransactionDtos.TransactionListResponse listTransactions(
      @RequestParam(required = false) String sku
  ) {
    return transactionService.listTransactions(sku);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public TransactionDtos.TransactionResponse createTransaction(
      @Valid @RequestBody TransactionDtos.CreateTransactionRequest request
  ) {
    return transactionService.createTransaction(request);
  }
}
