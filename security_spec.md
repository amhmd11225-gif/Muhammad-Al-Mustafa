# Security Specification & Threat Model — قطع غيار السيارات

## 1. Data Invariants
1. **Product Integrity**: Every product must have valid types, non-negative `price`, `quantity`, `minStock`, `soldCount`, bounded string sizes, and `createdBy == request.auth.uid`. Only verified Admins can create, delete, or edit product metadata/prices.
2. **Stock Safety & Atomicity**: Stock (`quantity`) can NEVER become negative (`>= 0`). An unauthenticated storefront customer can only decrement `quantity` (and increment `soldCount` by the exact delta) if they atomically create a valid `/orders/{lastOrderId}` document with `status == 'new'` in the same transaction (`existsAfter` + `getAfter`).
3. **Order PII Isolation**: Customer orders contain PII (`customerName`, `customerPhone`, `customerAddress`). Anyone on the storefront can `create` a valid order with `status == 'new'`, `paymentMethod == 'الدفع عند الاستلام'`, and `createdAt == request.time`, but ONLY verified active Staff or Admins can `get`, `list`, or `update` orders.
4. **Sales Ledger Isolation**: Active Employees and Admins can `create` a sale record (`employeeUid == request.auth.uid`, valid referenced `productId` via `exists()`, `createdAt == request.time`), but ONLY Admins can `get` or `list` sales records to protect financial reports from employee access.
5. **Staff RBAC Protection**: Only verified Admins (including bootstrapped owner `amhmd11225@gmail.com` with `email_verified == true`) can list, create, update, or delete `/staff/{staffId}` documents. Users can `get` only their own staff record matching their verified email key.
6. **Temporal & ID Integrity**: All document IDs are validated with `isValidId()` (`^[a-zA-Z0-9_-]+$`, `<= 128` chars), and all `createdAt`/`updatedAt` timestamps must match `request.time`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Fail with `PERMISSION_DENIED`)
1. **Unverified Email Spoofing**: Admin email claim with `email_verified: false` attempting to create a product or read `orders`.
2. **Employee Privilege Escalation**: Active Employee attempting to `create` a product, `update` a product `price`, or `create` a `staff` doc with `role: 'admin'`.
3. **Employee Financial Snooping**: Active Employee attempting `list` or `get` on `/sales`.
4. **Public PII Scraping**: Unauthenticated user attempting `get` or `list` on `/orders` or `/staff`.
5. **Negative Stock Manipulation**: Unauthenticated user or employee attempting to set `products/{id}.quantity = -5` or increase `quantity` without Admin role.
6. **Orphan Stock Tampering**: Unauthenticated user attempting to decrement `products/{id}.quantity` without an atomic `orders/{lastOrderId}` write in the same transaction.
7. **Shadow Field Injection**: Creating a product or order with an extra ghost field `isAdmin: true` or `discountOverride: 99`.
8. **Order Status Skipping on Create**: Public user creating an order with `status: 'completed'` instead of `'new'`.
9. **Timestamp Forgery**: Creating a sale or order with a backdated `createdAt` instead of `request.time`.
10. **ID Poisoning**: Creating `/products/..%2Fadmin` or a 500-char document ID.
11. **Orphan Sale Record**: Creating a `/sales/{id}` referencing a non-existent `productId` or spoofing `employeeUid` to another user's UID.
12. **Payload Exhaustion**: Creating a product with a 50KB `name` or 5MB `imageUrl`, or an order with >30 items.
