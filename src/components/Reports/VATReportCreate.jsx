import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  DollarSign,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Eye,
  Trash2,
  CheckSquare,
  Send,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import axiosInstance from "../../axios/axios";
import Select from "react-select";

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
const formatCurrency = (amount, color = "text-gray-900") => {
  const num = Number(amount) || 0;
  const abs = Math.abs(num).toFixed(2);
  const neg = num < 0;
  return (
    <span className={`inline-flex items-center font-semibold ${color}`}>
      {neg && <span className="text-red-600">-</span>}
      <span className="text-xs mr-1 opacity-70">AED</span>
      {parseFloat(abs).toLocaleString()}
    </span>
  );
};

// Status badge
const StatusBadge = ({ status }) => {
  const styles = {
    DRAFT: "bg-yellow-100 text-yellow-800 border-yellow-300",
    FINALIZED: "bg-blue-100 text-blue-800 border-blue-300",
    SUBMITTED: "bg-emerald-100 text-emerald-800 border-emerald-300",
    NOT_GENERATED: "bg-gray-100 text-gray-500 border-gray-300",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.NOT_GENERATED}`}>
      {status?.replace(/_/g, " ") || "Not Generated"}
    </span>
  );
};

// Quarter Card for Dashboard
const QuarterCard = ({ quarter, onGenerate, onView }) => {
  const isPositive = quarter.netVAT >= 0;
  return (
    <div className={`bg-white rounded-2xl shadow-lg border-2 p-6 transition-all duration-300 hover:shadow-xl ${
      quarter.hasReport ? "border-emerald-200" : "border-gray-200"
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{quarter.periodLabel}</h3>
          <StatusBadge status={quarter.status} />
        </div>
        <div className={`p-3 rounded-xl ${isPositive ? "bg-red-100" : "bg-emerald-100"}`}>
          {isPositive ? (
            <TrendingUp size={24} className="text-red-600" />
          ) : (
            <TrendingDown size={24} className="text-emerald-600" />
          )}
        </div>
      </div>

      {quarter.hasReport ? (
        <>
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Output VAT</span>
              {formatCurrency(quarter.outputVAT, "text-emerald-700")}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Input VAT</span>
              {formatCurrency(quarter.inputVAT, "text-amber-700")}
            </div>
            <div className="h-px bg-gray-200" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">
                {isPositive ? "VAT Payable" : "VAT Refundable"}
              </span>
              {formatCurrency(quarter.netVAT, isPositive ? "text-red-700" : "text-emerald-700")}
            </div>
          </div>
          <button
            onClick={() => onView(quarter.reportId)}
            className="w-full py-2 px-4 bg-purple-50 text-purple-700 rounded-xl font-medium hover:bg-purple-100 transition-colors flex items-center justify-center gap-2"
          >
            <Eye size={16} /> View Report
          </button>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm mb-4">No report generated for this quarter</p>
          <button
            onClick={() => onGenerate(quarter.quarter)}
            className="w-full py-2 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Generate Report
          </button>
        </div>
      )}
    </div>
  );
};

