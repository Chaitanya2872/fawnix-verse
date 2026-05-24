# Order-to-Cash Module Implementation Plan

This document maps the Order-to-Cash (O2C / OTC) module to the current Fawnix-Verse codebase.

It is intentionally repo-specific:

- it extends the existing `sales-service` instead of creating a brand-new service
- it reuses existing `crm-service`, `inventory-service`, `approval-service`, `notifications-service`, and reporting modules
- it follows the current frontend routing and module structure already used by `src/modules/sales`

## 1. Current Codebase Baseline

### Existing frontend entry points

- Sales route already exists at `"/sales"` via [src/app/router.tsx](/abs/path/c:/Users/USER/Downloads/Fawnix-Verse/src/app/router.tsx:134)
- Sidebar currently exposes only a quotations page at [src/components/layout/Sidebar.tsx](/abs/path/c:/Users/USER/Downloads/Fawnix-Verse/src/components/layout/Sidebar.tsx:58)
- Sales frontend currently lives in:
  - [src/modules/sales/page.tsx](/abs/path/c:/Users/USER/Downloads/Fawnix-Verse/src/modules/sales/page.tsx:1)
  - [src/modules/sales/api.ts](/abs/path/c:/Users/USER/Downloads/Fawnix-Verse/src/modules/sales/api.ts:1)
  - [src/modules/sales/hooks.ts](/abs/path/c:/Users/USER/Downloads/Fawnix-Verse/src/modules/sales/hooks.ts:1)
  - [src/modules/sales/types.ts](/abs/path/c:/Users/USER/Downloads/Fawnix-Verse/src/modules/sales/types.ts:1)

### Existing backend foundations

- Sales quote APIs already exist in:
  - [QuoteController.java](/abs/path/c:/Users/USER/Downloads/Fawnix-Verse/backend/services/sales-service/src/main/java/com/fawnix/sales/quotes/controller/QuoteController.java:1)
  - [QuoteService.java](/abs/path/c:/Users/USER/Downloads/Fawnix-Verse/backend/services/sales-service/src/main/java/com/fawnix/sales/quotes/service/QuoteService.java:1)
- Current sales-service migrations stop at:
  - [V1__baseline.sql](/abs/path/c:/Users/USER/Downloads/Fawnix-Verse/backend/services/sales-service/src/main/resources/db/migration/V1__baseline.sql:1)
  - [V2__create_sales_quotes.sql](/abs/path/c:/Users/USER/Downloads/Fawnix-Verse/backend/services/sales-service/src/main/resources/db/migration/V2__create_sales_quotes.sql:1)
  - [V3__add_quote_item_inventory_fields.sql](/abs/path/c:/Users/USER/Downloads/Fawnix-Verse/backend/services/sales-service/src/main/resources/db/migration/V3__add_quote_item_inventory_fields.sql:1)
- CRM already provides customer/account foundations
- Inventory already provides product and stock foundations
- Approval service exists and should handle enterprise approval rules
- Notifications service already exists for internal and customer messaging

## 2. Recommended Service Ownership

### `crm-service`

Owns:

- customer master
- account/contact master data
- billing and shipping addresses
- GST/VAT and tax identifiers
- credit limit and payment terms
- customer categories and contact persons

### `sales-service`

Owns:

- quotations
- quote-to-order conversion
- sales orders
- sales order lifecycle
- fulfillment orchestration
- shipment records
- customer invoices
- customer payments
- returns / RMA
- AR-facing operational records

### `inventory-service`

Owns:

- stock availability
- reservations
- allocations
- stock issue on shipment
- reverse movement on returns
- warehouse-level stock mapping

### `approval-service`

Owns:

- order approval
- discount approval
- credit approval
- refund approval
- escalation and audit trail

### `notifications-service`

Owns:

- quote sent notifications
- order approval notifications
- dispatch notifications
- invoice notifications
- payment reminders
- overdue reminders

### `reports` / analytics

Owns:

- O2C KPIs
- order fulfillment metrics
- invoice aging
- customer revenue reporting

## 3. Domain Model To Add

All new O2C core entities should start inside `sales-service`.

Suggested package root:

- `backend/services/sales-service/src/main/java/com/fawnix/sales/orders`
- `backend/services/sales-service/src/main/java/com/fawnix/sales/fulfillment`
- `backend/services/sales-service/src/main/java/com/fawnix/sales/invoices`
- `backend/services/sales-service/src/main/java/com/fawnix/sales/payments`
- `backend/services/sales-service/src/main/java/com/fawnix/sales/returns`

