import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Loader2,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Building2,
  RefreshCw,
  AlertCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  Search,
  FileDown,
} from "lucide-react";
import axiosInstance from "../../axios/axios";
import Select from "react-select";
import { exportStatementOfAccountExcel } from "../../utils/soaExcelExport";
import { exportStatementOfAccountPDF } from "../../utils/soaPdfExport";

// Toast Component
const Toast = ({ show, message, type }) =>
  show && (
    <div
      className={`fixed top-4 right-4 p-4 rounded-xl shadow-2xl text-white z-50 animate-slide-in ${
        type === "success"
          ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
          : "bg-gradient-to-r from-red-500 to-red-600"
      }`}
    >
      <div className="flex items-center space-x-3">
        {type === "success" ? (
          <CheckCircle size={20} className="animate-bounce" />
        ) : (
          <XCircle size={20} className="animate-pulse" />
        )}
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );

// Currency formatter
const formatCurrency = (amount, showZero = false) => {
  const num = Number(amount) || 0;
  if (!showZero && Math.abs(num) < 0.01) return "-";
  return new Intl.NumberFormat("en-AE", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

// Date formatter
const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Statement View Modal
const StatementViewModal = ({ isOpen, onClose, statement, onExportExcel, onExportPDF, isExporting, isExportingPDF }) => {
  if (!isOpen || !statement) return null;

  const { customer, period, openingBalance, closingBalance, transactions, totals, excessPayments, excessTotal, summary } = statement;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col my-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-3">
                <FileText size={28} /> Statement of Account
              </h3>
              <p className="text-purple-100 mt-2">{customer.customerName}</p>
              <p className="text-purple-200 text-sm">
                Customer ID: {customer.customerId} | TRN: {customer.trnNumber || "N/A"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-purple-100 text-sm">Period</p>
              <p className="text-white font-semibold">
                {formatDate(period.from)} - {formatDate(period.to)}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-blue-600 text-sm font-medium">Opening Balance</p>
              <p className="text-2xl font-bold text-blue-800">
                AED {formatCurrency(openingBalance, true)}
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-600 text-sm font-medium">Total Debit</p>
              <p className="text-2xl font-bold text-green-800">
                AED {formatCurrency(totals?.totalDebit, true)}
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-600 text-sm font-medium">Total Credit</p>
              <p className="text-2xl font-bold text-red-800">
                AED {formatCurrency(totals?.totalCredit, true)}
              </p>
            </div>
            <div className={`${closingBalance >= 0 ? "bg-purple-50 border-purple-200" : "bg-orange-50 border-orange-200"} border rounded-xl p-4`}>
              <p className={`${closingBalance >= 0 ? "text-purple-600" : "text-orange-600"} text-sm font-medium`}>Closing Balance</p>
              <p className={`text-2xl font-bold ${closingBalance >= 0 ? "text-purple-800" : "text-orange-800"}`}>
                AED {formatCurrency(closingBalance, true)}
              </p>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-6">
            <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FileSpreadsheet size={20} /> Transaction Details
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-200 text-gray-700">
                    <th className="px-4 py-3 text-left font-semibold rounded-tl-lg">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                    <th className="px-4 py-3 text-left font-semibold">Invoice #</th>
                    <th className="px-4 py-3 text-left font-semibold">LPO No</th>
                    <th className="px-4 py-3 text-right font-semibold">Debit (AED)</th>
                    <th className="px-4 py-3 text-right font-semibold">Credit (AED)</th>
                    <th className="px-4 py-3 text-right font-semibold rounded-tr-lg">Balance (AED)</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                        No transactions found for the selected period
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-gray-200 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-purple-50 transition-colors`}
                      >
                        <td className="px-4 py-3 text-gray-700">{formatDate(t.date)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            t.type === "Sales Invoice" ? "bg-blue-100 text-blue-700" :
                            t.type === "Receipt" ? "bg-green-100 text-green-700" :
                            t.type === "Sales Return" ? "bg-orange-100 text-orange-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-mono">{t.reference}</td>
                        <td className="px-4 py-3 text-gray-600">{t.lpoNo || "-"}</td>
                        <td className="px-4 py-3 text-right font-medium text-blue-600">
                          {t.debit > 0 ? formatCurrency(t.debit) : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-green-600">
                          {t.credit > 0 ? formatCurrency(t.credit) : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800">
                          {formatCurrency(t.balance, true)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {transactions.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-200 font-bold">
                      <td colSpan="4" className="px-4 py-3 text-right">TOTALS</td>
                      <td className="px-4 py-3 text-right text-blue-700">
                        {formatCurrency(totals?.totalDebit, true)}
                      </td>
                      <td className="px-4 py-3 text-right text-green-700">
                        {formatCurrency(totals?.totalCredit, true)}
                      </td>
                      <td className="px-4 py-3 text-right text-purple-700">
                        {formatCurrency(closingBalance, true)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Excess/Partial Payments Section */}
          {excessPayments && excessPayments.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <h4 className="text-lg font-bold text-amber-800 mb-4 flex items-center gap-2">
                <AlertCircle size={20} /> Excess / Partial Payments
              </h4>
              <p className="text-amber-700 text-sm mb-4">
                The following payments are partial or advance payments not fully allocated to invoices.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-amber-100 text-amber-800">
                      <th className="px-4 py-3 text-left font-semibold rounded-tl-lg">Date</th>
                      <th className="px-4 py-3 text-left font-semibold">Voucher No</th>
                      <th className="px-4 py-3 text-left font-semibold">Description</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount (AED)</th>
                      <th className="px-4 py-3 text-center font-semibold rounded-tr-lg">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excessPayments.map((e, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-amber-200 ${idx % 2 === 0 ? "bg-white" : "bg-amber-50"}`}
                      >
                        <td className="px-4 py-3 text-gray-700">{formatDate(e.date)}</td>
                        <td className="px-4 py-3 text-gray-700 font-mono">{e.voucherNo}</td>
                        <td className="px-4 py-3 text-gray-600">{e.description}</td>
                        <td className="px-4 py-3 text-right font-medium text-amber-700">
                          {formatCurrency(e.amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            e.isPartial ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {e.isPartial ? "Partial" : "Advance"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-amber-100 font-bold">
                      <td colSpan="3" className="px-4 py-3 text-right">Total Excess Amount</td>
                      <td className="px-4 py-3 text-right text-amber-800">
                        {formatCurrency(excessTotal, true)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-100 p-4 flex justify-between items-center border-t flex-shrink-0">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{summary?.totalInvoices || 0}</span> Invoices | 
            <span className="font-medium ml-1">{summary?.totalReceipts || 0}</span> Receipts | 
            <span className="font-medium ml-1">{summary?.totalReturns || 0}</span> Returns
          </div>
          <div className="flex gap-3">
            <button
              onClick={onExportPDF}
              disabled={isExportingPDF}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-rose-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isExportingPDF ? <Loader2 size={20} className="animate-spin" /> : <FileDown size={20} />}
              {isExportingPDF ? "Exporting..." : "Export PDF"}
            </button>
            <button
              onClick={onExportExcel}
              disabled={isExporting}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
              {isExporting ? "Exporting..." : "Export Excel"}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
const StatementOfAccount = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statement, setStatement] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  // Show toast notification
  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 4000);
  };

  // Fetch customers on mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axiosInstance.get("/reports/statement-of-account/customers");
      if (response.data.success) {
        setCustomers(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      showToast("Failed to load customers", "error");
    }
  };

  // Generate statement
  const handleGenerateStatement = async () => {
    if (!selectedCustomer) {
      showToast("Please select a customer", "error");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosInstance.post("/reports/statement-of-account/generate", {
        customerId: selectedCustomer.value,
        fromDate: fromDate || null,
        toDate: toDate || null,
      });

      if (response.data.success) {
        setStatement(response.data.data);
        setShowModal(true);
        showToast("Statement generated successfully!", "success");
      }
    } catch (error) {
      console.error("Failed to generate statement:", error);
      showToast(error.response?.data?.message || "Failed to generate statement", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    if (!statement) return;

    setIsExporting(true);
    try {
      await exportStatementOfAccountExcel(statement);
      showToast("Excel exported successfully!", "success");
    } catch (error) {
      console.error("Failed to export Excel:", error);
      showToast("Failed to export Excel", "error");
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    if (!statement) return;

    setIsExportingPDF(true);
    try {
      await exportStatementOfAccountPDF(statement, axiosInstance);
      showToast("PDF exported successfully!", "success");
    } catch (error) {
      console.error("Failed to export PDF:", error);
      showToast("Failed to export PDF", "error");
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Customer options for select
  const customerOptions = customers.map((c) => ({
    value: c._id,
    label: `${c.customerName} (${c.customerId})`,
    customer: c,
  }));

  // Custom select styles
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      borderRadius: "0.75rem",
      borderColor: state.isFocused ? "#8b5cf6" : "#d1d5db",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(139, 92, 246, 0.2)" : "none",
      padding: "0.25rem",
      "&:hover": { borderColor: "#8b5cf6" },
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? "#8b5cf6" : state.isFocused ? "#f3e8ff" : "white",
      color: state.isSelected ? "white" : "#374151",
      cursor: "pointer",
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, zIndex: 9999 }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-100 p-4 sm:p-6">
      <Toast {...toast} />

      {/* Page Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-3xl shadow-2xl p-8 mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-4">
              <FileText size={32} /> Statement of Account
            </h1>
            <p className="text-purple-100 mt-2 text-lg">
              Generate customer statements with transaction history
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Building2 size={24} className="text-purple-200" />
            <span className="text-purple-100">Reports Module</span>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl p-8 mb-8 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Search size={24} className="text-purple-600" /> Generate Statement
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Customer Select */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <User size={16} className="inline mr-2" />
              Select Customer *
            </label>
            <Select
              options={customerOptions}
              value={selectedCustomer}
              onChange={setSelectedCustomer}
              placeholder="Search and select customer..."
              isClearable
              isSearchable
              styles={selectStyles}
              menuPortalTarget={document.body}
            />
          </div>

          {/* From Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-2" />
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-2" />
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mt-8">
          <button
            onClick={handleGenerateStatement}
            disabled={isLoading || !selectedCustomer}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <FileText size={20} />
            )}
            {isLoading ? "Generating..." : "Generate Statement"}
          </button>

          <button
            onClick={() => {
              setSelectedCustomer(null);
              setFromDate("");
              setToDate("");
              setStatement(null);
            }}
            className="px-6 py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all flex items-center gap-2"
          >
            <RefreshCw size={20} /> Clear
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {statement && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <User size={24} className="text-purple-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Customer</p>
                <p className="text-lg font-bold text-gray-800 truncate max-w-[150px]">
                  {statement.customer?.customerName}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <TrendingUp size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Total Debit</p>
                <p className="text-lg font-bold text-blue-600">
                  AED {formatCurrency(statement.totals?.totalDebit, true)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <TrendingDown size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Total Credit</p>
                <p className="text-lg font-bold text-green-600">
                  AED {formatCurrency(statement.totals?.totalCredit, true)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-amber-500">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-xl">
                <DollarSign size={24} className="text-amber-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Balance Due</p>
                <p className="text-lg font-bold text-amber-600">
                  AED {formatCurrency(statement.closingBalance, true)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Statement Button */}
      {statement && (
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl p-8 border border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Statement Ready</h3>
              <p className="text-gray-600">
                Statement for {statement.customer?.customerName} has been generated
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-2"
              >
                <FileText size={20} /> View Statement
              </button>
              <button
                onClick={handleExportPDF}
                disabled={isExportingPDF}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-rose-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isExportingPDF ? <Loader2 size={20} className="animate-spin" /> : <FileDown size={20} />}
                {isExportingPDF ? "Exporting..." : "Download PDF"}
              </button>
              <button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                {isExporting ? "Exporting..." : "Download Excel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statement View Modal */}
      <StatementViewModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        statement={statement}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        isExporting={isExporting}
        isExportingPDF={isExportingPDF}
      />
    </div>
  );
};

export default StatementOfAccount;
