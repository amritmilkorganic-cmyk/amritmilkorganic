# Security Phase 3.3A: read-only operations reconciliation audit

## Scope and safety boundary

This phase is observation only. The administrator operations endpoint uses the existing signed
administrator session authorization and performs one Sanity read. It makes no mutation, deletion,
migration, correction, backfill, gateway call, paid-service integration, or environment-variable
change. Samples are capped at 25 rows per issue.

Before leaving the server, each internal document identifier is replaced by the first 20 hex
characters of an HMAC-SHA-256 digest keyed by `AUTH_SESSION_SECRET`. The response allowlist is:
`maskedId`, `recordType`, `issue`, `amount`, `paymentMethod`, `paymentStatus`,
`fulfillmentStatus`, and `occurredAt`. It never returns names, emails, phone numbers, addresses,
raw document/order/transaction/subscription IDs, credentials, hashes, tokens, payment secrets, or
gateway payloads. The HMAC value is an opaque correlation label, not a reusable datastore ID.

## Time windows and confidence

All calendar boundaries use **Asia/Kolkata** (UTC+05:30): “today” is `[local midnight, next local
midnight)`, and “last 7 days” is `[midnight six days before today, next local midnight)`. “Pending
over 24 hours” compares `_createdAt` with the exact instant 24 hours before the snapshot. “All
time” means every matching document currently visible in the configured Sanity dataset.

Confidence labels mean: **high** is directly counted/summed from canonical stored fields;
**medium** depends on application-maintained classification or ownership fields; and **external**
cannot be established from the application dataset alone. In particular, a CCAvenue
`paymentStatus == "success"` is application-recorded payment state only. CCAvenue settlement
requires separate, external gateway reconciliation and is not performed here.

## KPI catalogue

| KPI                           | Source and definition                          | Inclusion rules and window                                                                                        | Confidence                                             |
| ----------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Orders today                  | Sanity `order`; document count                 | `_createdAt` in today’s Kolkata half-open window; every payment/fulfillment state                                 | High                                                   |
| Orders — last 7 days          | Sanity `order`; document count                 | `_createdAt` in the Kolkata seven-day half-open window                                                            | High                                                   |
| Gross order value             | Sanity `order.total`; sum                      | All orders in the same seven-day window, including failed, pending, cancelled, COD, and online                    | Medium; stored totals are audited, not corrected       |
| Online paid value             | Sanity `order.total`; sum                      | Seven-day orders with `paymentMethod == ccavenue` and `paymentStatus == success`                                  | External; application state does not prove settlement  |
| Historical online order count | Sanity `order`; count                          | All-time `paymentMethod == ccavenue`; never mixed with COD                                                        | Medium                                                 |
| Historical online value       | Sanity `order.total`; sum                      | Same all-time online population, every payment/fulfillment state                                                  | Medium; not settled revenue                            |
| Historical COD order count    | Sanity `order`; count                          | All-time `paymentMethod == cod`; never mixed with online                                                          | High                                                   |
| Historical COD value          | Sanity `order.total`; sum                      | Same all-time COD population, every payment/fulfillment state                                                     | Medium; not collected cash                             |
| COD pending value             | Sanity `order.total`; sum                      | All-time COD orders with `paymentStatus == pending`, delivered or undelivered                                     | Medium                                                 |
| Pending payment count         | Sanity `order`; count                          | All-time `paymentStatus == pending`, across methods                                                               | Medium                                                 |
| Failed payment count          | Sanity `order`; count                          | All-time `paymentStatus == failed`, across methods                                                                | Medium                                                 |
| Fulfillment counts            | Sanity `order`; six counts                     | All-time, separately counts pending, processing, shipped, delivered, cancelled, and anything else as unclassified | Medium                                                 |
| Active subscriptions          | Sanity `subscription`; count                   | All-time `status == active`                                                                                       | Medium                                                 |
| Paused subscriptions          | Sanity `subscription`; count                   | All-time `status == paused`                                                                                       | Medium                                                 |
| Deliveries due today          | Sanity `subscription.plan.nextDelivery`; count | Active subscriptions with next delivery in today’s Kolkata window                                                 | Medium; schedule completeness is audited               |
| Deliveries due tomorrow       | Sanity `subscription.plan.nextDelivery`; count | Active subscriptions with next delivery in tomorrow’s Kolkata window                                              | Medium                                                 |
| Unowned orders                | Sanity `order.customerAccount`; count          | All-time orders lacking the canonical customer reference, including legitimate guests and historical records      | High for missing reference; low for inferred ownership |
| Unowned subscriptions         | Sanity `subscription.customerAccount`; count   | All-time subscriptions lacking the canonical customer reference                                                   | High for missing reference; low for inferred ownership |

## Reconciliation checks

The uncapped issue counts and up-to-25 masked samples detect: duplicate `orderNumber` values;
duplicate CCAvenue `trackingId` values; successful online payments without a transaction ID;
online payments pending longer than 24 hours; missing/negative order amounts; invalid subscription
schedule dates; payment statuses outside `pending`, `success`, and `failed`; fulfillment statuses
outside the five supported values; a difference greater than ₹0.01 between `total` and `subtotal +
deliveryFee - discount`; missing canonical customer ownership; and subscriptions missing their ID,
status, payment method, product quantity/price, or (when active) frequency/start/next-delivery
schedule.

Duplicate counts are counts of affected documents, not distinct duplicated values. Missing
ownership is an exception signal, not proof of corruption: guest and pre-backfill records may be
valid. No automatic repair is attempted.