### Order entities

- `SalesOrderEntity`
- `SalesOrderItemEntity`
- `SalesOrderStatusHistoryEntity`
- `SalesOrderApprovalEntity`
- `SalesOrderReservationEntity`

### Fulfillment entities

- `PickListEntity`
- `PackingSlipEntity`
- `ShipmentEntity`
- `ShipmentItemEntity`
- `DeliveryProofEntity`

### Finance / AR entities

- `CustomerInvoiceEntity`
- `CustomerInvoiceItemEntity`
- `CustomerCreditNoteEntity`
- `CustomerDebitNoteEntity`
- `CustomerPaymentEntity`
- `CustomerReceiptEntity`
- `PaymentAllocationEntity`
- `ArLedgerEntryEntity`

### Returns entities

- `SalesReturnEntity`
- `SalesReturnItemEntity`
- `RefundRequestEntity`

## 4. Order Lifecycle

### Quote statuses already present

Current quote statuses in [src/modules/sales/types.ts](/abs/path/c:/Users/USER/Downloads/Fawnix-Verse/src/modules/sales/types.ts:1):

- `DRAFT`
- `SENT`
- `ACCEPTED`
- `REJECTED`
- `EXPIRED`

### Sales order statuses to add

- `DRAFT`
- `PENDING_APPROVAL`
- `APPROVED`
- `PROCESSING`
- `BACKORDERED`
- `PACKED`
- `SHIPPED`
- `DELIVERED`
- `CLOSED`
- `CANCELLED`

### Invoice statuses

- `DRAFT`
- `ISSUED`
- `PARTIALLY_PAID`
- `PAID`
- `OVERDUE`
- `VOID`

### Shipment statuses

- `PLANNED`
- `DISPATCHED`
- `IN_TRANSIT`
- `DELIVERED`
- `FAILED`

### Return statuses

- `REQUESTED`
- `PENDING_APPROVAL`
- `APPROVED`
- `RECEIVED`
- `REFUNDED`
- `REJECTED`

## 5. Database Migration Plan

Use the next sales-service migration numbers after `V3`.

Migration folder:

- [backend/services/sales-service/src/main/resources/db/migration](</abs/path/c:/Users/USER/Downloads/Fawnix-Verse/backend/services/sales-service/src/main/resources/db/migration>)

### Phase 1 migrations: sales orders

- `V4__create_sales_orders.sql`
- `V5__create_sales_order_items.sql`
- `V6__create_sales_order_status_history.sql`
- `V7__create_sales_order_approvals.sql`
- `V8__create_sales_order_reservations.sql`

Tables:

- `sales_orders`
- `sales_order_items`
- `sales_order_status_history`
- `sales_order_approvals`
- `sales_order_reservations`

Recommended `sales_orders` columns:

- `id`
- `order_number`
- `quote_id`
- `customer_account_id`
- `customer_name`
- `billing_address`
- `shipping_address`
- `currency`
- `subtotal`
- `discount_total`
- `tax_total`
- `grand_total`
- `payment_terms`
- `credit_limit_snapshot`
- `status`
- `approval_required`
- `approved_at`
- `approved_by`
- `ordered_at`
- `requested_delivery_date`
- `notes`
- `created_at`
- `updated_at`
- `created_by`
- `updated_by`

Recommended `sales_order_items` columns:

- `id`
- `sales_order_id`
- `inventory_product_id`
- `sku`
- `name`
- `description`
- `quantity`
- `reserved_quantity`
- `fulfilled_quantity`
- `unit`
- `unit_price`
- `discount_amount`
- `tax_rate`
- `tax_amount`
- `line_total`

### Phase 2 migrations: fulfillment

- `V9__create_pick_lists.sql`
- `V10__create_packing_slips.sql`
- `V11__create_shipments.sql`
- `V12__create_shipment_items.sql`
- `V13__create_delivery_proofs.sql`

### Phase 3 migrations: invoicing and payments

- `V14__create_customer_invoices.sql`
- `V15__create_customer_invoice_items.sql`
- `V16__create_customer_payments.sql`
- `V17__create_payment_allocations.sql`
- `V18__create_ar_ledger_entries.sql`
- `V19__create_customer_credit_notes.sql`
- `V20__create_customer_debit_notes.sql`

### Phase 4 migrations: returns

- `V21__create_sales_returns.sql`
- `V22__create_sales_return_items.sql`
- `V23__create_refund_requests.sql`

