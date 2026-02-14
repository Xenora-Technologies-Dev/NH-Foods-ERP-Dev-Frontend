import React, { useState } from "react";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  Eye,
  Package,
  FileSpreadsheet,
  FileText,
  X,
  Search,
  ArrowUpDown,
} from "lucide-react";
import axiosInstance from "../../axios/axios";
import { exportItemProfitabilityExcel } from "../../utils/excelExport";
import { exportItemProfitabilityPDF } from "../../utils/pdfExport";

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
  }).format(Math.abs(num));
};

// Date Range Selector Modal
const DateRangeSelectorModal = ({ isOpen, onClose, onGenerate, isLoading }) => {
  const [rangeType, setRangeType] = useState("all"); // "all" | "custom"
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (rangeType === "custom" && !fromDate && !toDate) {
      return;
    }
    onGenerate({
      fromDate: rangeType === "custom" ? fromDate : null,
      toDate: rangeType === "custom" ? toDate : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar size={24} className="text-indigo-600" />
            Select Date Range
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Range Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Report Period</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setRangeType("all")}
                className={`px-4 py-3 rounded-xl font-medium text-sm border-2 transition-all ${
                  rangeType === "all"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setRangeType("custom")}
                className={`px-4 py-3 rounded-xl font-medium text-sm border-2 transition-all ${
                  rangeType === "custom"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {/* Date Range Inputs */}
          {rangeType === "custom" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isLoading || (rangeType === "custom" && !fromDate && !toDate)}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Generating...
              </>
            ) : (
              <>
                <BarChart3 size={18} /> Generate Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Report View Modal
const ReportViewModal = ({ isOpen, onClose, report, isLoading, onExportExcel, onExportPDF }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("profitLoss");
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterType, setFilterType] = useState("all"); // "all" | "profit" | "loss"

  if (!isOpen || !report) return null;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Filter and sort items
  let filteredItems = (report.items || []).filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterType === "all" ||
      (filterType === "profit" && item.isProfitable) ||
      (filterType === "loss" && !item.isProfitable);

    return matchesSearch && matchesFilter;
  });

  filteredItems = [...filteredItems].sort((a, b) => {
    const aVal = a[sortField] ?? 0;
    const bVal = b[sortField] ?? 0;
    if (typeof aVal === "string") {
      return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
  });

  const summary = report.summary || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1400px] max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="text-center mb-4">
            <h2 className="text-sm text-gray-500 uppercase tracking-wider font-medium">
              NH FOODSTUFF TRADING LLC S.O.C.
            </h2>
            <p className="text-xs text-gray-400">Dubai, UAE</p>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mt-3 uppercase tracking-wide">
              Item Profitability Analysis Report
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Period: {report.dateRange?.label || "All Time"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Generated: {new Date(report.generatedAt).toLocaleString("en-GB")}
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
              <p className="text-xs text-blue-600 font-medium">Total Items</p>
              <p className="text-xl font-bold text-blue-900">{summary.totalItems || 0}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
              <p className="text-xs text-emerald-600 font-medium">Profitable Items</p>
              <p className="text-xl font-bold text-emerald-900">{summary.profitableItems || 0}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 border border-red-200">
              <p className="text-xs text-red-600 font-medium">Loss Items</p>
              <p className="text-xl font-bold text-red-900">{summary.lossItems || 0}</p>
            </div>
            <div className={`rounded-xl p-3 border ${(summary.totalProfit || 0) >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <p className={`text-xs font-medium ${(summary.totalProfit || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                Overall {(summary.totalProfit || 0) >= 0 ? "Profit" : "Loss"}
              </p>
              <p className={`text-xl font-bold ${(summary.totalProfit || 0) >= 0 ? "text-emerald-900" : "text-red-900"}`}>
                AED {formatCurrency(summary.totalProfit, true)}
              </p>
              <p className={`text-xs font-medium ${(summary.overallProfitPercentage || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                ({(summary.overallProfitPercentage || 0).toFixed(2)}%)
              </p>
            </div>
          </div>

          {/* Sub summary row */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
              <p className="text-xs text-orange-600 font-medium">Total Purchase Value</p>
              <p className="text-lg font-bold text-orange-900">AED {formatCurrency(summary.totalPurchaseValue, true)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
              <p className="text-xs text-blue-600 font-medium">Total Sales Value</p>
              <p className="text-lg font-bold text-blue-900">AED {formatCurrency(summary.totalSalesValue, true)}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by item name, code, or category..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              {[
                { key: "all", label: "All" },
                { key: "profit", label: "Profitable" },
                { key: "loss", label: "Loss" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilterType(f.key)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                    filterType === f.key
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b-2 border-gray-200">
                {[
                  { key: "itemCode", label: "Item Code", align: "left" },
                  { key: "itemName", label: "Item Name", align: "left" },
                  { key: "category", label: "Category", align: "left" },
                  { key: "uom", label: "UOM", align: "center" },
                  { key: "purchaseQty", label: "Purchase Qty", align: "right" },
                  { key: "salesQty", label: "Sales Qty", align: "right" },
                  { key: "avgPurchasePrice", label: "Avg Purchase", align: "right" },
                  { key: "avgSalesPrice", label: "Avg Sales", align: "right" },
                  { key: "totalPurchaseValue", label: "Total Purchase", align: "right" },
                  { key: "totalSalesValue", label: "Total Sales", align: "right" },
                  { key: "profitLoss", label: "Profit/Loss", align: "right" },
                  { key: "profitPercentage", label: "Margin %", align: "right" },
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`px-3 py-3 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none whitespace-nowrap ${
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortField === col.key && (
                        <ArrowUpDown size={12} className="text-indigo-600" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-gray-500">
                    <Package size={48} className="mx-auto mb-3 opacity-30" />
                    <p>No items found matching your criteria</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr
                    key={item.itemId || idx}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      item.isProfitable ? "" : "bg-red-50/30"
                    }`}
                  >
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-600">{item.itemCode || "-"}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-900 max-w-[200px] truncate" title={item.itemName}>
                      {item.itemName}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{item.category || "-"}</td>
                    <td className="px-3 py-2.5 text-center text-gray-600">{item.uom || "-"}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{item.purchaseQty}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{item.salesQty}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-orange-700">
                      {formatCurrency(item.avgPurchasePrice, true)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-blue-700">
                      {formatCurrency(item.avgSalesPrice, true)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-orange-700">
                      {formatCurrency(item.totalPurchaseValue, true)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-blue-700">
                      {formatCurrency(item.totalSalesValue, true)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-mono font-bold ${
                        item.isProfitable ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {item.isProfitable ? (
                          <TrendingUp size={14} className="text-emerald-500" />
                        ) : (
                          <TrendingDown size={14} className="text-red-500" />
                        )}
                        {item.profitLoss < 0 ? "-" : ""}
                        {formatCurrency(item.profitLoss, true)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                          item.isProfitable
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.profitPercentage >= 0 ? "+" : ""}
                        {item.profitPercentage.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Showing {filteredItems.length} of {(report.items || []).length} items
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
            <button
              onClick={onExportExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium shadow active:scale-95 min-h-[44px]"
            >
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button
              onClick={onExportPDF}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow active:scale-95 min-h-[44px]"
            >
              <FileText size={16} /> PDF
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium border border-gray-300 active:scale-95 min-h-[44px]"
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
const ItemProfitabilityReport = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  // Report history - stores previously generated reports
  const [reportHistory, setReportHistory] = useState([]);

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  const handleGenerateReport = async (params) => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.post("/reports/item-profitability/generate", {
        fromDate: params.fromDate,
        toDate: params.toDate,
      });

      if (response.data.success && response.data.data) {
        const report = response.data.data;
        setCurrentReport(report);
        // Add to history (avoid duplicates by generatedAt timestamp)
        setReportHistory((prev) => {
          const exists = prev.find((r) => r.generatedAt === report.generatedAt);
          if (exists) return prev;
          return [report, ...prev].slice(0, 20); // keep last 20 reports
        });
        setIsModalOpen(false);
        setIsViewOpen(true);
        showToast("Item Profitability Report generated successfully!", "success");
      } else {
        showToast("Report generated but no data returned", "error");
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to generate report", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewReport = (report) => {
    setCurrentReport(report);
    setIsViewOpen(true);
  };

  const handleExportExcelForReport = (report) => {
    try {
      exportItemProfitabilityExcel(report);
      showToast("Excel report downloaded successfully!", "success");
    } catch (err) {
      console.error("Excel export error:", err);
      showToast("Failed to export Excel", "error");
    }
  };

  const handleExportPDFForReport = (report) => {
    try {
      exportItemProfitabilityPDF(report);
      showToast("PDF report downloaded successfully!", "success");
    } catch (err) {
      console.error("PDF export error:", err);
      showToast("Failed to export PDF", "error");
    }
  };

  const handleExportExcel = () => {
    if (currentReport) handleExportExcelForReport(currentReport);
  };

  const handleExportPDF = () => {
    if (currentReport) handleExportPDFForReport(currentReport);
  };

  const handleDeleteReport = (index) => {
    setReportHistory((prev) => prev.filter((_, i) => i !== index));
    showToast("Report removed from history", "success");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 flex items-center gap-3 mb-2">
            <BarChart3 size={28} className="text-indigo-600 sm:w-9 sm:h-9" />
            Item Profitability Analysis
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Analyze individual item performance by comparing purchase and sales values to identify profitable and loss-making items
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6 sm:mb-8">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg flex items-center gap-2 text-sm sm:text-base active:scale-95"
          >
            <BarChart3 size={20} /> Generate New Report
          </button>
        </div>

        {/* Previously Generated Reports */}
        {reportHistory.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-indigo-600" />
              Previously Generated Reports
            </h2>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left px-3 py-3 font-semibold text-gray-700">#</th>
                    <th className="text-left px-3 py-3 font-semibold text-gray-700">Period</th>
                    <th className="text-left px-3 py-3 font-semibold text-gray-700">Generated At</th>
                    <th className="text-center px-3 py-3 font-semibold text-gray-700">Items</th>
                    <th className="text-right px-3 py-3 font-semibold text-gray-700">Overall P/L</th>
                    <th className="text-center px-3 py-3 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportHistory.map((report, idx) => {
                    const summary = report.summary || {};
                    const overallPL = summary.totalProfit || 0;
                    return (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-3 text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-3 font-medium text-gray-800">
                          {report.dateRange?.label || "All Time"}
                        </td>
                        <td className="px-3 py-3 text-gray-600">
                          {new Date(report.generatedAt).toLocaleString("en-GB", {
                            day: "2-digit", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                        <td className="px-3 py-3 text-center">{summary.totalItems || 0}</td>
                        <td className={`px-3 py-3 text-right font-bold ${overallPL >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                          {overallPL >= 0 ? "+" : ""}{formatCurrency(overallPL, true)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
                            <button
                              onClick={() => handleViewReport(report)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-xs font-medium border border-indigo-200 active:scale-95"
                              title="View Report"
                            >
                              <Eye size={14} /> View
                            </button>
                            <button
                              onClick={() => handleExportPDFForReport(report)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium border border-red-200 active:scale-95"
                              title="Download PDF"
                            >
                              <FileText size={14} /> PDF
                            </button>
                            <button
                              onClick={() => handleExportExcelForReport(report)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-xs font-medium border border-emerald-200 active:scale-95"
                              title="Download Excel"
                            >
                              <FileSpreadsheet size={14} /> Excel
                            </button>
                            <button
                              onClick={() => handleDeleteReport(idx)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-gray-400 rounded-lg hover:bg-gray-100 hover:text-red-500 transition-colors text-xs active:scale-95"
                              title="Remove from history"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8">
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg border-l-4 border-indigo-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Analysis</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 mt-1">Purchase vs Sales</p>
              </div>
              <Package size={28} className="text-indigo-600 opacity-30" />
            </div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg border-l-4 border-emerald-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Profitability</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 mt-1">Item-Level Margins</p>
              </div>
              <TrendingUp size={28} className="text-emerald-600 opacity-30" />
            </div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg border-l-4 border-purple-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Export</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 mt-1">Excel & PDF</p>
              </div>
              <FileSpreadsheet size={28} className="text-purple-600 opacity-30" />
            </div>
          </div>
        </div>

        {/* Quick Guide */}
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Eye size={24} className="text-indigo-600" />
            How to Use
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">1</span>
              <p>Click <strong>"Generate New Report"</strong> and select date range or "All Time" for complete analysis</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">2</span>
              <p>Review items with <span className="text-emerald-600 font-semibold">green (profit)</span> and <span className="text-red-600 font-semibold">red (loss)</span> indicators showing margin percentage</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">3</span>
              <p>Export to <strong>Excel</strong> or <strong>PDF</strong> with date-time stamped filenames for record keeping</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DateRangeSelectorModal
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
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
      />

      {/* Toast */}
      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  );
};

export default ItemProfitabilityReport;