// Generate Report Modal
const GenerateReportModal = ({ isOpen, onClose, onGenerate, isLoading, preselectedQuarter }) => {
  const [periodType, setPeriodType] = useState("quarterly");
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(preselectedQuarter || Math.ceil((new Date().getMonth() + 1) / 3));
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    if (preselectedQuarter) {
      setQuarter(preselectedQuarter);
      setPeriodType("quarterly");
    }
  }, [preselectedQuarter]);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: currentYear - i,
    label: String(currentYear - i),
  }));

  const quarterOptions = [
    { value: 1, label: "Q1 (Jan - Mar)" },
    { value: 2, label: "Q2 (Apr - Jun)" },
    { value: 3, label: "Q3 (Jul - Sep)" },
    { value: 4, label: "Q4 (Oct - Dec)" },
  ];

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
      quarter: periodType === "quarterly" ? quarter : null,
      month: periodType === "monthly" ? month : null,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <FileText size={24} /> Generate VAT Report
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>
          <p className="text-purple-100 mt-2 text-sm">UAE FTA Compliant VAT Return</p>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Period Type</label>
            <div className="flex gap-3">
              <button
                onClick={() => setPeriodType("quarterly")}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  periodType === "quarterly"
                    ? "bg-purple-100 text-purple-700 ring-2 ring-purple-500"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Quarterly
              </button>
              <button
                onClick={() => setPeriodType("monthly")}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  periodType === "monthly"
                    ? "bg-purple-100 text-purple-700 ring-2 ring-purple-500"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
            <Select
              options={yearOptions}
              value={yearOptions.find((o) => o.value === year)}
              onChange={(opt) => setYear(opt.value)}
              classNamePrefix="react-select"
            />
          </div>

          {periodType === "quarterly" ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Quarter</label>
              <Select
                options={quarterOptions}
                value={quarterOptions.find((o) => o.value === quarter)}
                onChange={(opt) => setQuarter(opt.value)}
                classNamePrefix="react-select"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Month</label>
              <Select
                options={monthOptions}
                value={monthOptions.find((o) => o.value === month)}
                onChange={(opt) => setMonth(opt.value)}
                classNamePrefix="react-select"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Generate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Report Detail Modal
const ReportDetailModal = ({ report, onClose, onFinalize, onSubmit, isLoading }) => {
  const [activeTab, setActiveTab] = useState("summary");

  if (!report) return null;

  const tabs = [
    { id: "summary", label: "Summary" },
    { id: "sales", label: "Sales" },
    { id: "purchases", label: "Purchases" },
    { id: "returns", label: "Returns" },
  ];

  const salesItems = report.items?.filter((i) => i.transactionType === "sales_order") || [];
  const purchaseItems = report.items?.filter((i) => i.transactionType === "purchase_order") || [];
  const salesReturnItems = report.items?.filter((i) => i.transactionType === "sales_return") || [];
  const purchaseReturnItems = report.items?.filter((i) => i.transactionType === "purchase_return") || [];

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <FileText size={28} /> VAT Report - {report.reportNo}
              </h3>
              <p className="text-purple-100 mt-1">
                {new Date(report.periodStart).toLocaleDateString()} - {new Date(report.periodEnd).toLocaleDateString()}
              </p>
              <div className="mt-2"><StatusBadge status={report.status} /></div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex border-b border-gray-200 flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 px-6 font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "summary" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={20} className="text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">Output VAT (Sales)</span>
                  </div>
                  <p className="text-3xl font-bold text-emerald-900">
                    AED {(report.totalOutputVAT || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown size={20} className="text-amber-600" />
                    <span className="text-sm font-medium text-amber-700">Input VAT (Purchases)</span>
                  </div>
                  <p className="text-3xl font-bold text-amber-900">
                    AED {(report.totalInputVAT || 0).toLocaleString()}
                  </p>
                </div>
                <div className={`p-6 rounded-2xl border ${
                  report.netVATPayable >= 0 ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={20} className={report.netVATPayable >= 0 ? "text-red-600" : "text-blue-600"} />
                    <span className={`text-sm font-medium ${report.netVATPayable >= 0 ? "text-red-700" : "text-blue-700"}`}>
                      {report.netVATPayable >= 0 ? "VAT Payable to FTA" : "VAT Refundable"}
                    </span>
                  </div>
                  <p className={`text-3xl font-bold ${report.netVATPayable >= 0 ? "text-red-900" : "text-blue-900"}`}>
                    AED {Math.abs(report.netVATPayable || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4">UAE VAT Return Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Standard Rated Sales (5%)</span>
                    <span className="font-semibold">AED {(report.standardRatedSales || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">VAT on Sales</span>
                    <span className="font-semibold text-emerald-600">AED {(report.standardRatedSalesVAT || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Less: Sales Returns</span>
                    <span className="font-semibold text-red-600">-AED {(report.salesReturnsVAT || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-emerald-50 px-3 rounded">
                    <span className="font-medium text-emerald-700">Net Output VAT</span>
                    <span className="font-bold text-emerald-700">AED {(report.totalOutputVAT || 0).toLocaleString()}</span>
                  </div>
                  <div className="h-4" />
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Standard Rated Purchases (5%)</span>
                    <span className="font-semibold">AED {(report.standardRatedPurchases || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">VAT on Purchases</span>
                    <span className="font-semibold text-amber-600">AED {(report.standardRatedPurchasesVAT || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Less: Purchase Returns</span>
                    <span className="font-semibold text-red-600">-AED {(report.purchaseReturnsVAT || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-amber-50 px-3 rounded">
                    <span className="font-medium text-amber-700">Net Input VAT</span>
                    <span className="font-bold text-amber-700">AED {(report.totalInputVAT || 0).toLocaleString()}</span>
                  </div>
                  <div className="h-4" />
                  <div className={`flex justify-between py-3 px-4 rounded-xl ${
                    report.netVATPayable >= 0 ? "bg-red-100" : "bg-blue-100"
                  }`}>
                    <span className={`font-bold ${report.netVATPayable >= 0 ? "text-red-700" : "text-blue-700"}`}>
                      {report.netVATPayable >= 0 ? "NET VAT PAYABLE" : "NET VAT REFUNDABLE"}
                    </span>
                    <span className={`font-bold text-xl ${report.netVATPayable >= 0 ? "text-red-700" : "text-blue-700"}`}>
                      AED {Math.abs(report.netVATPayable || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "sales" && (
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-4">Sales Transactions ({salesItems.length} items)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Invoice No</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Customer</th>
                      <th className="px-4 py-3 text-left">Item</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">VAT</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {salesItems.map((item, i) => (
                      <tr key={i} className="hover:bg-purple-50">
                        <td className="px-4 py-3 font-medium">{item.transactionNo}</td>
                        <td className="px-4 py-3">{new Date(item.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">{item.partyName}</td>
                        <td className="px-4 py-3">{item.description}</td>
                        <td className="px-4 py-3 text-right">AED {item.lineTotal?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">AED {item.vatAmount?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-semibold">AED {item.grandTotal?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "purchases" && (
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-4">Purchase Transactions ({purchaseItems.length} items)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Invoice No</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Vendor</th>
                      <th className="px-4 py-3 text-left">Item</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">VAT</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {purchaseItems.map((item, i) => (
                      <tr key={i} className="hover:bg-purple-50">
                        <td className="px-4 py-3 font-medium">{item.transactionNo}</td>
                        <td className="px-4 py-3">{new Date(item.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">{item.partyName}</td>
                        <td className="px-4 py-3">{item.description}</td>
                        <td className="px-4 py-3 text-right">AED {item.lineTotal?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-amber-600">AED {item.vatAmount?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-semibold">AED {item.grandTotal?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "returns" && (
            <div className="space-y-8">
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4">Sales Returns ({salesReturnItems.length} items)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Return No</th>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Customer</th>
                        <th className="px-4 py-3 text-left">Item</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-right">VAT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {salesReturnItems.map((item, i) => (
                        <tr key={i} className="hover:bg-red-50">
                          <td className="px-4 py-3 font-medium">{item.transactionNo}</td>
                          <td className="px-4 py-3">{new Date(item.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3">{item.partyName}</td>
                          <td className="px-4 py-3">{item.description}</td>
                          <td className="px-4 py-3 text-right text-red-600">-AED {item.lineTotal?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-red-600">-AED {item.vatAmount?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4">Purchase Returns ({purchaseReturnItems.length} items)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Return No</th>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Vendor</th>
                        <th className="px-4 py-3 text-left">Item</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-right">VAT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {purchaseReturnItems.map((item, i) => (
                        <tr key={i} className="hover:bg-red-50">
                          <td className="px-4 py-3 font-medium">{item.transactionNo}</td>
                          <td className="px-4 py-3">{new Date(item.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3">{item.partyName}</td>
                          <td className="px-4 py-3">{item.description}</td>
                          <td className="px-4 py-3 text-right text-red-600">-AED {item.lineTotal?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-red-600">-AED {item.vatAmount?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          <div className="text-sm text-gray-600">
            Generated: {new Date(report.generatedAt).toLocaleString()} by {report.generatedByName}
          </div>
          <div className="flex gap-3">
            {report.status === "DRAFT" && (
              <button
                onClick={() => onFinalize(report._id)}
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <CheckSquare size={18} /> Finalize
              </button>
            )}
            {report.status === "FINALIZED" && (
              <button
                onClick={() => onSubmit(report._id)}
                disabled={isLoading}
                className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Send size={18} /> Submit to FTA
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
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
const VATReportsManagement = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [vatSummary, setVatSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [preselectedQuarter, setPreselectedQuarter] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });
  const [viewMode, setViewMode] = useState("dashboard");

  const showToast = useCallback((msg, type = "success") => {
    setToast({ visible: true, message: msg, type });
    setTimeout(() => setToast((p) => ({ ...p, visible: false })), 3000);
  }, []);

  const fetchVATSummary = useCallback(async () => {
    try {
      const res = await axiosInstance.get(`/reports/vat/summary/${selectedYear}`);
      setVatSummary(res.data.data);
    } catch (err) {
      console.error("Error fetching VAT summary:", err);
    }
  }, [selectedYear]);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.get("/reports/vat", { params: { year: selectedYear, limit: 50 } });
      setReports(res.data.data);
    } catch (err) {
      showToast("Failed to load VAT reports", "error");
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, showToast]);

  useEffect(() => {
    fetchVATSummary();
    fetchReports();
  }, [fetchVATSummary, fetchReports]);

  const handleGenerate = async (data) => {
    setIsActionLoading(true);
    try {
      await axiosInstance.post("/reports/vat/generate", data);
      showToast("VAT report generated successfully!", "success");
      setShowGenerateModal(false);
      fetchVATSummary();
      fetchReports();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to generate report", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const viewReport = async (id) => {
    try {
      const res = await axiosInstance.get(`/reports/vat/${id}`);
      setSelectedReport(res.data.data);
    } catch (err) {
      showToast("Failed to load report details", "error");
    }
  };

  const finalizeReport = async (id) => {
    setIsActionLoading(true);
    try {
      await axiosInstance.post(`/reports/vat/${id}/finalize`);
      showToast("Report finalized successfully!", "success");
      setSelectedReport(null);
      fetchVATSummary();
      fetchReports();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to finalize", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const submitReport = async (id) => {
    setIsActionLoading(true);
    try {
      await axiosInstance.post(`/reports/vat/${id}/submit`);
      showToast("Report submitted successfully!", "success");
      setSelectedReport(null);
      fetchVATSummary();
      fetchReports();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to submit", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const deleteReport = async (id) => {
    if (!window.confirm("Delete this DRAFT report?")) return;
    setIsActionLoading(true);
    try {
      await axiosInstance.delete(`/reports/vat/${id}`);
      showToast("Draft deleted", "success");
      fetchVATSummary();
      fetchReports();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const openGenerateForQuarter = (quarter) => {
    setPreselectedQuarter(quarter);
    setShowGenerateModal(true);
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: new Date().getFullYear() - i,
    label: String(new Date().getFullYear() - i),
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">Loading VAT reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4 sm:p-6">
      <style>{`
        @keyframes slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slide-in { animation: slide-in .3s ease-out; }
      `}</style>

      <Toast show={toast.visible} message={toast.message} type={toast.type} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
            VAT Reports
          </h1>
          <p className="text-gray-600 mt-1">UAE FTA Compliant VAT Returns</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="w-32">
            <Select
              options={yearOptions}
              value={yearOptions.find((o) => o.value === selectedYear)}
              onChange={(opt) => setSelectedYear(opt.value)}
              classNamePrefix="react-select"
            />
          </div>
          <div className="flex bg-white rounded-xl shadow-md overflow-hidden">
            <button
              onClick={() => setViewMode("dashboard")}
              className={`px-4 py-2 font-medium transition-colors ${
                viewMode === "dashboard" ? "bg-purple-100 text-purple-700" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 font-medium transition-colors ${
                viewMode === "list" ? "bg-purple-100 text-purple-700" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              All Reports
            </button>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transition-colors flex items-center gap-2 shadow-md"
          >
            <Plus size={18} /> Generate Report
          </button>
          <button
            onClick={() => { fetchVATSummary(); fetchReports(); }}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white shadow-md hover:shadow-lg transition-all"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {viewMode === "dashboard" && vatSummary && (
        <>
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Year-to-Date Summary - {selectedYear}</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-emerald-50 p-4 rounded-xl">
                <p className="text-sm text-emerald-700 font-medium">Total Output VAT</p>
                <p className="text-2xl font-bold text-emerald-900">AED {vatSummary.ytd.totalOutputVAT.toLocaleString()}</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-xl">
                <p className="text-sm text-amber-700 font-medium">Total Input VAT</p>
                <p className="text-2xl font-bold text-amber-900">AED {vatSummary.ytd.totalInputVAT.toLocaleString()}</p>
              </div>
              <div className={`p-4 rounded-xl ${vatSummary.ytd.netVATPayable >= 0 ? "bg-red-50" : "bg-blue-50"}`}>
                <p className={`text-sm font-medium ${vatSummary.ytd.netVATPayable >= 0 ? "text-red-700" : "text-blue-700"}`}>
                  Net VAT {vatSummary.ytd.netVATPayable >= 0 ? "Payable" : "Refundable"}
                </p>
                <p className={`text-2xl font-bold ${vatSummary.ytd.netVATPayable >= 0 ? "text-red-900" : "text-blue-900"}`}>
                  AED {Math.abs(vatSummary.ytd.netVATPayable).toLocaleString()}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl">
                <p className="text-sm text-purple-700 font-medium">Reports Status</p>
                <p className="text-2xl font-bold text-purple-900">
                  {vatSummary.ytd.reportsSubmitted}/{vatSummary.ytd.reportsGenerated}
                </p>
                <p className="text-xs text-purple-600">Submitted / Generated</p>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-4">Quarterly VAT Returns</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {vatSummary.quarters.map((quarter) => (
              <QuarterCard key={quarter.quarter} quarter={quarter} onGenerate={openGenerateForQuarter} onView={viewReport} />
            ))}
          </div>
        </>
      )}

      {viewMode === "list" && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Report No</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Period</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Output VAT</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Input VAT</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Net Payable</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">No VAT reports found for {selectedYear}</td>
                  </tr>
                ) : (
                  reports.map((r) => (
                    <tr key={r._id} className="hover:bg-purple-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-purple-700">{r.reportNo}</td>
                      <td className="px-6 py-4 text-sm">
                        {new Date(r.periodStart).toLocaleDateString()} - {new Date(r.periodEnd).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                      <td className="px-6 py-4 text-right">{formatCurrency(r.totalOutputVAT, "text-emerald-700")}</td>
                      <td className="px-6 py-4 text-right">{formatCurrency(r.totalInputVAT, "text-amber-700")}</td>
                      <td className="px-6 py-4 text-right">{formatCurrency(r.netVATPayable, "text-purple-700")}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => viewReport(r._id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                            <Eye size={16} />
                          </button>
                          {r.status === "DRAFT" && (
                            <button onClick={() => deleteReport(r._id)} disabled={isActionLoading} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <GenerateReportModal
        isOpen={showGenerateModal}
        onClose={() => { setShowGenerateModal(false); setPreselectedQuarter(null); }}
        onGenerate={handleGenerate}
        isLoading={isActionLoading}
        preselectedQuarter={preselectedQuarter}
      />

      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onFinalize={finalizeReport}
          onSubmit={submitReport}
          isLoading={isActionLoading}
        />
      )}
    </div>
  );
};

export default VATReportsManagement;
