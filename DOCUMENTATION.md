# Trade ERP Nexus (Frontend) – Project Documentation

## 1. Overview
- Name: Trade ERP Nexus (Frontend)
- Stack: React (Vite), React Router, Axios, lucide-react icons, Tailwind-like utility classes
- Purpose: Frontend for ERP modules including Accounts, Financial Vouchers, Sales & Purchase Orders, Inventory & Stock, Vendors, Customers, and Reports.
- Entry Points:
  - `index.html`
  - `src/main.jsx` bootstraps React App
  - `src/App.jsx` root-level application wrapper
  - `src/router/index.jsx` defines routes; `src/components/Layout.jsx` renders the main layout and includes Sidebar

## 2. Project Structure
```
public/
  _redirects
  vite.svg
src/
  assets/
    dirham.svg
    react.svg
  axios/
    axios.js
  components/
    AccountsModule/
      Layouts/
        InvoiceView.jsx
      Purchase/
        PurchaseAccount.jsx
        VendorSelect.jsx
      Sales/
        CustomerSelect.jsx
        SaleAccountsManagement.jsx
      Transaction/
        TransactionsManagement.jsx
      Transactors/
        TransactorsManagement.jsx
    Customer/
      CustomerManagement.jsx
    Dashborad/
      index.jsx
    FinancialModules/
      Contra/
        ContraVoucherManagement.jsx
        ContraVoucherView.jsx
      Expense/
        ExpenseVoucherManagement.jsx
      Journal/
        JournalVoucherManagement.jsx
        JournalVoucherView.jsx
      Payment/
        FormComponents.jsx
        InvoiceSelection.jsx
        PartySelect.jsx
        PaymentInvoiceView.jsx
        PaymentVoucher.jsx
        pdfUtils.jsx
        utils.jsx
      Receipt/
        CustomerSelect.jsx
        InvoiceSelection.jsx
        pdfUtils.jsx
        ReceiptVoucher.jsx
        utils.jsx
    Inventory/
      CategoryManagement.jsx
      InventoryManagement.jsx
    Login/
      Login.jsx
    PurchaseOrder/
      purchase/
        GridView.jsx
        InvoiceView.jsx
        POForm.jsx
        PurchaseOrderPage.jsx
        TableView.jsx
      purchaseReturn/
        GridView.jsx
        InvoiceView.jsx
        POForm.jsx
        PurchaseOrderPage.jsx
        TableView.jsx
      sales/
        __tests__/InvoiceView.test.jsx
        GridView.jsx
        InvoiceView.jsx
        SalesOrderPage.jsx
        SOForm.jsx
        TableView.jsx
      salesReturn/
        GridView.jsx
        InvoiceView.jsx
        SalesOrderPage.jsx
        SOForm.jsx
        TableView.jsx
    Reports/
      VATReportCreate.jsx
    Settings/
      Settings.jsx
    Staff/
      staff.jsx
    Stock/
      StockDetail.jsx
      StockManagement.jsx
    UnitOfMeasure/
      UnitOfMeasure.jsx
    VendorModule/
      VendorManagement.jsx
    Layout.jsx
    NotFound.jsx
    SideBar.jsx
  hooks/
    Vendor/
      ActionButtons.jsx
      InputField.jsx
      useVendorForm.js
  pages/
    dashboardPage.jsx
  router/
    index.jsx
  types/
    purchaseOrder.ts
  utils/
    format.js
    poUtils.js
  App.css
  App.jsx
  index.css
  main.jsx
.eslint.config.js
index.html
package.json
README.md
vite.config.js
vitest.config.js
vitest.setup.js
```

## 3. Routing
Defined in `src/router/index.jsx`.

- Auth:
  - `/` -> Login (`components/Login/Login.jsx`)
