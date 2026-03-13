import React, { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { PageListSkeleton } from "../components/ui/Skeletons";

// Layout and Login load eagerly (always needed)
import Layout from "../components/Layout.jsx";
import ERPLogin from "../components/Login/Login.jsx";
import NotFound from "../components/NotFound.jsx";

// ─── Lazy-loaded route components (code splitting) ───────────
// Each page loads its JS bundle only when the user navigates to it.
// This reduces the initial bundle from ~3.1MB to a fraction.
const Dashboard = lazy(() => import("../pages/dashboardPage.jsx"));
const VendorCreation = lazy(() => import("../components/VendorModule/VendorManagement.jsx"));
const CustomerCreation = lazy(() => import("../components/Customer/CustomerManagement.jsx"));
const StockCreation = lazy(() => import("../components/Stock/StockManagement.jsx"));
const StockDetail = lazy(() => import("../components/Stock/StockDetail.jsx"));
const UnitOfMeasure = lazy(() => import("../components/UnitOfMeasure/UnitOfMeasure.jsx"));
const Staff = lazy(() => import("../components/Staff/staff.jsx"));
const Settings = lazy(() => import("../components/Settings/Settings.jsx"));
const PurchaseOrderPage = lazy(() => import("../components/PurchaseOrder/purchase/PurchaseOrderPage.jsx"));
const ApprovedPurchase = lazy(() => import("../components/PurchaseOrder/purchase/ApprovedPurchase.jsx"));
const SalesOrderPage = lazy(() => import("../components/PurchaseOrder/sales/SalesOrderPage.jsx"));
const ApprovedSales = lazy(() => import("../components/PurchaseOrder/sales/ApprovedSales.jsx"));
const InventoryManagement = lazy(() => import("../components/Inventory/InventoryManagement.jsx"));
const PurchaseReturnPage = lazy(() => import("../components/PurchaseOrder/purchaseReturn/PurchaseReturnPage.jsx"));
const SalesReturnPage = lazy(() => import("../components/PurchaseOrder/salesReturn/SalesReturnPage.jsx"));
const CategoryManagement = lazy(() => import("../components/Inventory/CategoryManagement.jsx"));
const ReceiptVoucherManagement = lazy(() => import("../components/FinancialModules/Receipt/ReceiptVoucher.jsx"));
const PaymentVoucherManagement = lazy(() => import("../components/FinancialModules/Payment/PaymentVoucher.jsx"));
const JournalVoucherManagement = lazy(() => import("../components/FinancialModules/Journal/JournalVoucherManagement.jsx"));
const ContraVoucherManagement = lazy(() => import("../components/FinancialModules/Contra/ContraVoucherManagement.jsx"));
const ExpenseVoucherManagement = lazy(() => import("../components/FinancialModules/Expense/ExpenseVoucherManagement.jsx"));
const AccountsPayablePage = lazy(() => import("../components/AccountsModule/Purchase/AccountsPayablePage.jsx"));
const VendorDetailsPage = lazy(() => import("../components/AccountsModule/Purchase/VendorDetailsPage.jsx"));
const AccountsReceivablePage = lazy(() => import("../components/AccountsModule/Sales/AccountsReceivablePage.jsx"));
const CustomerDetailsPage = lazy(() => import("../components/AccountsModule/Sales/CustomerDetailsPage.jsx"));
const TransactionsManagement = lazy(() => import("../components/AccountsModule/Transaction/TransactionsManagement.jsx"));
const ChartOfAccountsManagement = lazy(() => import("../components/AccountsModule/ChartOfAccounts/ChartOfAccountsManagement.jsx"));
const ExpenseAccountsPage = lazy(() => import("../components/AccountsModule/Expense/ExpenseAccountsPage.jsx"));
const ExpenseTypesPage = lazy(() => import("../components/AccountsModule/Expense/ExpenseTypesPage.jsx"));
const ExpenseHistoryPage = lazy(() => import("../components/AccountsModule/Expense/ExpenseHistoryPage.jsx"));
const VatReports = lazy(() => import("../components/Reports/VATReportCreate.jsx"));
const TrialBalanceReport = lazy(() => import("../components/Reports/TrialBalanceReport.jsx"));
const ProfitLossReport = lazy(() => import("../components/Reports/ProfitLossReport.jsx"));
const BalanceSheetReport = lazy(() => import("../components/Reports/BalanceSheetReport.jsx"));
const StatementOfAccount = lazy(() => import("../components/Reports/StatementOfAccount.jsx"));
const ItemProfitabilityReport = lazy(() => import("../components/Reports/ItemProfitabilityReport.jsx"));
const GRNPage = lazy(() => import("../components/PurchaseOrder/grn/GRNPage.jsx"));

// Suspense fallback shown while lazy chunk loads
const LazyFallback = () => (
  <div className="p-8">
    <PageListSkeleton rows={8} />
  </div>
);

export default function AdminRouter() {
  return (
    <Suspense fallback={<LazyFallback />}>
    <Routes>
      <Route path="/" element={<ERPLogin />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/vendor-creation" element={<VendorCreation />} />{" "}
        <Route path="/customer-creation" element={<CustomerCreation />} />{" "}
        <Route path="/stock-item-creation" element={<StockCreation />} />{" "}
        <Route path="/stock-item-creation" element={<StockCreation />} />{" "}
        <Route path="/stock-detail/:id" element={<StockDetail />} />{" "}
        <Route path="/unit-setup" element={<UnitOfMeasure />} />{" "}
        <Route path="/staff-records" element={<Staff />} />{" "}
        <Route path="/settings" element={<Settings />} />{" "}
        <Route path="/purchase-order" element={<PurchaseOrderPage />} />{" "}
        <Route path="/goods-received-note" element={<GRNPage />} />{" "}
        <Route path="/approved-purchase" element={<ApprovedPurchase />} />{" "}
        <Route path="/sales-order" element={<SalesOrderPage />} />{" "}
        <Route path="/approved-sales" element={<ApprovedSales />} />{" "}
        <Route path="/inventory" element={<InventoryManagement />} />{" "}
        <Route path="/purchase-return" element={<PurchaseReturnPage />} />{" "}
        <Route path="/sales-return" element={<SalesReturnPage />} />{" "}
        <Route path="/category-management" element={<CategoryManagement />} />
        {/* financial */}
        <Route
          path="/receipt-voucher"
          element={<ReceiptVoucherManagement />}
        />{" "}
        <Route path="/payment-voucher" element={<PaymentVoucherManagement />} />{" "}
        <Route path="/journal-voucher" element={<JournalVoucherManagement />} />{" "}
        <Route path="/contra-voucher" element={<ContraVoucherManagement />} />{" "}
        <Route path="/expense-voucher" element={<ExpenseVoucherManagement />} />{" "}
        {/* Accounts Module — AP/AR two-level drill-down (summary → invoice register) */}
        <Route path="/debit-accounts" element={<AccountsPayablePage />} />{" "}
        <Route
          path="/debit-accounts/vendor/:vendorId"
          element={<VendorDetailsPage />}
        />
        <Route path="/credit-accounts" element={<AccountsReceivablePage />} />{" "}
        <Route
          path="/credit-accounts/customer/:customerId"
          element={<CustomerDetailsPage />}
        />
        <Route path="/transactions" element={<TransactionsManagement />} />{" "}
        <Route path="/chart-of-accounts" element={<ChartOfAccountsManagement />} />{" "}
        <Route path="/expense-accounts" element={<ExpenseAccountsPage />} />{" "}
        <Route path="/expense-accounts/:accountId/types" element={<ExpenseTypesPage />} />{" "}
        <Route path="/expense-accounts/types/:typeId/history" element={<ExpenseHistoryPage />} />{" "}
        <Route path="/payment-voucher" element={<PaymentVoucherManagement />} />{" "}
        {/* reports */}
        <Route path="/vat-reports" element={<VatReports />} />
        <Route path="/trial-balance" element={<TrialBalanceReport />} />
        <Route path="/profit-loss" element={<ProfitLossReport />} />
        <Route path="/balance-sheet" element={<BalanceSheetReport />} />
        <Route path="/statement-of-account" element={<StatementOfAccount />} />
        <Route path="/item-profitability" element={<ItemProfitabilityReport />} />
      </Route>
      {/* </Route> */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
