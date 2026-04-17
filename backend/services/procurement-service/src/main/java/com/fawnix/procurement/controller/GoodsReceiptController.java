package com.fawnix.procurement.controller;

import com.fawnix.procurement.dto.ProcurementDtos;
import com.fawnix.procurement.service.GoodsReceiptService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/procurement/goods-receipts")
public class GoodsReceiptController {

  private final GoodsReceiptService goodsReceiptService;

  public GoodsReceiptController(GoodsReceiptService goodsReceiptService) {
    this.goodsReceiptService = goodsReceiptService;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ProcurementDtos.GoodsReceiptResponse createGoodsReceipt(
      @Valid @RequestBody ProcurementDtos.CreateGoodsReceiptRequest request
  ) {
    return goodsReceiptService.createGoodsReceipt(request);
  }

  @GetMapping
  public java.util.List<ProcurementDtos.GoodsReceiptResponse> getGoodsReceipts() {
    return goodsReceiptService.getGoodsReceipts();
  }

  @GetMapping("/{id}")
  public ProcurementDtos.GoodsReceiptResponse getGoodsReceipt(@PathVariable UUID id) {
    return goodsReceiptService.getGoodsReceipt(id);
  }
}