## 6. Backend API Plan

All public APIs below follow the current sales API style, which already uses `/api/sales/...` in [QuoteController.java](/abs/path/c:/Users/USER/Downloads/Fawnix-Verse/backend/services/sales-service/src/main/java/com/fawnix/sales/quotes/controller/QuoteController.java:1).

### Quotes

Keep existing:

- `GET /api/sales/quotes`
- `GET /api/sales/quotes/{id}`
- `POST /api/sales/quotes`
- `PATCH /api/sales/quotes/{id}`
- `PATCH /api/sales/quotes/{id}/status`
- `DELETE /api/sales/quotes/{id}`

Add:

- `POST /api/sales/quotes/{id}/convert-to-order`

### Sales orders

- `GET /api/sales/orders`
- `GET /api/sales/orders/{id}`
- `POST /api/sales/orders`
- `PATCH /api/sales/orders/{id}`
- `POST /api/sales/orders/{id}/submit`
- `POST /api/sales/orders/{id}/approve`
- `POST /api/sales/orders/{id}/cancel`
- `POST /api/sales/orders/{id}/reserve-stock`
- `POST /api/sales/orders/{id}/release-stock`

Suggested query filters:

- `search`
- `status`
- `customerId`
- `warehouseId`
- `fromDate`
- `toDate`
- `page`
- `pageSize`

### Fulfillment

- `GET /api/sales/pick-lists`
- `POST /api/sales/orders/{id}/pick-lists`
- `GET /api/sales/pick-lists/{id}`
- `POST /api/sales/pick-lists/{id}/complete`
- `POST /api/sales/orders/{id}/packing-slips`
- `POST /api/sales/orders/{id}/shipments`
- `GET /api/sales/shipments`
- `GET /api/sales/shipments/{id}`
- `PATCH /api/sales/shipments/{id}/dispatch`
- `PATCH /api/sales/shipments/{id}/deliver`

### Invoices

- `GET /api/sales/invoices`
- `GET /api/sales/invoices/{id}`
- `POST /api/sales/orders/{id}/invoices`
- `POST /api/sales/invoices/{id}/issue`
- `POST /api/sales/invoices/{id}/void`
- `POST /api/sales/invoices/{id}/credit-note`
- `POST /api/sales/invoices/{id}/debit-note`

### Payments / AR

- `GET /api/sales/payments`
- `POST /api/sales/payments`
- `GET /api/sales/payments/{id}`
- `POST /api/sales/payments/{id}/allocate`
- `POST /api/sales/payments/{id}/refund`
- `GET /api/sales/ar/ledger`
- `GET /api/sales/ar/aging`

### Returns / RMA

- `GET /api/sales/returns`
- `GET /api/sales/returns/{id}`
- `POST /api/sales/returns`
- `POST /api/sales/returns/{id}/approve`
- `POST /api/sales/returns/{id}/receive`
- `POST /api/sales/returns/{id}/refund`

## 7. Backend Package Layout

Suggested backend layout inside `sales-service`:

```text
com.fawnix.sales
  common
  security
  quotes
  orders
    controller
    dto
    entity
    repository
    service
    specification
  fulfillment
    controller
    dto
    entity
    repository
    service
  invoices
    controller
    dto
    entity
    repository
    service
  payments
    controller
    dto
    entity
    repository
    service
  returns
    controller
    dto
    entity
    repository
    service
  integration
    crm
    inventory
    approval
    notifications
```

## 8. DTO / Class Naming

### Orders

- `SalesOrderController`
- `SalesOrderService`
- `SalesOrderRepository`
- `SalesOrderSpecifications`
- `SalesOrderDtos`

Suggested DTOs:

- `CreateSalesOrderRequest`
- `UpdateSalesOrderRequest`
- `SubmitSalesOrderRequest`
- `ApproveSalesOrderRequest`
- `SalesOrderResponse`
- `SalesOrderListResponse`
- `SalesOrderSummary`
- `SalesOrderItemRequest`
- `SalesOrderItemResponse`

### Fulfillment

- `FulfillmentController`
- `FulfillmentService`
- `ShipmentController`
- `ShipmentService`
- `PickListDtos`
- `ShipmentDtos`

### Invoices

- `CustomerInvoiceController`
- `CustomerInvoiceService`
- `CustomerInvoiceDtos`

### Payments

- `CustomerPaymentController`
- `CustomerPaymentService`
- `AccountsReceivableController`
- `CustomerPaymentDtos`

