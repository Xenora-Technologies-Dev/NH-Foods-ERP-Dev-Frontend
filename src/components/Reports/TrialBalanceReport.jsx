import React, { useState, useEffect } from "react";
import {
  FileText,
  DollarSign,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  Eye,
  Calendar,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  History,
  Building2,
} from "lucide-react";
import axiosInstance from "../../axios/axios";
import Select from "react-select";
import { exportTrialBalanceExcel } from "../../utils/excelExport";

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

// Currency formatter - Standard ERP format
const formatCurrency = (amount, showZero = false) => {
  const num = Number(amount) || 0;
  if (!showZero && Math.abs(num) < 0.01) return "-";
  return new Intl.NumberFormat('en-AE', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));
};

// Period selector modal
const PeriodSelectorModal = ({ isOpen, onClose, onGenerate, isLoading }) => {
  const [periodType, setPeriodType] = useState("yearly");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: currentYear - i,
    label: String(currentYear - i),
  }));

  const monthOptions = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const handleSubmit = () => {
    onGenerate({
      periodType,
      year,
      month: periodType === "monthly" ? month : null,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <FileText size={24} /> Trial Balance
          </h3>
          <p className="text-blue-100 mt-2 text-sm">Select period to generate report</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Period Type
            </label>
            <div className="flex gap-3">
              {["yearly", "monthly"].map((type) => (
                <button
                  key={type}
                  onClick={() => setPeriodType(type)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    periodType === type
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Financial Year
            </label>
            <Select
              options={yearOptions}
              value={yearOptions.find((o) => o.value === year)}
              onChange={(option) => setYear(option.value)}
              isSearchable={false}
              classNamePrefix="react-select"
              styles={{
                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                menu: (base) => ({ ...base, zIndex: 9999 }),
              }}
              menuPortalTarget={document.body}
            />
          </div>

          {periodType === "monthly" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Month
              </label>
              <Select
                options={monthOptions}
                value={monthOptions.find((o) => o.value === month)}
                onChange={(option) => setMonth(option.value)}
                isSearchable={false}
                classNamePrefix="react-select"
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  menu: (base) => ({ ...base, zIndex: 9999 }),
                }}
                menuPortalTarget={document.body}
              />
            </div>
          )}

          <div className="pt-4 space-y-2">
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
              {isLoading ? "Generating..." : "Generate Report"}
            </button>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-full py-2 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:border-gray-400 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Standard ERP Report View Modal
const ReportViewModal = ({ isOpen, onClose, report, isLoading }) => {
  const [viewMode, setViewMode] = useState("grouped"); // 'grouped' or 'detailed'
  const [sortBy, setSortBy] = useState("code");

  if (!isOpen || !report) return null;

  // Sort accounts
  const sortedAccounts = [...(report.accounts || [])].sort((a, b) => {
    if (sortBy === "code") return (a.accountCode || "").localeCompare(b.accountCode || "");
    if (sortBy === "name") return a.accountName.localeCompare(b.accountName);
    if (sortBy === "debit") return (b.debitBalance || 0) - (a.debitBalance || 0);
    if (sortBy === "credit") return (b.creditBalance || 0) - (a.creditBalance || 0);
    return 0;
  });

  const typeLabels = {
    asset: { label: "ASSETS", color: "blue" },
    liability: { label: "LIABILITIES", color: "orange" },
    equity: { label: "EQUITY", color: "purple" },
    revenue: { label: "REVENUE", color: "green" },
    income: { label: "REVENUE", color: "green" },
    expense: { label: "EXPENSES", color: "red" },
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Report Header - Standard ERP Style */}
        <div className="bg-white border-b-2 border-gray-200 p-6 flex-shrink-0">
          <div className="flex justify-between items-start">
            <div className="text-center flex-1">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Building2 size={24} className="text-blue-600" />
                <h2 className="text-xl font-bold text-gray-800">
                  {report.companyInfo?.name || "Trade ERP Nexus"}
                </h2>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
                TRIAL BALANCE
              </h1>
              <p className="text-gray-600 mt-1 text-lg">
                For the period: {report.dateRange?.label || ""}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Generated on: {new Date(report.generatedDate).toLocaleDateString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric'
                })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Balance Status */}
          <div className={`p-4 rounded-xl border-2 ${
            report.totals?.isBalanced
              ? "bg-emerald-50 border-emerald-300"
              : "bg-yellow-50 border-yellow-300"
          }`}>
            <div className="flex items-center gap-2">
              {report.totals?.isBalanced ? (
                <CheckCircle size={24} className="text-emerald-600" />
              ) : (
                <AlertCircle size={24} className="text-yellow-600" />
              )}
              <div>
                <span className="font-bold text-lg">
                  {report.totals?.isBalanced ? "✓ Trial Balance is Balanced" : "⚠ Trial Balance is NOT Balanced"}
                </span>
                {!report.totals?.isBalanced && (
                  <p className="text-sm text-gray-600">
                    Difference: AED {formatCurrency(report.totals?.difference)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* View Controls */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("grouped")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === "grouped"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Grouped View
              </button>
              <button
                onClick={() => setViewMode("detailed")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === "detailed"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Detailed View
              </button>
            </div>
            
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-600">Sort by:</span>
              {["code", "name", "debit", "credit"].map((option) => (
                <button
                  key={option}
                  onClick={() => setSortBy(option)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                    sortBy === option
                      ? "bg-gray-800 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Trial Balance Table - Standard ERP Format */}
          <div className="overflow-x-auto border-2 border-gray-200 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="px-4 py-3 text-left font-bold w-24">Code</th>
                  <th className="px-4 py-3 text-left font-bold">Account Name</th>
                  <th className="px-4 py-3 text-right font-bold w-40">Debit (AED)</th>
                  <th className="px-4 py-3 text-right font-bold w-40">Credit (AED)</th>
                </tr>
              </thead>
              <tbody>
                {viewMode === "grouped" ? (
                  // Grouped View - Like Tally/SAP
                  Object.entries(report.grouped || {}).map(([type, data]) => {
                    const typeInfo = typeLabels[type] || { label: type.toUpperCase(), color: "gray" };
                    const accounts = data.accounts || [];
                    if (accounts.length === 0) return null;
                    
                    return (
                      <React.Fragment key={type}>
                        {/* Group Header */}
                        <tr className={`bg-${typeInfo.color}-100 border-t-2 border-${typeInfo.color}-300`}>
                          <td colSpan="4" className="px-4 py-2 font-bold text-gray-800">
                            {typeInfo.label}
                          </td>
                        </tr>
                        {/* Group Accounts */}
                        {accounts.map((account, idx) => (
                          <tr
                            key={account._id || idx}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-2 font-mono text-gray-600 text-xs">
                              {account.accountCode || "-"}
                            </td>
                            <td className="px-4 py-2 text-gray-900 pl-8">
                              {account.accountName}
                            </td>
                            <td className="px-4 py-2 text-right font-mono">
                              {account.debitBalance > 0.01 ? formatCurrency(account.debitBalance) : "-"}
                            </td>
                            <td className="px-4 py-2 text-right font-mono">
                              {account.creditBalance > 0.01 ? formatCurrency(account.creditBalance) : "-"}
                            </td>
                          </tr>
                        ))}
                        {/* Group Subtotal */}
                        <tr className={`bg-${typeInfo.color}-50 border-b-2 border-${typeInfo.color}-200`}>
                          <td colSpan="2" className="px-4 py-2 font-semibold text-gray-700 text-right">
                            Subtotal - {typeInfo.label}:
                          </td>
                          <td className="px-4 py-2 text-right font-bold font-mono">
                            {data.subtotal?.debit > 0.01 ? formatCurrency(data.subtotal.debit) : "-"}
                          </td>
                          <td className="px-4 py-2 text-right font-bold font-mono">
                            {data.subtotal?.credit > 0.01 ? formatCurrency(data.subtotal.credit) : "-"}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })
                ) : (
                  // Detailed View - All accounts in one list
                  sortedAccounts.map((account, idx) => (
                    <tr
                      key={account._id || idx}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-2 font-mono text-gray-600 text-xs">
                        {account.accountCode || "-"}
                      </td>
                      <td className="px-4 py-2">
                        <div>
                          <span className="text-gray-900">{account.accountName}</span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                            account.accountType === 'asset' ? 'bg-blue-100 text-blue-800' :
                            account.accountType === 'liability' ? 'bg-orange-100 text-orange-800' :
                            account.accountType === 'equity' ? 'bg-purple-100 text-purple-800' :
                            account.accountType === 'revenue' || account.accountType === 'income' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {account.accountType}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {account.debitBalance > 0.01 ? formatCurrency(account.debitBalance) : "-"}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {account.creditBalance > 0.01 ? formatCurrency(account.creditBalance) : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* Grand Total Footer */}
              <tfoot>
                <tr className="bg-gray-800 text-white font-bold">
                  <td colSpan="2" className="px-4 py-3 text-right text-lg">
                    GRAND TOTAL
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-lg">
                    {formatCurrency(report.totals?.totalDebit, true)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-lg">
                    {formatCurrency(report.totals?.totalCredit, true)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <p className="text-sm text-gray-600">Total Accounts</p>
              <p className="text-2xl font-bold text-blue-700">{report.totals?.totalAccounts || 0}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <p className="text-sm text-gray-600">Active Accounts</p>
              <p className="text-2xl font-bold text-green-700">{report.totals?.activeAccounts || 0}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
              <p className="text-sm text-gray-600">Total Debit</p>
              <p className="text-lg font-bold text-purple-700">AED {formatCurrency(report.totals?.totalDebit, true)}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <p className="text-sm text-gray-600">Total Credit</p>
              <p className="text-lg font-bold text-orange-700">AED {formatCurrency(report.totals?.totalCredit, true)}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex gap-3 flex-wrap p-6 border-t bg-gray-50 flex-shrink-0">
          <button
            onClick={() => exportTrialBalanceExcel(report)}
            className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2"
          >
            <Download size={20} /> Export to Excel
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-gray-400 transition-colors bg-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Component
const TrialBalanceReport = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [savedReports, setSavedReports] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  // Load saved reports from server on mount
  useEffect(() => {
    loadSavedReports();
  }, []);

  const loadSavedReports = async () => {
    try {
      setLoadingSaved(true);
      const response = await axiosInstance.get("/reports/saved", {
        params: { reportType: 'trial_balance', limit: 10 }
      });
      if (response.data.success) {
        setSavedReports(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading saved reports:', error);
    } finally {
      setLoadingSaved(false);
    }
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  const handleGenerateReport = async (params) => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.post("/reports/trial-balance/generate", {
        periodType: params.periodType,
        year: params.year,
        month: params.month,
        save: true, // Save to server for cross-device access
      });

      if (response.data.success && response.data.data) {
        const report = response.data.data;
        console.log('Generated report:', report); // Debug log
        setCurrentReport(report);
        setIsModalOpen(false);
        setIsViewOpen(true);
        loadSavedReports(); // Refresh saved reports list
        showToast("Trial Balance generated successfully!", "success");
      } else {
        showToast("Report generated but no data returned", "error");
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to generate report", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedReport = async (reportId) => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get(`/reports/saved/${reportId}`);
      if (response.data.success && response.data.data) {
        const reportData = response.data.data.reportData;
        if (reportData) {
          setCurrentReport(reportData);
          setIsViewOpen(true);
        } else {
          showToast("Report data is empty", "error");
        }
      } else {
        showToast("Failed to load report data", "error");
      }
    } catch (error) {
      console.error('Error loading report:', error);
      showToast(error.response?.data?.message || "Failed to load report", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAndDownloadReport = async (reportId) => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get(`/reports/saved/${reportId}`);
      if (response.data.success && response.data.data?.reportData) {
        exportTrialBalanceExcel(response.data.data.reportData);
        showToast("Excel downloaded successfully!", "success");
      } else {
        showToast("Failed to download report", "error");
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      showToast("Failed to download report", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3 mb-2">
            <FileText size={36} className="text-blue-600" />
            Trial Balance
          </h1>
          <p className="text-gray-600">
            Generate standard Trial Balance reports showing all account balances with debit/credit verification
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg flex items-center gap-2"
          >
            <FileText size={20} /> Generate New Report
          </button>
          <button
            onClick={loadSavedReports}
            disabled={loadingSaved}
            className="px-6 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-gray-300 transition-all flex items-center gap-2"
          >
            <RefreshCw size={20} className={loadingSaved ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-blue-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Report Type</p>
                <p className="text-xl font-bold text-gray-900 mt-1">Trial Balance</p>
              </div>
              <FileText size={32} className="text-blue-600 opacity-30" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-indigo-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Format</p>
                <p className="text-xl font-bold text-gray-900 mt-1">Standard ERP</p>
              </div>
              <Building2 size={32} className="text-indigo-600 opacity-30" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-emerald-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Purpose</p>
                <p className="text-xl font-bold text-gray-900 mt-1">Balance Verification</p>
              </div>
              <CheckCircle size={32} className="text-emerald-600 opacity-30" />
            </div>
          </div>
        </div>

        {/* Saved Reports - From Server (Cross-device accessible) */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <History size={24} className="text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Saved Reports</h2>
            <span className="text-sm text-gray-500">(Available across all devices)</span>
          </div>
          
          {loadingSaved ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={32} className="animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading reports...</span>
            </div>
          ) : savedReports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Period</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Generated</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Debit</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Credit</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedReports.map((item) => (
                    <tr key={item._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {item.periodType === "yearly" ? `Year ${item.year}` : 
                         `${new Date(0, item.month - 1).toLocaleString('default', { month: 'short' })} ${item.year}`}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          {item.periodType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {new Date(item.generatedAt).toLocaleDateString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900">
                        {formatCurrency(item.summary?.totalDebit, true)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900">
                        {formatCurrency(item.summary?.totalCredit, true)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.summary?.isBalanced ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle size={16} /> Balanced
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-yellow-600">
                            <AlertCircle size={16} /> Unbalanced
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => loadSavedReport(item._id)}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            <Eye size={16} /> View
                          </button>
                          <button
                            onClick={() => loadAndDownloadReport(item._id)}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            <Download size={16} /> Excel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText size={48} className="mx-auto mb-4 opacity-30" />
              <p>No saved reports yet. Generate your first Trial Balance report!</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <PeriodSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGenerate={handleGenerateReport}
        isLoading={isLoading}
      />

      <ReportViewModal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        report={currentReport}
        isLoading={isLoading}
      />

      {/* Toast */}
      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  );
};

export default TrialBalanceReport;