- Layout wrapper (`components/Layout.jsx`) encloses authenticated routes:
  - `/dashboard` -> `pages/dashboardPage.jsx`
  - `/vendor-creation` -> `components/VendorModule/VendorManagement.jsx`
  - `/customer-creation` -> `components/Customer/CustomerManagement.jsx`
  - `/stock-item-creation` -> `components/Stock/StockManagement.jsx`
  - `/stock-detail/:id` -> `components/Stock/StockDetail.jsx`
  - `/unit-setup` -> `components/UnitOfMeasure/UnitOfMeasure.jsx`
  - `/staff-records` -> `components/Staff/staff.jsx`
  - `/settings` -> `components/Settings/Settings.jsx`
  - Sales & Purchase:
    - `/purchase-order` -> `components/PurchaseOrder/purchase/PurchaseOrderPage.jsx`
    - `/sales-order` -> `components/PurchaseOrder/sales/SalesOrderPage.jsx`
    - `/purchase-return` -> `components/PurchaseOrder/purchaseReturn/PurchaseOrderPage.jsx`
    - `/sales-return` -> `components/PurchaseOrder/salesReturn/SalesOrderPage.jsx`
  - Inventory:
    - `/inventory` -> `components/Inventory/InventoryManagement.jsx`
    - `/category-management` -> `components/Inventory/CategoryManagement.jsx`
  - Accounts Module:
    - `/debit-accounts` -> `components/AccountsModule/Purchase/PurchaseAccount.jsx`
    - `/credit-accounts` -> `components/AccountsModule/Sales/SaleAccountsManagement.jsx`
    - `/transactions` -> `components/AccountsModule/Transaction/TransactionsManagement.jsx`
    - `/transactors` -> `components/AccountsModule/Transactors/TransactorsManagement.jsx`
  - Financial Modules:
    - `/receipt-voucher` -> `components/FinancialModules/Receipt/ReceiptVoucher.jsx`
    - `/payment-voucher` -> `components/FinancialModules/Payment/PaymentVoucher.jsx`
    - `/journal-voucher` -> `components/FinancialModules/Journal/JournalVoucherManagement.jsx`
    - `/contra-voucher` -> `components/FinancialModules/Contra/ContraVoucherManagement.jsx`
    - `/expense-voucher` -> `components/FinancialModules/Expense/ExpenseVoucherManagement.jsx`
  - Reports:
    - `/vat-reports` -> `components/Reports/VATReportCreate.jsx`
- NotFound:
  - `*` -> `components/NotFound.jsx`

## 4. Navigation (Sidebar)
- File: `src/components/SideBar.jsx`
- Sections (role: Admin hardcoded):
  - Financial Modules: Receipt, Payment, Journal, Contra, Expense
  - Accounts Module:
    - Debit Accounts (`/debit-accounts`)
    - Credit Accounts (`/credit-accounts`)
    - Transactions (`/transactions`)
    - Transactors (`/transactors`)
  - Vendor Modules: Vendor Creation
  - Customer Modules: Customer Creation
  - Sales & Purchase: Purchase Order, Sales Order, Purchase Return, Sales Return
  - Inventory & Stock: Stock Item Creation, Inventory
  - Unit of Measure: Unit Setup
  - Staff Management: Staff Records
  - Reports: VAT Reports
- Interactive: collapsible sections, active highlighting, animation.

## 5. Accounts Module
### 5.1 Debit Accounts (formerly Purchase Accounts)
- File: `src/components/AccountsModule/Purchase/PurchaseAccount.jsx`
- Manage payables from vendor purchase vouchers and payment vouchers.
- API:
  - Vendors: `GET /vendors/vendors`
  - Invoices: `GET /vouchers/vouchers?voucherType=purchase`
  - Vouchers: `GET /vouchers/vouchers?voucherType=payment`
- Features:
  - Filters: vendor, date range, search, pagination, sorting
  - Stats: total invoices/vouchers, totals, paid, balance
  - Views: invoices list, payment vouchers linked to invoices
  - Detail view: `InvoiceView`
  - Add Debit Invoice modal: `VendorSelect` and invoice selection; auto-calculations for debit amount (base), tax, total, paid, balance, status; return amount adjustments
  - Submit Account Voucher: `POST /account/account-vouchers` with payload including party, voucherType (purchase), invoiceIds, voucherIds, transactionNo, date, totals, status, invoiceBalances.