### Returns

- `SalesReturnController`
- `SalesReturnService`
- `SalesReturnDtos`

## 9. Integration Contracts

### CRM integration

The sales order should reference CRM customer records rather than duplicating them heavily.

Needed CRM read model:

- customer account id
- legal/customer name
- billing address
- shipping address
- GST/VAT
- credit limit
- payment terms
- primary contact

Suggested internal client:

- `CrmCustomerClient`

Suggested methods:

- `getCustomerAccount(String accountId)`
- `getCustomerCreditProfile(String accountId)`

### Inventory integration

Suggested internal client:

- `InventoryReservationClient`

Suggested methods:

- `checkAvailability(List<OrderItemAvailabilityRequest> items, String warehouseId)`
- `reserveStock(String orderId, List<ReservationLineRequest> items, String warehouseId)`
- `releaseReservation(String orderId)`
- `issueStock(String shipmentId, List<StockIssueRequest> items)`
- `reverseIssue(String returnId, List<ReverseIssueRequest> items)`

### Approval integration

Suggested internal client:

- `ApprovalWorkflowClient`

Approval use cases:

- discount exceeds threshold
- order exceeds customer credit limit
- refund exceeds threshold
- credit note approval

Payload fields:

- `module = "sales_o2c"`
- `entityType`
- `entityId`
- `amount`
- `currency`
- `requestedBy`
- `reason`

### Notifications integration

Suggested internal client:

- `SalesNotificationClient`

Events:

- quote sent
- order approved
- order packed
- shipment dispatched
- invoice issued
- payment received
- overdue reminder
- refund processed

## 10. Frontend Module Plan

Do not replace the current sales page immediately. Expand it.

Suggested structure:

```text
src/modules/sales
  page.tsx
  api.ts
  hooks.ts
  types.ts
  QuotationDocument.tsx
  orders/
    page.tsx
    api.ts
    hooks.ts
    types.ts
  fulfillment/
    page.tsx
    api.ts
    hooks.ts
    types.ts
  shipments/
    page.tsx
    api.ts
    hooks.ts
    types.ts
  invoices/
    page.tsx
    api.ts
    hooks.ts
    types.ts
  payments/
    page.tsx
    api.ts
    hooks.ts
    types.ts
  ar/
    page.tsx
    api.ts
    hooks.ts
    types.ts
  returns/
    page.tsx
    api.ts
    hooks.ts
    types.ts
  dashboard/
    page.tsx
    api.ts
    hooks.ts
    types.ts
```

## 11. Frontend Route Map

Current sales route should remain for quotations:

- `/sales`

Add routes in [src/app/router.tsx](/abs/path/c:/Users/USER/Downloads/Fawnix-Verse/src/app/router.tsx:134):

- `/sales/orders`
- `/sales/fulfillment`
- `/sales/shipments`
- `/sales/invoices`
- `/sales/payments`
- `/sales/ar`
- `/sales/returns`
- `/sales/dashboard`

Suggested router imports:

- `SalesOrdersPage`
- `SalesFulfillmentPage`
- `SalesShipmentsPage`
- `SalesInvoicesPage`
- `SalesPaymentsPage`
- `SalesArPage`
- `SalesReturnsPage`
- `SalesDashboardPage`

## 12. Sidebar Navigation Changes

Sidebar currently exposes only:

- `Quotations -> /sales`

Suggested additions in [src/components/layout/Sidebar.tsx](/abs/path/c:/Users/USER/Downloads/Fawnix-Verse/src/components/layout/Sidebar.tsx:58):

- `Quotations -> /sales`
- `Orders -> /sales/orders`
- `Fulfillment -> /sales/fulfillment`
- `Shipments -> /sales/shipments`
- `Invoices -> /sales/invoices`
- `Payments -> /sales/payments`
- `Receivables -> /sales/ar`
- `Returns -> /sales/returns`
- `Sales Dashboard -> /sales/dashboard`

These can initially reuse `PERMISSIONS.PAGE_SALES` until granular permissions are introduced.

## 13. Frontend Screen Responsibilities

### `/sales`

Keep as quotation management:

- create quote
- edit quote
- send/share/export quote
- convert quote to order

### `/sales/orders`

- order list
- order detail
- order create/edit
- quote-to-order conversion output
- status transitions
- approval state
- stock reservation state

### `/sales/fulfillment`

- pick list queue
- packing readiness
- warehouse-wise work queue

