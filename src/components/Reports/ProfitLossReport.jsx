import React, { useState, useEffect } from "react";
import {
  FileText,
  DollarSign,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  Eye,
  Building2,
  RefreshCw,
  History,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import axiosInstance from "../../axios/axios";
import Select from "react-select";
import { exportProfitLossExcel } from "../../utils/excelExport";

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

// Currency formatter - Standard ERP format (Right-aligned, no symbol in cell)
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
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 text-white">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 size={24} /> Income Statement
          </h3>
          <p className="text-orange-100 mt-2 text-sm">Profit & Loss Report</p>
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
                      ? "bg-orange-600 text-white"
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
              className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-semibold hover:from-orange-700 hover:to-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <BarChart3 size={20} />}
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

// Collapsible Section Component for standard ERP report
const CollapsibleSection = ({ title, items, total, color, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const colorClasses = {
    green: { header: "bg-emerald-100 border-emerald-400", total: "text-emerald-800 bg-emerald-50" },
    red: { header: "bg-red-100 border-red-400", total: "text-red-800 bg-red-50" },
    blue: { header: "bg-blue-100 border-blue-400", total: "text-blue-800 bg-blue-50" },
    orange: { header: "bg-orange-100 border-orange-400", total: "text-orange-800 bg-orange-50" },
    purple: { header: "bg-purple-100 border-purple-400", total: "text-purple-800 bg-purple-50" },
    gray: { header: "bg-gray-100 border-gray-400", total: "text-gray-800 bg-gray-50" },
  };

  const colors = colorClasses[color] || colorClasses.gray;

  if (!items || items.length === 0) return null;

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-4 py-2 font-bold text-gray-800 border-l-4 ${colors.header} hover:opacity-90 transition-opacity`}
      >
        <span className="flex items-center gap-2">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          {title}
        </span>
        <span className="font-mono">{formatCurrency(total, true)}</span>
      </button>

      {isExpanded && (
        <div className="border-l-4 border-gray-200">
          {items.map((item, idx) => (
            <div
              key={item._id || idx}
              className="flex items-center justify-between px-4 py-2 pl-10 border-b border-gray-100 hover:bg-gray-50 text-sm"
            >
              <div>
                <span className="text-gray-900">{item.accountName}</span>
                {item.accountCode && (
                  <span className="ml-2 text-xs text-gray-500">({item.accountCode})</span>
                )}
              </div>
              <span className="font-mono text-gray-700">{formatCurrency(item.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Standard ERP Report View Modal - Tally/SAP/Odoo Style
const ReportViewModal = ({ isOpen, onClose, report, isLoading }) => {
  if (!isOpen || !report) return null;

  const isProfitable = (report.summary?.netProfit || 0) >= 0;
  const profitMargin = Number(report.summary?.profitMargin) || 0;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Report Header - Standard ERP Style */}
        <div className="bg-white border-b-2 border-gray-200 p-6 flex-shrink-0">
          <div className="flex justify-between items-start">
            <div className="text-center flex-1">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Building2 size={24} className="text-orange-600" />
                <h2 className="text-xl font-bold text-gray-800">
                  {report.companyInfo?.name || "Trade ERP Nexus"}
                </h2>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
                PROFIT & LOSS ACCOUNT
              </h1>
              <p className="text-gray-500 text-sm">(Income Statement)</p>
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
          {/* Standard P&L Statement Structure */}
          <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
            {/* Revenue Section */}
            <div className="bg-emerald-50 border-b-2 border-emerald-300 px-4 py-3">
              <h3 className="font-bold text-emerald-900 text-lg flex items-center gap-2">
                <TrendingUp size={20} /> REVENUE / INCOME
              </h3>
            </div>
            
            <div className="p-4 space-y-1">
              {/* Sales Revenue */}
              <CollapsibleSection
                title="Sales Revenue"
                items={report.revenue?.items?.filter(i => i.subType === 'sales' || !i.subType)}
                total={report.revenue?.items?.filter(i => i.subType === 'sales' || !i.subType)?.reduce((sum, i) => sum + (i.amount || 0), 0) || report.revenue?.total}
                color="green"
              />
              
              {/* Other Income */}
              {report.revenue?.items?.some(i => i.subType === 'other') && (
                <CollapsibleSection
                  title="Other Income"
                  items={report.revenue?.items?.filter(i => i.subType === 'other')}
                  total={report.revenue?.items?.filter(i => i.subType === 'other')?.reduce((sum, i) => sum + (i.amount || 0), 0)}
                  color="blue"
                />
              )}
              
              {/* Interest Income */}
              {report.revenue?.items?.some(i => i.subType === 'interest') && (
                <CollapsibleSection
                  title="Interest Income"
                  items={report.revenue?.items?.filter(i => i.subType === 'interest')}
                  total={report.revenue?.items?.filter(i => i.subType === 'interest')?.reduce((sum, i) => sum + (i.amount || 0), 0)}
                  color="purple"
                />
              )}

              <div className="flex justify-between px-4 py-3 font-bold text-lg border-t-2 border-emerald-300 bg-emerald-100">
                <span>TOTAL REVENUE (A)</span>
                <span className="font-mono text-emerald-800">AED {formatCurrency(report.summary?.totalRevenue, true)}</span>
              </div>
            </div>

            {/* Cost of Goods Sold Section */}
            {report.expenses?.cogs && report.expenses?.cogs.items && report.expenses.cogs.items.length > 0 && (
              <>
                <div className="bg-orange-50 border-y-2 border-orange-300 px-4 py-3">
                  <h3 className="font-bold text-orange-900 text-lg">COST OF GOODS SOLD</h3>
                </div>
                
                <div className="p-4 space-y-1">
                  <CollapsibleSection
                    title="Cost of Sales"
                    items={report.expenses?.cogs?.items}
                    total={report.expenses?.cogs?.total}
                    color="orange"
                  />

                  <div className="flex justify-between px-4 py-3 font-bold text-lg border-t-2 border-orange-300 bg-orange-100">
                    <span>TOTAL COGS (B)</span>
                    <span className="font-mono text-orange-800">AED {formatCurrency(report.expenses?.cogs?.total, true)}</span>
                  </div>
                </div>

                {/* Gross Profit Line */}
                <div className="flex justify-between px-4 py-4 font-bold text-xl bg-blue-100 border-y-2 border-blue-300">
                  <span>GROSS PROFIT (A - B)</span>
                  <span className="font-mono text-blue-800">AED {formatCurrency(report.summary?.grossProfit, true)}</span>
                </div>
              </>
            )}

            {/* Operating Expenses Section */}
            <div className="bg-red-50 border-y-2 border-red-300 px-4 py-3">
              <h3 className="font-bold text-red-900 text-lg flex items-center gap-2">
                <TrendingDown size={20} /> OPERATING EXPENSES
              </h3>
            </div>
            
            <div className="p-4 space-y-1">
              {/* Administrative Expenses */}
              <CollapsibleSection
                title="Administrative Expenses"
                items={report.expenses?.operating?.items?.filter(i => i.category === 'administrative') || report.expenses?.items?.filter(i => i.subType === 'administrative')}
                total={(report.expenses?.operating?.items?.filter(i => i.category === 'administrative') || report.expenses?.items?.filter(i => i.subType === 'administrative'))?.reduce((sum, i) => sum + (i.amount || 0), 0)}
                color="red"
                defaultExpanded={false}
              />
              
              {/* Selling & Distribution */}
              <CollapsibleSection
                title="Selling & Distribution"
                items={report.expenses?.operating?.items?.filter(i => i.category === 'selling') || report.expenses?.items?.filter(i => i.subType === 'selling')}
                total={(report.expenses?.operating?.items?.filter(i => i.category === 'selling') || report.expenses?.items?.filter(i => i.subType === 'selling'))?.reduce((sum, i) => sum + (i.amount || 0), 0)}
                color="red"
                defaultExpanded={false}
              />
              
              {/* General Operating Expenses */}
              <CollapsibleSection
                title="General Operating Expenses"
                items={report.expenses?.operating?.items || report.expenses?.items?.filter(i => !i.subType || i.subType === 'operating')}
                total={report.expenses?.operating?.total || report.expenses?.items?.filter(i => !i.subType || i.subType === 'operating')?.reduce((sum, i) => sum + (i.amount || 0), 0) || report.expenses?.total}
                color="red"
              />

              <div className="flex justify-between px-4 py-3 font-bold text-lg border-t-2 border-red-300 bg-red-100">
                <span>TOTAL OPERATING EXPENSES (C)</span>
                <span className="font-mono text-red-800">AED {formatCurrency(report.expenses?.operating?.total || report.summary?.totalExpenses, true)}</span>
              </div>
            </div>

            {/* Financial Expenses Section */}
            {report.expenses?.financial && report.expenses?.financial.total > 0 && (
              <>
                <div className="bg-purple-50 border-y-2 border-purple-300 px-4 py-3">
                  <h3 className="font-bold text-purple-900 text-lg">FINANCIAL EXPENSES</h3>
                </div>
                
                <div className="p-4 space-y-1">
                  <CollapsibleSection
                    title="Interest & Bank Charges"
                    items={report.expenses?.financial?.items}
                    total={report.expenses?.financial?.total}
                    color="purple"
                    defaultExpanded={false}
                  />

                  <div className="flex justify-between px-4 py-3 font-bold text-lg border-t-2 border-purple-300 bg-purple-100">
                    <span>TOTAL FINANCIAL EXPENSES (D)</span>
                    <span className="font-mono text-purple-800">AED {formatCurrency(report.expenses?.financial?.total, true)}</span>
                  </div>
                </div>
              </>
            )}

            {/* Other Expenses Section */}
            {report.expenses?.other && report.expenses?.other.total > 0 && (
              <>
                <div className="bg-gray-50 border-y-2 border-gray-300 px-4 py-3">
                  <h3 className="font-bold text-gray-900 text-lg">OTHER EXPENSES</h3>
                </div>
                
                <div className="p-4 space-y-1">
                  <CollapsibleSection
                    title="Miscellaneous Expenses"
                    items={report.expenses?.other?.items}
                    total={report.expenses?.other?.total}
                    color="gray"
                    defaultExpanded={false}
                  />

                  <div className="flex justify-between px-4 py-3 font-bold text-lg border-t-2 border-gray-300 bg-gray-100">
                    <span>TOTAL OTHER EXPENSES (E)</span>
                    <span className="font-mono text-gray-800">AED {formatCurrency(report.expenses?.other?.total, true)}</span>
                  </div>
                </div>
              </>
            )}

            {/* Total Expenses Line */}
            <div className="flex justify-between px-4 py-3 font-bold text-lg bg-red-200 border-y-2 border-red-400">
              <span>TOTAL EXPENSES (C + D + E)</span>
              <span className="font-mono text-red-900">AED {formatCurrency(report.summary?.totalExpenses, true)}</span>
            </div>

            {/* Net Profit/Loss - Final Line */}
            <div className={`flex justify-between px-4 py-5 font-bold text-xl ${
              isProfitable ? "bg-emerald-200 border-emerald-500" : "bg-red-300 border-red-500"
            } border-t-4`}>
              <span className="flex items-center gap-2">
                {isProfitable ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                {isProfitable ? "NET PROFIT" : "NET LOSS"} (A - B - C - D - E)
              </span>
              <span className={`font-mono ${isProfitable ? "text-emerald-900" : "text-red-900"}`}>
                AED {formatCurrency(report.summary?.netProfit, true)}
              </span>
            </div>
          </div>

          {/* Summary Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-xl font-bold text-emerald-700">AED {formatCurrency(report.summary?.totalRevenue, true)}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-xl border border-red-200">
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-xl font-bold text-red-700">AED {formatCurrency(report.summary?.totalExpenses, true)}</p>
            </div>
            <div className={`p-4 rounded-xl border ${isProfitable ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <p className="text-sm text-gray-600">{isProfitable ? "Net Profit" : "Net Loss"}</p>
              <p className={`text-xl font-bold ${isProfitable ? "text-emerald-700" : "text-red-700"}`}>
                AED {formatCurrency(report.summary?.netProfit, true)}
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <p className="text-sm text-gray-600">Profit Margin</p>
              <p className="text-xl font-bold text-blue-700">{profitMargin.toFixed(2)}%</p>
            </div>
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex gap-3 flex-wrap p-6 border-t bg-gray-50 flex-shrink-0">
          <button 
            onClick={() => exportProfitLossExcel(report)}
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
const ProfitLossReport = () => {
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
        params: { reportType: 'profit_loss', limit: 10 }
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
      const response = await axiosInstance.post("/reports/profit-loss/generate", {
        periodType: params.periodType,
        year: params.year,
        month: params.month,
        save: true, // Save to server for cross-device access
      });

      if (response.data.success && response.data.data) {
        const report = response.data.data;
        console.log('Generated P&L report:', report); // Debug log
        setCurrentReport(report);
        setIsModalOpen(false);
        setIsViewOpen(true);
        loadSavedReports(); // Refresh saved reports list
        showToast("Profit & Loss report generated successfully!", "success");
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
        exportProfitLossExcel(response.data.data.reportData);
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3 mb-2">
            <BarChart3 size={36} className="text-orange-600" />
            Profit & Loss Account
          </h1>
          <p className="text-gray-600">
            Generate standard Income Statement / P&L reports showing revenue, expenses, and net profit
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-semibold hover:from-orange-700 hover:to-red-700 transition-all shadow-lg flex items-center gap-2"
          >
            <BarChart3 size={20} /> Generate New Report
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
          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-emerald-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Revenue</p>
                <p className="text-xl font-bold text-gray-900 mt-1">Income Tracking</p>
              </div>
              <TrendingUp size={32} className="text-emerald-600 opacity-30" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-red-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Expenses</p>
                <p className="text-xl font-bold text-gray-900 mt-1">Cost Analysis</p>
              </div>
              <TrendingDown size={32} className="text-red-600 opacity-30" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-blue-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Format</p>
                <p className="text-xl font-bold text-gray-900 mt-1">Standard ERP</p>
              </div>
              <Building2 size={32} className="text-blue-600 opacity-30" />
            </div>
          </div>
        </div>

        {/* Saved Reports - From Server (Cross-device accessible) */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <History size={24} className="text-orange-600" />
            <h2 className="text-2xl font-bold text-gray-900">Saved Reports</h2>
            <span className="text-sm text-gray-500">(Available across all devices)</span>
          </div>
          
          {loadingSaved ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={32} className="animate-spin text-orange-600" />
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
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Revenue</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Expenses</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Net Profit</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedReports.map((item) => {
                    const netProfit = item.summary?.netProfit || 0;
                    const isProfitable = netProfit >= 0;
                    return (
                      <tr key={item._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-900 font-medium">
                          {item.periodType === "yearly" ? `Year ${item.year}` : 
                           `${new Date(0, item.month - 1).toLocaleString('default', { month: 'short' })} ${item.year}`}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <span className="inline-block bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                            {item.periodType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-sm">
                          {new Date(item.generatedAt).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-700">
                          {formatCurrency(item.summary?.totalRevenue, true)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-red-700">
                          {formatCurrency(item.summary?.totalExpenses, true)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${isProfitable ? "text-emerald-700" : "text-red-700"}`}>
                          {isProfitable ? "" : "-"}{formatCurrency(netProfit, true)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => loadSavedReport(item._id)}
                              disabled={isLoading}
                              className="inline-flex items-center gap-1 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50"
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 size={48} className="mx-auto mb-4 opacity-30" />
              <p>No saved reports yet. Generate your first P&L report!</p>
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

export default ProfitLossReport;