- UI Terminology: "Debit Accounts", "Debit Invoices", "Debit Amount", hint "Debit + Tax - Return".
- Backend contract keys remain (voucherType: `purchase`, base amount key internally `purchaseAmount`).

### 5.2 Credit Accounts (formerly Sales Accounts)
- File: `src/components/AccountsModule/Sales/SaleAccountsManagement.jsx`
- Manage receivables from customer sale vouchers and receipt vouchers.
- API:
  - Customers: `GET /customers/customers`
  - Invoices: `GET /vouchers/vouchers?voucherType=sale`
  - Vouchers: `GET /vouchers/vouchers?voucherType=receipt`
- Features:
  - Filters: customer, date range, search, pagination, sorting
  - Stats: totals, paid, balance
  - Views: sale invoices list, receipts linked to invoices
  - Detail view: `InvoiceView`
  - Add Credit Invoice modal: `CustomerSelect`; auto-calculations for credit amount (base), tax, total, paid, balance, status; return amount adjustments
  - Submit Account Voucher: `POST /account/account-vouchers` payload (partyType Customer, voucherType sale, invoice/voucher linking, totals, statuses).
- UI Terminology: "Credit Accounts", "Credit Invoices", "Credit Amount", hint "Credit + Tax - Return".
- Backend contract keys remain (voucherType: `sale`, base amount key internally `saleAmount`).

### 5.3 Transactions
- File: `src/components/AccountsModule/Transaction/TransactionsManagement.jsx`
- Purpose: List and manage account transactions (standard listing/filters expected).

### 5.4 Transactors
- File: `src/components/AccountsModule/Transactors/TransactorsManagement.jsx`
- Purpose: Manage transactors in the Accounts context.

### 5.5 Shared Layout
- `InvoiceView` (reusable invoice viewing UI) – `src/components/AccountsModule/Layouts/InvoiceView.jsx`.

## 6. Financial Modules
- Receipt Voucher: `src/components/FinancialModules/Receipt/ReceiptVoucher.jsx`
  - Support components: `CustomerSelect.jsx`, `InvoiceSelection.jsx`, `pdfUtils.jsx`, `utils.jsx`
- Payment Voucher: `src/components/FinancialModules/Payment/PaymentVoucher.jsx`
  - Support: `PartySelect.jsx`, `InvoiceSelection.jsx`, `pdfUtils.jsx`, `utils.jsx`, `PaymentInvoiceView.jsx`
- Journal Voucher: `src/components/FinancialModules/Journal/JournalVoucherManagement.jsx`, `JournalVoucherView.jsx`
- Contra Voucher: `src/components/FinancialModules/Contra/ContraVoucherManagement.jsx`, `ContraVoucherView.jsx`
- Expense Voucher: `src/components/FinancialModules/Expense/ExpenseVoucherManagement.jsx`

## 7. Sales & Purchase Orders
- Purchase Order:
  - `purchase/` -> GridView, InvoiceView, POForm, PurchaseOrderPage, TableView
  - `purchaseReturn/` -> analogous components for returns
- Sales Order:
  - `sales/` -> GridView, InvoiceView, SOForm, SalesOrderPage, TableView
  - `salesReturn/` -> analogous components for returns
- Tests: `components/PurchaseOrder/sales/__tests__/InvoiceView.test.jsx` using Vitest.

## 8. Inventory & Stock
- InventoryManagement: `src/components/Inventory/InventoryManagement.jsx`
- CategoryManagement: `src/components/Inventory/CategoryManagement.jsx`
- StockManagement: `src/components/Stock/StockManagement.jsx`
- StockDetail: `src/components/Stock/StockDetail.jsx`

## 9. Vendors & Customers
- Vendor Management: `src/components/VendorModule/VendorManagement.jsx`
  - Hooks: `src/hooks/Vendor/*`
- Customer Management: `src/components/Customer/CustomerManagement.jsx`

## 10. Reports
- VATReport: `src/components/Reports/VATReportCreate.jsx`

## 11. Utilities & Axios
- Axios instance: `src/axios/axios.js`
- Utilities:
  - `src/utils/format.js` – formatting helpers (currency/date/etc.)
  - `src/utils/poUtils.js` – purchase order utilities