### `/sales/shipments`

- shipment list
- courier/tracking reference
- delivery state
- proof of delivery

### `/sales/invoices`

- invoice list
- invoice detail
- issue / void / notes
- outstanding view

### `/sales/payments`

- payment entry
- allocation to invoices
- partial payment handling
- refunds

### `/sales/ar`

- customer ledger
- aging buckets
- overdue follow-up list

### `/sales/returns`

- return request queue
- approval workflow
- receipt confirmation
- reverse inventory + refund

### `/sales/dashboard`

- sales KPI cards
- order status funnel
- fulfillment lead time
- collection efficiency
- aging snapshot

## 14. Permissions Strategy

Short-term:

- reuse existing sales permission guard where possible

Long-term:

- `PAGE_SALES_QUOTES`
- `PAGE_SALES_ORDERS`
- `PAGE_SALES_FULFILLMENT`
- `PAGE_SALES_INVOICES`
- `PAGE_SALES_PAYMENTS`
- `PAGE_SALES_RETURNS`
- `PAGE_SALES_REPORTS`

Workflow-level roles:

- `ADMIN`
- `SALES_MANAGER`
- `SALES_REP`
- `FINANCE_MANAGER`
- `AR_EXECUTIVE`
- `WAREHOUSE_MANAGER`
- `WAREHOUSE_OPERATOR`

## 15. Notifications To Implement

Template keys:

- `sales.quote.sent`
- `sales.order.submitted`
- `sales.order.approved`
- `sales.order.backordered`
- `sales.picklist.generated`
- `sales.shipment.dispatched`
- `sales.delivery.completed`
- `sales.invoice.issued`
- `sales.payment.received`
- `sales.payment.reminder`
- `sales.ar.overdue`
- `sales.return.requested`
- `sales.refund.processed`

## 16. Reporting Scope

Initial O2C reports:

- open quotations
- quote acceptance conversion rate
- pending approvals
- open sales orders
- backordered items
- packed vs shipped vs delivered
- invoice totals by period
- outstanding receivables
- aging buckets
- customer-wise revenue
- order cycle time
- fill rate

## 17. Recommended Delivery Sequence

### Sprint 1: order foundation

- sales order schema
- order APIs
- quote-to-order conversion
- frontend order list/detail
- order status transitions

### Sprint 2: inventory and approvals

- inventory availability check
- stock reservation
- approval-service integration
- credit and discount checks

### Sprint 3: fulfillment and shipping

- pick lists
- packing slips
- shipment creation
- dispatch and delivery tracking

### Sprint 4: invoicing and AR

- invoice generation
- invoice issue / void
- payment posting
- payment allocation
- AR ledger and aging

### Sprint 5: returns and communication

- return request flow
- reverse inventory movement
- refund approvals
- notification templates

### Sprint 6: reporting and polish

- dashboards
- KPI cards
- performance tuning
- audit and edge-case handling

## 18. Best First Implementation Slice

If the goal is fastest business value, build this first slice:

1. quote-to-order conversion
2. sales order CRUD and status workflow
3. order approval trigger
4. inventory availability check
5. inventory reservation
6. invoice generation from approved/delivered order
7. payment posting and basic aging report

This gives a functional O2C backbone without waiting for full warehouse automation.

## 19. Immediate Next Tasks For This Repo

### Backend

1. Create `orders` package in `sales-service`
2. Add `V4` through `V8` migrations
3. Add `SalesOrderEntity`, `SalesOrderItemEntity`, `SalesOrderStatusHistoryEntity`
4. Add `SalesOrderDtos`
5. Add `SalesOrderRepository`
6. Add `SalesOrderService`
7. Add `SalesOrderController`
8. Add `POST /api/sales/quotes/{id}/convert-to-order`

### Frontend

1. Add `src/modules/sales/orders`
2. Add `/sales/orders` route
3. Add sidebar entry for orders
4. Add order list and detail screens
5. Add convert-quote-to-order action on quotation page

### Integration

1. Add CRM customer lookup client
2. Add inventory availability and reservation client
3. Add approval workflow client for submit/approve

## 20. Implementation Note

This plan intentionally keeps O2C inside `sales-service` first.

That is the right tradeoff for the current repo because:

- quotations already live there
- frontend sales routing already exists
- the migration history is clean and small
- inventory, approval, and notifications can be integrated incrementally

If O2C scope grows significantly later, fulfillment or AR can be split into dedicated services without throwing away this foundation.
