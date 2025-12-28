import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";

import Dashboard from "../pages/dashboardPage.jsx";
import Layout from "../components/Layout.jsx";
import VendorCreation from "../components/VendorModule/VendorManagement.jsx";
import CustomerCreation from "../components/Customer/CustomerManagement.jsx";
import StockCreation from "../components/Stock/StockManagement.jsx";
import UnitOfMeasure from "../components/UnitOfMeasure/UnitOfMeasure.jsx";
import Staff from "../components/Staff/staff.jsx";
import Settings from "../components/Settings/Settings.jsx";
import NotFound from "../components/NotFound.jsx";
import ERPLogin from "../components/Login/Login.jsx";
import PurchaseOrderPage from "../components/PurchaseOrder/purchase/PurchaseOrderPage.jsx";
import ApprovedPurchase from "../components/PurchaseOrder/purchase/ApprovedPurchase.jsx";
import SalesOrderPage from "../components/PurchaseOrder/sales/SalesOrderPage.jsx";
import ApprovedSales from "../components/PurchaseOrder/sales/ApprovedSales.jsx";
import InventoryManagement from "../components/Inventory/InventoryManagement.jsx";
import PurchaseReturnPage from "../components/PurchaseOrder/purchaseReturn/PurchaseReturnPage.jsx";
import SalesReturnPage from "../components/PurchaseOrder/salesReturn/SalesReturnPage.jsx";
import CategoryManagement from "../components/Inventory/CategoryManagement.jsx";
import ReceiptVoucherManagement from "../components/FinancialModules/Receipt/ReceiptVoucher.jsx";
import PaymentVoucherManagement from "../components/FinancialModules/Payment/PaymentVoucher.jsx";
import PurchaseAccounts from "../components/AccountsModule/Purchase/PurchaseAccount.jsx";
import SaleAccountsManagement from "../components/AccountsModule//Sales/SaleAccountsManagement.jsx";
import TransactionsManagement from "../components/AccountsModule/Transaction/TransactionsManagement.jsx";
import ChartOfAccountsManagement from "../components/AccountsModule/ChartOfAccounts/ChartOfAccountsManagement.jsx";
import ExpenseAccountsPage from "../components/AccountsModule/Expense/ExpenseAccountsPage.jsx";
import ExpenseTypesPage from "../components/AccountsModule/Expense/ExpenseTypesPage.jsx";
import ExpenseHistoryPage from "../components/AccountsModule/Expense/ExpenseHistoryPage.jsx";
import JournalVoucherManagement from "../components/FinancialModules/Journal/JournalVoucherManagement.jsx";
import ContraVoucherManagement from "../components/FinancialModules/Contra/ContraVoucherManagement.jsx";
import ExpenseVoucherManagement from "../components/FinancialModules/Expense/ExpenseVoucherManagement.jsx";
import StockDetail from "../components/Stock/StockDetail.jsx";
import VatReports from "../components/Reports/VATReportCreate.jsx";
import TrialBalanceReport from "../components/Reports/TrialBalanceReport.jsx";
import ProfitLossReport from "../components/Reports/ProfitLossReport.jsx";
import BalanceSheetReport from "../components/Reports/BalanceSheetReport.jsx";
import VendorDetailsPage from "../components/AccountsModule/Purchase/VendorDetailsPage.jsx";
import CustomerDetailsPage from "../components/AccountsModule/Sales/CustomerDetailsPage.jsx";
export default function AdminRouter() {
  return (
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
        {/* Accounts Module */}
        <Route path="/debit-accounts" element={<PurchaseAccounts />} />{" "}
        <Route
          path="/debit-accounts/vendor/:vendorId"
          element={<VendorDetailsPage />}
        />
        <Route path="/credit-accounts" element={<SaleAccountsManagement />} />{" "}
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
      </Route>
      {/* </Route> */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
