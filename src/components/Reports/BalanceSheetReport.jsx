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
  Briefcase,
  AlertCircle,
  Eye,
  Building2,
  RefreshCw,
  History,
  ChevronRight,
  ChevronDown,
  Scale,
  Landmark,
  Wallet,
} from "lucide-react";
import axiosInstance from "../../axios/axios";
import Select from "react-select";
import { exportBalanceSheetExcel } from "../../utils/excelExport";

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
        <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6 text-white">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Scale size={24} /> Balance Sheet
          </h3>
          <p className="text-green-100 mt-2 text-sm">Statement of Financial Position</p>
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
                      ? "bg-green-600 text-white"
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
              className="w-full py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-teal-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Scale size={20} />}
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
const CollapsibleSection = ({ title, items, total, color, icon: Icon, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const colorClasses = {
    blue: { header: "bg-blue-100 border-blue-400 text-blue-900", total: "bg-blue-200 text-blue-800" },
    orange: { header: "bg-orange-100 border-orange-400 text-orange-900", total: "bg-orange-200 text-orange-800" },
    purple: { header: "bg-purple-100 border-purple-400 text-purple-900", total: "bg-purple-200 text-purple-800" },
    green: { header: "bg-green-100 border-green-400 text-green-900", total: "bg-green-200 text-green-800" },
    teal: { header: "bg-teal-100 border-teal-400 text-teal-900", total: "bg-teal-200 text-teal-800" },
    gray: { header: "bg-gray-100 border-gray-400 text-gray-900", total: "bg-gray-200 text-gray-800" },
  };

  const colors = colorClasses[color] || colorClasses.gray;

  if (!items || items.length === 0) return null;

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-4 py-2 font-semibold border-l-4 ${colors.header} hover:opacity-90 transition-opacity`}
      >
        <span className="flex items-center gap-2">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          {Icon && <Icon size={18} />}
          {title}
          <span className="text-xs font-normal opacity-70">({items.length} items)</span>
        </span>
        <span className="font-mono font-bold">{formatCurrency(total, true)}</span>
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
              <span className="font-mono text-gray-700">{formatCurrency(item.balance)}</span>
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

  const isBalanced = report.summary?.isBalanced;
  
  // Handle both old and new data structures
  const assets = report.assets || {};
  const liabilities = report.liabilities || {};
  const equity = report.equity || {};

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Report Header - Standard ERP Style */}
        <div className="bg-white border-b-2 border-gray-200 p-6 flex-shrink-0">
          <div className="flex justify-between items-start">
            <div className="text-center flex-1">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Building2 size={24} className="text-green-600" />
                <h2 className="text-xl font-bold text-gray-800">
                  {report.companyInfo?.name || "Trade ERP Nexus"}
                </h2>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
                BALANCE SHEET
              </h1>
              <p className="text-gray-500 text-sm">(Statement of Financial Position)</p>
              <p className="text-gray-600 mt-1 text-lg">
                As at: {report.dateRange?.label || ""}
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

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Balance Status */}
          <div className={`p-4 rounded-xl border-2 ${
            isBalanced
              ? "bg-emerald-50 border-emerald-300"
              : "bg-yellow-50 border-yellow-300"
          }`}>
            <div className="flex items-center gap-2">
              {isBalanced ? (
                <CheckCircle size={24} className="text-emerald-600" />
              ) : (
                <AlertCircle size={24} className="text-yellow-600" />
              )}
              <div>
                <span className="font-bold text-lg">
                  {isBalanced ? "✓ Balance Sheet is Balanced" : "⚠ Balance Sheet is NOT Balanced"}
                </span>
                {!isBalanced && (
                  <p className="text-sm text-gray-600">
                    Difference: AED {formatCurrency(report.summary?.difference)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Accounting Equation Display */}
          <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-xl border-2 border-green-300">
            <p className="text-sm text-gray-600 mb-3 font-semibold text-center">
              Accounting Equation: Assets = Liabilities + Equity
            </p>
            <div className="flex items-center justify-center gap-4 text-lg font-bold flex-wrap">
              <div className="text-center">
                <p className="text-2xl text-blue-700">AED {formatCurrency(report.summary?.totalAssets, true)}</p>
                <p className="text-xs text-gray-600 font-normal mt-1">Total Assets</p>
              </div>
              <span className="text-3xl text-gray-400">=</span>
              <div className="text-center">
                <p className="text-2xl text-orange-700">AED {formatCurrency(report.summary?.totalLiabilities, true)}</p>
                <p className="text-xs text-gray-600 font-normal mt-1">Total Liabilities</p>
              </div>
              <span className="text-3xl text-gray-400">+</span>
              <div className="text-center">
                <p className="text-2xl text-purple-700">AED {formatCurrency(report.summary?.totalEquity, true)}</p>
                <p className="text-xs text-gray-600 font-normal mt-1">Total Equity</p>
              </div>
            </div>
          </div>

          {/* Standard Balance Sheet Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ASSETS Column */}
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-blue-600 text-white px-4 py-3 font-bold text-lg flex items-center gap-2">
                <Wallet size={20} /> ASSETS
              </div>
              
              <div className="p-4 space-y-2">
                {/* Non-Current Assets */}
                <div className="bg-blue-50 border-b-2 border-blue-200 px-4 py-2 font-bold text-blue-900">
                  NON-CURRENT ASSETS
                </div>
                <CollapsibleSection
                  title="Fixed Assets"
                  items={assets.nonCurrent?.fixed?.items || assets.net?.filter(a => a.subType === 'fixed')}
                  total={assets.nonCurrent?.fixed?.total || assets.net?.filter(a => a.subType === 'fixed')?.reduce((s, i) => s + (i.balance || 0), 0)}
                  color="blue"
                  icon={Landmark}
                  defaultExpanded={false}
                />
                <CollapsibleSection
                  title="Intangible Assets"
                  items={assets.nonCurrent?.intangible?.items}
                  total={assets.nonCurrent?.intangible?.total}
                  color="blue"
                  defaultExpanded={false}
                />
                <CollapsibleSection
                  title="Long-term Investments"
                  items={assets.nonCurrent?.investments?.items}
                  total={assets.nonCurrent?.investments?.total}
                  color="blue"
                  defaultExpanded={false}
                />
                {assets.nonCurrent?.total && (
                  <div className="flex justify-between px-4 py-2 font-bold text-blue-800 bg-blue-100 border-t border-blue-300">
                    <span>Total Non-Current Assets</span>
                    <span className="font-mono">{formatCurrency(assets.nonCurrent?.total, true)}</span>
                  </div>
                )}

                {/* Current Assets */}
                <div className="bg-teal-50 border-b-2 border-teal-200 px-4 py-2 font-bold text-teal-900 mt-4">
                  CURRENT ASSETS
                </div>
                <CollapsibleSection
                  title="Inventory / Stock"
                  items={assets.current?.inventory?.items || assets.net?.filter(a => a.subType === 'inventory')}
                  total={assets.current?.inventory?.total || assets.net?.filter(a => a.subType === 'inventory')?.reduce((s, i) => s + (i.balance || 0), 0)}
                  color="teal"
                  defaultExpanded={false}
                />
                <CollapsibleSection
                  title="Accounts Receivable"
                  items={assets.current?.receivables?.items || assets.net?.filter(a => a.subType === 'receivable')}
                  total={assets.current?.receivables?.total || assets.net?.filter(a => a.subType === 'receivable')?.reduce((s, i) => s + (i.balance || 0), 0)}
                  color="teal"
                  defaultExpanded={false}
                />
                <CollapsibleSection
                  title="Cash & Bank"
                  items={assets.current?.cash?.items || assets.net?.filter(a => a.subType === 'cash' || a.subType === 'bank')}
                  total={assets.current?.cash?.total || assets.net?.filter(a => a.subType === 'cash' || a.subType === 'bank')?.reduce((s, i) => s + (i.balance || 0), 0)}
                  color="teal"
                />
                <CollapsibleSection
                  title="Other Current Assets"
                  items={assets.current?.other?.items || assets.net?.filter(a => !a.subType || a.subType === 'other')}
                  total={assets.current?.other?.total || assets.net?.filter(a => !a.subType || a.subType === 'other')?.reduce((s, i) => s + (i.balance || 0), 0) || assets.total}
                  color="teal"
                  defaultExpanded={false}
                />
                {assets.current?.total && (
                  <div className="flex justify-between px-4 py-2 font-bold text-teal-800 bg-teal-100 border-t border-teal-300">
                    <span>Total Current Assets</span>
                    <span className="font-mono">{formatCurrency(assets.current?.total, true)}</span>
                  </div>
                )}

                {/* Total Assets */}
                <div className="flex justify-between px-4 py-3 font-bold text-lg text-white bg-blue-600 mt-4 rounded-lg">
                  <span>TOTAL ASSETS</span>
                  <span className="font-mono">AED {formatCurrency(report.summary?.totalAssets, true)}</span>
                </div>
              </div>
            </div>

            {/* LIABILITIES & EQUITY Column */}
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
              {/* Liabilities Section */}
              <div className="bg-orange-600 text-white px-4 py-3 font-bold text-lg flex items-center gap-2">
                <TrendingDown size={20} /> LIABILITIES
              </div>
              
              <div className="p-4 space-y-2">
                {/* Non-Current Liabilities */}
                <div className="bg-orange-50 border-b-2 border-orange-200 px-4 py-2 font-bold text-orange-900">
                  NON-CURRENT LIABILITIES
                </div>
                <CollapsibleSection
                  title="Long-term Loans"
                  items={liabilities.nonCurrent?.loans?.items}
                  total={liabilities.nonCurrent?.loans?.total}
                  color="orange"
                  defaultExpanded={false}
                />
                <CollapsibleSection
                  title="Other Long-term Liabilities"
                  items={liabilities.nonCurrent?.other?.items || liabilities.items?.filter(l => l.subType === 'longterm')}
                  total={liabilities.nonCurrent?.other?.total || liabilities.items?.filter(l => l.subType === 'longterm')?.reduce((s, i) => s + (i.balance || 0), 0)}
                  color="orange"
                  defaultExpanded={false}
                />
                {liabilities.nonCurrent?.total && (
                  <div className="flex justify-between px-4 py-2 font-bold text-orange-800 bg-orange-100 border-t border-orange-300">
                    <span>Total Non-Current Liabilities</span>
                    <span className="font-mono">{formatCurrency(liabilities.nonCurrent?.total, true)}</span>
                  </div>
                )}

                {/* Current Liabilities */}
                <div className="bg-yellow-50 border-b-2 border-yellow-200 px-4 py-2 font-bold text-yellow-900 mt-4">
                  CURRENT LIABILITIES
                </div>
                <CollapsibleSection
                  title="Accounts Payable"
                  items={liabilities.current?.payables?.items || liabilities.items?.filter(l => l.subType === 'payable')}
                  total={liabilities.current?.payables?.total || liabilities.items?.filter(l => l.subType === 'payable')?.reduce((s, i) => s + (i.balance || 0), 0)}
                  color="orange"
                  defaultExpanded={false}
                />
                <CollapsibleSection
                  title="Short-term Loans"
                  items={liabilities.current?.loans?.items}
                  total={liabilities.current?.loans?.total}
                  color="orange"
                  defaultExpanded={false}
                />
                <CollapsibleSection
                  title="Other Current Liabilities"
                  items={liabilities.current?.other?.items || liabilities.items?.filter(l => !l.subType || l.subType === 'other')}
                  total={liabilities.current?.other?.total || liabilities.items?.filter(l => !l.subType || l.subType === 'other')?.reduce((s, i) => s + (i.balance || 0), 0) || liabilities.total}
                  color="orange"
                />
                {liabilities.current?.total && (
                  <div className="flex justify-between px-4 py-2 font-bold text-yellow-800 bg-yellow-100 border-t border-yellow-300">
                    <span>Total Current Liabilities</span>
                    <span className="font-mono">{formatCurrency(liabilities.current?.total, true)}</span>
                  </div>
                )}

                {/* Total Liabilities */}
                <div className="flex justify-between px-4 py-3 font-bold text-lg text-white bg-orange-600 mt-4 rounded-lg">
                  <span>TOTAL LIABILITIES</span>
                  <span className="font-mono">AED {formatCurrency(report.summary?.totalLiabilities, true)}</span>
                </div>
              </div>

              {/* Equity Section */}
              <div className="bg-purple-600 text-white px-4 py-3 font-bold text-lg flex items-center gap-2 mt-4">
                <Briefcase size={20} /> EQUITY
              </div>
              
              <div className="p-4 space-y-2">
                <CollapsibleSection
                  title="Capital / Share Capital"
                  items={equity.capital?.items || equity.items?.filter(e => e.subType === 'capital')}
                  total={equity.capital?.total || equity.items?.filter(e => e.subType === 'capital')?.reduce((s, i) => s + (i.balance || 0), 0)}
                  color="purple"
                />
                <CollapsibleSection
                  title="Reserves & Surplus"
                  items={equity.reserves?.items || equity.items?.filter(e => e.subType === 'reserves')}
                  total={equity.reserves?.total || equity.items?.filter(e => e.subType === 'reserves')?.reduce((s, i) => s + (i.balance || 0), 0)}
                  color="purple"
                  defaultExpanded={false}
                />
                
                {/* Retained Earnings */}
                {(equity.retainedEarnings !== undefined || equity.items?.find(e => e.subType === 'retained')) && (
                  <div className="flex justify-between px-4 py-2 pl-10 border-b border-gray-100 hover:bg-gray-50 text-sm">
                    <span className="text-gray-900">Retained Earnings</span>
                    <span className="font-mono text-gray-700">
                      {formatCurrency(equity.retainedEarnings || equity.items?.find(e => e.subType === 'retained')?.balance, true)}
                    </span>
                  </div>
                )}
                
                {/* Current Period P&L */}
                {equity.currentPeriodPL !== undefined && (
                  <div className={`flex justify-between px-4 py-2 pl-10 border-b border-gray-100 hover:bg-gray-50 text-sm ${
                    equity.currentPeriodPL >= 0 ? "text-green-700" : "text-red-700"
                  }`}>
                    <span>Current Period {equity.currentPeriodPL >= 0 ? "Profit" : "Loss"}</span>
                    <span className="font-mono font-semibold">
                      {formatCurrency(equity.currentPeriodPL, true)}
                    </span>
                  </div>
                )}

                <CollapsibleSection
                  title="Other Equity"
                  items={equity.other?.items || equity.items?.filter(e => !e.subType || e.subType === 'other')}
                  total={equity.other?.total || equity.items?.filter(e => !e.subType || e.subType === 'other')?.reduce((s, i) => s + (i.balance || 0), 0) || equity.total}
                  color="purple"
                  defaultExpanded={false}
                />

                {/* Total Equity */}
                <div className="flex justify-between px-4 py-3 font-bold text-lg text-white bg-purple-600 mt-4 rounded-lg">
                  <span>TOTAL EQUITY</span>
                  <span className="font-mono">AED {formatCurrency(report.summary?.totalEquity, true)}</span>
                </div>

                {/* Total Liabilities + Equity */}
                <div className="flex justify-between px-4 py-3 font-bold text-lg text-white bg-gradient-to-r from-orange-600 to-purple-600 mt-4 rounded-lg">
                  <span>TOTAL LIABILITIES + EQUITY</span>
                  <span className="font-mono">AED {formatCurrency((report.summary?.totalLiabilities || 0) + (report.summary?.totalEquity || 0), true)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <p className="text-sm text-gray-600">Total Assets</p>
              <p className="text-xl font-bold text-blue-700">AED {formatCurrency(report.summary?.totalAssets, true)}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <p className="text-sm text-gray-600">Total Liabilities</p>
              <p className="text-xl font-bold text-orange-700">AED {formatCurrency(report.summary?.totalLiabilities, true)}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
              <p className="text-sm text-gray-600">Total Equity</p>
              <p className="text-xl font-bold text-purple-700">AED {formatCurrency(report.summary?.totalEquity, true)}</p>
            </div>
            <div className={`p-4 rounded-xl border ${isBalanced ? "bg-emerald-50 border-emerald-200" : "bg-yellow-50 border-yellow-200"}`}>
              <p className="text-sm text-gray-600">Balance Status</p>
              <p className={`text-xl font-bold ${isBalanced ? "text-emerald-700" : "text-yellow-700"}`}>
                {isBalanced ? "✓ Balanced" : "⚠ Unbalanced"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex gap-3 flex-wrap p-6 border-t bg-gray-50 flex-shrink-0">
          <button 
            onClick={() => exportBalanceSheetExcel(report)}
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
const BalanceSheetReport = () => {
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
        params: { reportType: 'balance_sheet', limit: 10 }
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
      const response = await axiosInstance.post("/reports/balance-sheet/generate", {
        periodType: params.periodType,
        year: params.year,
        month: params.month,
        save: true, // Save to server for cross-device access
      });

      if (response.data.success) {
        const report = response.data.data;
        console.log('Balance Sheet generated:', report); // Debug log
        setCurrentReport(report);
        setIsModalOpen(false); // Close modal FIRST
        setTimeout(() => setIsViewOpen(true), 100); // Then open view with slight delay
        loadSavedReports(); // Refresh saved reports list
        showToast("Balance Sheet generated successfully!", "success");
      } else {
        showToast(response.data.message || "Failed to generate report", "error");
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
      if (response.data?.success && response.data?.data) {
        const reportData = response.data.data.reportData || response.data.data;
        console.log('Loaded saved report:', reportData); // Debug log
        if (reportData) {
          setCurrentReport(reportData);
          setIsViewOpen(true);
        } else {
          showToast("Report data is empty", "error");
        }
      } else {
        showToast(response.data?.message || "Failed to load report", "error");
      }
    } catch (error) {
      console.error('Error loading saved report:', error);
      showToast(error.response?.data?.message || "Failed to load report", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Load and download report directly as Excel
  const loadAndDownloadReport = async (reportId) => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get(`/reports/saved/${reportId}`);
      if (response.data?.success && response.data?.data) {
        const reportData = response.data.data.reportData || response.data.data;
        if (reportData) {
          exportBalanceSheetExcel(reportData);
          showToast("Excel downloaded successfully!", "success");
        } else {
          showToast("Report data is empty", "error");
        }
      } else {
        showToast("Failed to load report for download", "error");
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      showToast("Failed to download report", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3 mb-2">
            <Scale size={36} className="text-green-600" />
            Balance Sheet
          </h1>
          <p className="text-gray-600">
            Generate standard Statement of Financial Position showing assets, liabilities, and equity
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-4 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-teal-700 transition-all shadow-lg flex items-center gap-2"
          >
            <Scale size={20} /> Generate New Report
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
                <p className="text-gray-600 text-sm font-medium">Assets</p>
                <p className="text-xl font-bold text-gray-900 mt-1">What You Own</p>
              </div>
              <Wallet size={32} className="text-blue-600 opacity-30" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-orange-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Liabilities</p>
                <p className="text-xl font-bold text-gray-900 mt-1">What You Owe</p>
              </div>
              <TrendingDown size={32} className="text-orange-600 opacity-30" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-purple-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Equity</p>
                <p className="text-xl font-bold text-gray-900 mt-1">Net Worth</p>
              </div>
              <Briefcase size={32} className="text-purple-600 opacity-30" />
            </div>
          </div>
        </div>

        {/* Saved Reports - From Server (Cross-device accessible) */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <History size={24} className="text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">Saved Reports</h2>
            <span className="text-sm text-gray-500">(Available across all devices)</span>
          </div>
          
          {loadingSaved ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={32} className="animate-spin text-green-600" />
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
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Assets</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Liabilities</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Equity</th>
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
                        <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                          {item.periodType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {new Date(item.generatedAt).toLocaleDateString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-blue-700">
                        {formatCurrency(item.summary?.totalAssets, true)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-orange-700">
                        {formatCurrency(item.summary?.totalLiabilities, true)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-purple-700">
                        {formatCurrency(item.summary?.totalEquity, true)}
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
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => loadSavedReport(item._id)}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            <Eye size={16} /> View
                          </button>
                          <button
                            onClick={() => loadAndDownloadReport(item._id)}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
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
              <Scale size={48} className="mx-auto mb-4 opacity-30" />
              <p>No saved reports yet. Generate your first Balance Sheet!</p>
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

export default BalanceSheetReport;