- Financial PDFs:
  - `src/components/FinancialModules/Payment/pdfUtils.jsx`
  - `src/components/FinancialModules/Receipt/pdfUtils.jsx`

## 12. Styling & Icons
- Tailwind-like utility classes used throughout JSX.
- Icons: `lucide-react` package for icons.
- Styles: `src/App.css`, `src/index.css`.

## 13. Configuration & Tooling
- Build: Vite (`vite.config.js`)
- Testing: Vitest (`vitest.config.js`, `vitest.setup.js`)
- Lint: ESLint (`eslint.config.js`)
- SPA redirects: `public/_redirects` for client-side routing on static hosts.

## 14. Recent Terminology Changes
- Per change request:
  - "Purchase Accounts" -> "Debit Accounts"
  - "Sales Accounts" -> "Credit Accounts"
- Updated in:
  - UI texts in `PurchaseAccount.jsx` and `SaleAccountsManagement.jsx`
  - Sidebar labels and routes in `SideBar.jsx`
  - Router paths in `src/router/index.jsx`:
    - `/purchase-accounts` -> `/debit-accounts`
    - `/sales-accounts` -> `/credit-accounts`
- Business logic and backend field names remain unchanged (e.g., voucherType values and base amount keys) to preserve API contracts.

## 15. API Contracts (Frontend Expectations)
- Vendors: `GET /vendors/vendors`
- Customers: `GET /customers/customers`
- Vouchers (paginated): `GET /vouchers/vouchers` with parameters:
  - `voucherType`: `purchase` | `sale` | `payment` | `receipt` | etc.
  - `page`, `limit`
  - `partyId` (optional)
  - `startDate`, `endDate` (optional)
  - `search` (optional)
- Account Vouchers creation: `POST /account/account-vouchers`
  - Common payload fields (Debit/Credit modules):
    - `partyId`, `partyType` ("Vendor"|"Customer")
    - `voucherType` ("purchase"|"sale")
    - `invoiceIds` (array), `voucherIds` (array)
    - `transactionNo`, `date`
    - `totalAmount`, `returnAmount`, `paidAmount`, `balanceAmount`
    - `status` ("Paid"|"Unpaid"|"Partially Paid")
    - `invoiceBalances`: `[{ invoiceId, transactionNo, balanceAmount }]`

## 16. Build, Run, Test
- Install dependencies:
  - `npm install`
- Development server:
  - `npm run dev`
  - Default: http://localhost:5173
- Tests:
  - `npm run test`
- Linting:
  - `npm run lint`
- Production build:
  - `npm run build`
- Preview build:
  - `npm run preview`

## 17. Conventions & Best Practices
- Modular structure by business domain
- Axios instance for consistent API configuration
- React Router for navigation
- Hooks (`useState`, `useEffect`, `useCallback`, `useMemo`) for state and performance
- Pagination and sorting integrated in list UIs
- Reusability:
  - `InvoiceView` and componentized form inputs/selectors
- Sidebar structure and role-based filtering (role placeholder currently "Admin")

## 18. Considerations & Future Improvements
- Role-based access: Sidebar role is hardcoded; integrate with backend auth to control access and visibility.
- Backward compatibility: Update any external deep links to new paths `/debit-accounts` and `/credit-accounts`.
- Consistent terminology: UI adjusted to "Debit/Credit" while backend keys remain as purchase/sale to prevent breaking existing APIs.
- Centralized formatting: Continue using `format.js` for currency/date to maintain a single source of truth.

## 19. How to Export This Documentation to PDF
- Option A (VSCode Markdown):
  1. Open `DOCUMENTATION.md` in VSCode.
  2. Use a Markdown-to-PDF extension (e.g., "Markdown PDF").
  3. Export to PDF.
- Option B (Browser):
  1. Open this file using a Markdown preview or paste into a Google Doc.
  2. File -> Print -> Save as PDF.
- Option C (CLI tools): Use `pandoc` to convert Markdown to PDF: `pandoc DOCUMENTATION.md -o DOCUMENTATION.pdf`.

---

Generated by Qodo after analyzing the project workspace.
