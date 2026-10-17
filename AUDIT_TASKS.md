# Audit Task List

Source: full-codebase audit, 2026-07-28. 79 findings, tracked here as tasks.
Status legend: `[ ]` open · `[~]` in progress · `[x]` done · `[-]` won't fix (with note)

Work order: Critical → High → Medium → Low.

## Critical (11)

- [x] C1 — Role checks are cosmetic, not enforced. Sidebar hides admin links but routes have no guard; any logged-in user can reach `/dashboard/teams`, `/dashboard/settings` directly. — `src/App.tsx`, `src/components/Layout.tsx`, `src/components/RootLayout.tsx`. Fixed: added `RoleGuard` wrapping Suppliers/Expenses/Profit/Teams (admin+) and Settings (super_admin) routes.
- [x] C2 — Password hashes travel to the frontend and land on disk in plaintext (login + team list `SELECT *`, persisted verbatim to local store). — `src/database/user.ts`, `src/lib/store.ts`. Fixed: `login()` and `getUsers()` now strip the password field before returning.
- [x] C3 — Hardcoded default super-admin account (`admin` / `letmeonlinenow`) ships with no forced rotation. — `src/database/user.ts`. Fixed: added `must_change_password` column (migration 0013), seeded true for the default admin, and a `ForceChangePasswordScreen` gate in `RootLayout` that blocks the app until the password is changed.
- [x] C4 — Nothing stops a sale from overselling stock; no check against `quantity_on_hand`, no DB floor. — `src/app/sales/Create.tsx`, `src/database/sales.ts`. Fixed: cart add/increment now checks `getAvailableStock` and blocks/clamps with a toast; `createSale` adds a conditional `WHERE quantity_on_hand >= $1` floor and rolls back the whole sale if insufficient.
- [x] C5 — `approveReceipt` has no idempotency check; double-click/retry doubles inventory and payable. — `src/database/orders.ts`. Fixed: replaced the trailing unconditional status update with an atomic `UPDATE ... WHERE status = 'pending'` claim at the top of the transaction; a second call sees 0 rows affected and throws before touching inventory/payables.
- [x] C6 — `deleteSale` restores stock using sold-unit count instead of base units for multi-unit items. — `src/database/sales.ts`. Fixed: now selects and restores `base_quantity` (falling back to `quantity` for legacy rows where it's null).
- [x] C7 — Deleting a sale can cascade-delete a merged debtor row, wiping unrelated customers' debt. — `src/database/debtors.ts`. Fixed properly by removing the merging: every credit sale now has its own `debtors` row (migration 0014 adds `original_amount` + `payment_group_id`, no table rebuild — the earlier RESTRICT rebuild would have cascade-deleted `debtor_payments`). Customer payments are applied oldest-first across their open sales. `deleteSale` removes a sale's own untouched debt row and refuses if it was partly paid or is a legacy merged row.
- [x] C8 — Database Settings page is entirely fake ("Save"/"Test Connection" don't touch anything real). — `src/app/settings/DatabaseSettings.tsx`. Fixed: removed the fake remote-DB UI entirely; page now shows the real local DB file path/size (`get_database_info` command) and a working "Back Up Database" action that uses SQLite's `VACUUM INTO` (safe concurrent snapshot) to copy to Downloads (`backup_database` command, `src-tauri/src/database/mod.rs`, `src-tauri/src/files.rs`, `src-tauri/src/lib.rs`). This also covers H20 (no export/backup path).
- [x] C9 — Over-receiving a PO is silent; no cap tied to what's still outstanding. — `src/app/orders/Receive.tsx`, `src/database/orders.ts`. Fixed: `Receive.tsx` clamps input to remaining and validates before submit; `createPurchaseReceipt` independently validates ordered-vs-claimed (pending+approved) in base units and rejects overage server-side.
- [x] C10 — Dead duplicate PO implementation bypasses approval/payables if ever wired in. — `src/database/purchase-orders.ts`. Fixed: confirmed zero importers and deleted the file.
- [x] C11 — Stock decrease has no floor check; can drive `quantity_on_hand` negative. — `src/database/products.ts` (`updateProductQuantity`). Fixed: decrease path uses a conditional `WHERE quantity_on_hand >= $qty` and checks `rowsAffected`, throwing instead of going negative.

## High (20)

- [ ] H1 — Discount is hardcoded to 0 on the live checkout screen; only working discount UI is in a dead, unrouted file. — `src/app/sales/Create.tsx`
- [ ] H2 — Split payments: clicking a method assigns the entire remaining balance, second method does nothing until first is edited down. — `src/app/sales/Create.tsx` (`addPayment`)
- [x] H3 — Rapid double-click on Complete Sale can create a duplicate sale before the button disables. — `src/app/sales/Create.tsx` Fixed: submit guard via synchronous ref in `handlePaymentSubmit` (also fixed early-return leaving `isLoading` stuck).
- [x] H4 — No partial refunds/returns and no sale editing; only undo is a full admin-only delete. — sales module (gap) Fixed: admin-only Void / Return dialog (`returnSaleItems`/`voidSale`, migration 0015): stock restored, unpaid debt cancelled first, remainder refunded; sales are never deleted and every report nets returns.
- [x] H5 — Receiving stock never updates `cost_price`. — `src/database/orders.ts` Fixed: receipt approval now sets weighted-average `cost_price` per base unit and logs it in price history.
- [ ] H6 — Received quantity joined back to a PO line by `product_id` only, not the specific line; cross-contaminates duplicate-product lines. — `src/database/orders.ts` (`getPurchaseOrderById`)
- [ ] H7 — A purchase order can never be cancelled; `'cancelled'` status exists in schema but nothing sets it. — `src/app/orders/index.tsx`, `src/database/orders.ts`
- [ ] H8 — No reject path for a bad receipt; Approvals screen only offers Approve. — `src/app/orders/Approvals.tsx`, `src/database/orders.ts`
- [ ] H9 — Bulk purchase quantity is floored before saving, silently dropping fractional base units. — `src/app/stocks/Create.tsx`
- [ ] H10 — "Base Units" preview during bulk stock adjustment doesn't match what's actually saved. — `src/app/stocks/index.tsx`
- [ ] H11 — Manual stock adjustments never touch `cost_price`. — `src/database/products.ts`
- [ ] H12 — Stock Valuation computed as qty × selling price instead of cost price. — `src/database/products.ts`, `src/app/product-analysis/ProductAnalysis.tsx`
- [ ] H13 — No duplicate product name/SKU check on create. — `src/app/stocks/Create.tsx`
- [ ] H14 — N+1 query on every product list load (one extra query per product for units). — `src/database/products.ts` (`getProducts`)
- [ ] H15 — No barcode/SKU field anywhere in the product schema. — schema/product gap
- [ ] H16 — No expiry/batch-date tracking. — schema/product gap
- [ ] H17 — No physical stock-take/reconciliation workflow. — inventory gap
- [x] H18 — "Today" computed inconsistently (UTC vs local time) across dashboard/profit/cashier-summary. — `src/database/dashboard.ts`, `src/database/profit.ts`, `src/database/cashier-summary.ts` Fixed: dashboard/profit queries use `localtime` consistently; `getTodayProfit` no longer uses UTC date.
- [ ] H19 — Outstanding Debts dashboard card isn't role-masked like its sibling card. — `src/app/dashboard/index.tsx`
- [x] H20 — No data export/backup path anywhere in Settings. — settings gap Fixed: automatic daily backups (last 14 kept) + pre-migration snapshot + backup folder setting in Settings > Database.

## Medium (31)

- [ ] M1 — Products/cost prices fetched once per session, never refreshed. — `src/app/sales/Create.tsx`
- [ ] M2 — `recordDebtPayment` overpay silently discards excess, no store credit. — `src/database/debtors.ts`
- [ ] M3 — "Previous balance" on invoices can be wrong once a merged debt has been partially paid. — `src/database/debtors.ts` (`getCustomerDebtSummary`)
- [ ] M4 — No guard against negative/zero quantity or price on sale line items. — `src/app/sales/Create.tsx`
- [ ] M5 — Cancelling a paused sale has no confirmation. — `src/app/sales/Create.tsx` (`cancelSale`)
- [ ] M6 — Line-item price freely editable with no reason code or logging. — `src/app/sales/Create.tsx` (`handleUpdatePrice`)
- [ ] M7 — No customer credit-limit enforcement. — sales gap
- [ ] M8 — No barcode/SKU field or keyboard shortcuts in checkout search. — `src/app/sales/Create.tsx`
- [ ] M9 — PO/received quantities stored as integers; fractional purchasing truncates silently. — migrations 0009/0011
- [ ] M10 — No confirmation before receiving/approving a PO. — `src/app/orders/Receive.tsx`, `src/app/orders/Approvals.tsx`
- [ ] M11 — No validation preventing a zero-qty or zero-cost PO line. — `src/app/orders/index.tsx`
- [ ] M12 — Aggregate supplier-credit limit only caught after submit, not live. — `src/app/orders/SupplierPaymentDialog.tsx`, `AllocateSupplierCreditDialog.tsx`
- [ ] M13 — No editing of a PO after creation. — orders gap
- [ ] M14 — No record of who approved a receipt. — orders gap
- [ ] M15 — Reorder level parsed as integer; can't express fractional thresholds. — `src/app/stocks/index.tsx`, `Create.tsx`
- [ ] M16 — Unit-conversion input has no minimum (0/blank accepted). — `src/app/stocks/Create.tsx`, `index.tsx`
- [ ] M17 — Search on stock list doesn't reset pagination. — `src/app/stocks/index.tsx`
- [ ] M18 — No warning when selling price is saved below cost price. — `src/app/stocks/Create.tsx`, `index.tsx`
- [ ] M19 — Same unit selectable twice across a product's variation rows. — `src/app/stocks/Create.tsx`, `index.tsx`
- [ ] M20 — Inventory adjustments never attributed to a user (`changed_by` unset). — `src/database/products.ts`
- [ ] M21 — No bulk import for products (export exists, no import). — inventory gap
- [ ] M22 — Low stock only visible passively and admin-only; no proactive alert. — inventory gap
- [ ] M23 — Cashier Summary excludes debtor cash payments and till expenses. — `src/app/cashier-summary/index.tsx`
- [ ] M24 — Total Revenue is gross/all-time while charts are locked to current month, no date-range picker. — `src/app/dashboard/index.tsx`
- [ ] M25 — Two inconsistent print mechanisms (receipts vs. reports). — `src/components/PrintProfitReportButton.tsx`
- [ ] M26 — Net profit after expenses not surfaced on the Dashboard itself. — `src/app/dashboard/index.tsx`
- [ ] M27 — No expense budgets/category alerts; `ExpenseStats` built but unused. — `src/app/expenses`
- [x] M28 — No password strength/length validation on create or reset. — `src/app/teams/index.tsx` Fixed: server-side minimum 8 characters on create/reset/change; admin-set passwords force a change at next login.
- [ ] M29 — No session timeout/auto-lock. — `src/components/RootLayout.tsx`
- [ ] M30 — No user activity/audit log anywhere. — cross-cutting gap
- [ ] M31 — No confirmation on settings save. — `src/app/settings/index.tsx`

## Low / Polish (17)

- [x] L1 — Money totals summed as raw float, no rounding before persistence. — `src/app/sales/Create.tsx`, `src/database/sales.ts` Fixed: `round2` applied to totals/payments in cart and `createSale`.
- [ ] L2 — "Balance Due" doesn't switch to "Change Due" when payments exceed total. — `src/app/sales/Create.tsx`
- [ ] L3 — Debt payment dialog doesn't warn on overpayment. — `src/app/debtors/index.tsx`
- [ ] L4 — First tap with no active sale silently starts a new sale without adding the item. — `src/app/sales/Create.tsx`
- [ ] L5 — No due-date reminders for debtors; no multi-currency support. — gap
- [ ] L6 — Payment-state labels in Payments screen are unclear. — `src/app/orders/Payments.tsx`
- [ ] L7 — No supplier ledger, aging/overdue indication, or receiving-discrepancy report. — orders gap
- [ ] L8 — Price history only tracked for base cost/selling price; no product images. — inventory gap
- [x] L9 — Cashier ID interpolated directly into SQL string instead of bind param. — `src/database/dashboard.ts` Fixed: cashier ID now bound as a parameter in dashboard queries.
- [ ] L10 — Full expense table fetched and paginated client-side. — `src/app/expenses/index.tsx`
- [ ] L11 — No shift open/close workflow tied to cashier summary. — gap
- [ ] L12 — Cashier-summary role filter checks an impossible `'cashier'` string value (actual value is `'sales'`). — `src/app/cashier-summary/index.tsx`
- [ ] L13 — Dead file: `src/app/sales/Create copy.tsx`.
- [ ] L14 — Dead file: `src/lib/po-print-utils.ts`.
- [ ] L15 — Dead files: `src/lib/mock-dashboard-data.ts`, `src/lib/dashboard-store.ts`.
- [ ] L16 — Dead file: `src/components/ExpenseStats.tsx`.
- [x] L17 — `getProductsByCategory`/`searchProducts` query nonexistent `product_name` column. — `src/database/products.ts` Fixed: queries now use `name`.


## Deep-grill round (2026-10-17)

Fixed:
- [x] G1 — Startup race: DB was registered with `manage()` from a spawned task, so a command could run before it existed. Now registered synchronously, opened lazily and warmed up; a failed startup is reported to every caller instead of ignored. — `src-tauri/src/lib.rs`, `database/mod.rs`
- [x] G2 — Abandoned transactions held a pooled connection + the write lock forever (5 of them froze all writes). Stale-transaction reaper (120s) added. — `database/mod.rs`
- [x] G3 — Two overlapping transactions could deadlock on a global mutex held during queries. Per-transaction locks, and the write lock is taken at `begin`. Covered by a Rust test.
- [x] G4 — Migrations ran on a pool with foreign keys ON; table-rebuild migrations (`DROP TABLE users` etc.) could cascade-delete rows. Migrations now run on a dedicated connection with FKs off, after a pre-migration backup.
- [x] G5 — Roles were UI-only. Login/session now live in Rust; `execute_query` is authorized per statement (`src-tauri/src/guard.rs`); `users` writes only via `create_user`/`update_user`/`set_user_active`/`change_password`; password hashes never leave the backend; DDL/PRAGMA/multi-statement refused; `fs` permission narrowed to `logo.png`; `sql:*` permissions removed.
- [x] G6 — Deactivating a user never worked (`isActive` vs `is_active`) and login ignored `is_active`.
- [x] G7 — Held sales kept stale product cost/units; checkout now re-reads the products.
- [x] G8 — Expense day filters used the UTC date while profit used local; unified.
- [x] G9 — Debt payments applied "oldest first" tied on `created_at` and fell back to a random id; now insertion order.
- [x] G10 — Supplier accrual was 0 when goods arrived in a different unit than ordered; now priced per base unit.
- [x] G11 — Dev DB had two locally edited migrations (5, 9) whose checksums blocked startup; those two known variants are re-stamped, any other mismatch still fails loudly.

Found, not fixed:
- `dev.db` (the development database) is corrupt (`sale_items`, `product_price_history`, `inventory_adjustments` b-trees). A repaired copy is saved as `dev.db.repaired` next to it; swap it in by hand.
- Old data has orphan references (some `sales.employee_id`, `debtor_payments.employee_id` point at users that no longer exist; one `sale_items` row points at a missing product). Harmless until those rows are edited with foreign keys on.
- `product_price_history` rows from the pre-0006 layout have shifted columns.
- The SQL guard classifies statements by text. It is a real barrier against a casual devtools user, but long term the sensitive operations should be typed Rust commands.
- Held-sale persistence, reject path for receipts (H8), PO cancel (H7), partial PO edit (M13) are still open.
