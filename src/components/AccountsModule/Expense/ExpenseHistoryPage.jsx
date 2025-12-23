import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  ArrowLeft,
  Search,
  DollarSign,
  TrendingUp,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Receipt,
  Calendar,
  FileText,
  Filter,
  Download,
} from "lucide-react";
import axiosInstance from "../../../axios/axios";
import { useNavigate, useParams } from "react-router-dom";

// Toast notification component
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

// Stat card component
const StatCard = ({ title, value, icon: Icon, bgColor, textColor, isCount = false }) => (
  <div
    className={`${bgColor} rounded-2xl p-6 border-2 transition-all duration-300 hover:shadow-xl`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 font-medium">{title}</p>
        <p className={`text-2xl font-bold ${textColor} mt-1`}>
          {isCount
            ? value
            : `AED ${Number(value || 0).toLocaleString("en-AE", {
                minimumFractionDigits: 2,
              })}`}
        </p>
      </div>
      <div className={`p-3 rounded-xl ${bgColor}`}>
        <Icon size={24} className={textColor} />
      </div>
    </div>
  </div>
);

const ExpenseHistoryPage = () => {
  const navigate = useNavigate();
  const { typeId } = useParams();

  // State management
  const [expenseType, setExpenseType] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [totals, setTotals] = useState({ totalExpense: 0, totalVat: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Toast state
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // Show toast message
  const showToastMessage = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  }, []);

  // Fetch expense history
  const fetchExpenseHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await axiosInstance.get(
        `/expense-accounts/types/${typeId}/history`,
        { params }
      );
      
      setExpenseType(res.data?.data?.expenseType || null);
      setVouchers(res.data?.data?.vouchers || []);
      setTotals(res.data?.data?.totals || { totalExpense: 0, totalVat: 0 });
      setPagination((prev) => ({
        ...prev,
        total: res.data?.data?.pagination?.total || 0,
        totalPages: res.data?.data?.pagination?.totalPages || 0,
      }));
    } catch (err) {
      showToastMessage(
        err.response?.data?.message || "Failed to fetch expense history",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  }, [typeId, pagination.page, pagination.limit, startDate, endDate, showToastMessage]);

  // Initial fetch
  useEffect(() => {
    if (typeId) {
      fetchExpenseHistory();
    }
  }, [fetchExpenseHistory, typeId]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchExpenseHistory().finally(() => {
      setIsRefreshing(false);
      showToastMessage("Data refreshed", "success");
    });
  }, [fetchExpenseHistory, showToastMessage]);

  // Apply filters
  const handleApplyFilters = useCallback(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchExpenseHistory();
  }, [fetchExpenseHistory]);

  // Clear filters
  const handleClearFilters = useCallback(() => {
    setStartDate("");
    setEndDate("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  // Format date
  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-AE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Export to CSV
  const handleExport = useCallback(() => {
    if (vouchers.length === 0) {
      showToastMessage("No data to export", "error");
      return;
    }

    const headers = ["Date", "Voucher No", "Expense Amount (AED)", "VAT Amount (AED)", "Total Amount (AED)", "Narration"];
    const rows = vouchers.map((v) => [
      formatDate(v.date),
      v.voucherNo,
      v.expenseAmount,
      v.vatAmount,
      v.totalAmount,
      v.narration || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense-history-${expenseType?.name || "export"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToastMessage("Export successful", "success");
  }, [vouchers, expenseType, showToastMessage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-4 md:p-6">
      <Toast show={toast.show} message={toast.message} type={toast.type} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white rounded-xl transition-all"
            >
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Expense History
              </h1>
              {expenseType && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-gray-500">
                    Type: <span className="font-semibold text-purple-600">{expenseType.name}</span>
                  </span>
                  {expenseType.expenseAccount && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500">
                        Account: <span className="font-semibold text-blue-600">{expenseType.expenseAccount.accountName}</span>
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-xl transition-all shadow-sm ${
                showFilters ? "bg-purple-100 text-purple-600" : "bg-white hover:bg-gray-50"
              }`}
            >
              <Filter size={20} />
            </button>
            <button
              onClick={handleExport}
              className="p-3 bg-white rounded-xl hover:bg-gray-50 transition-all shadow-sm"
              title="Export to CSV"
            >
              <Download size={20} className="text-gray-600" />
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-3 bg-white rounded-xl hover:bg-gray-50 transition-all shadow-sm"
            >
              <RefreshCw
                size={20}
                className={`text-gray-600 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Vouchers"
          value={pagination.total}
          icon={Receipt}
          bgColor="bg-purple-50 border-purple-200"
          textColor="text-purple-600"
          isCount
        />
        <StatCard
          title="Total Expenses (AED)"
          value={totals.totalExpense}
          icon={DollarSign}
          bgColor="bg-blue-50 border-blue-200"
          textColor="text-blue-600"
        />
        <StatCard
          title="Total VAT (AED)"
          value={totals.totalVat}
          icon={TrendingUp}
          bgColor="bg-emerald-50 border-emerald-200"
          textColor="text-emerald-600"
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar size={14} className="inline mr-1" /> Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar size={14} className="inline mr-1" /> End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-300"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                Apply
              </button>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={40} className="animate-spin text-purple-600" />
          </div>
        ) : vouchers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Receipt size={48} className="mb-4 text-gray-300" />
            <p className="text-lg font-medium">No expense vouchers found</p>
            <p className="text-sm">No expenses recorded for this type yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-50 to-blue-50">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">
                    Voucher No (Reference)
                  </th>
                  <th className="text-right py-4 px-6 font-semibold text-gray-700">
                    Expense Amount (AED)
                  </th>
                  <th className="text-right py-4 px-6 font-semibold text-gray-700">
                    VAT Amount (AED)
                  </th>
                  <th className="text-right py-4 px-6 font-semibold text-gray-700">
                    Total Amount (AED)
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">
                    Narration
                  </th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((voucher, index) => (
                  <tr
                    key={voucher._id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                    }`}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="text-gray-900">
                          {formatDate(voucher.date)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono text-sm text-purple-600 bg-purple-50 px-2 py-1 rounded">
                        {voucher.voucherNo}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-semibold text-gray-900">
                        {Number(voucher.expenseAmount || 0).toLocaleString("en-AE", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-semibold text-emerald-600">
                        {Number(voucher.vatAmount || 0).toLocaleString("en-AE", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-bold text-blue-600">
                        {Number(voucher.totalAmount || 0).toLocaleString("en-AE", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-600 text-sm">
                        {voucher.narration || "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Footer with totals */}
              <tfoot className="bg-gradient-to-r from-purple-100 to-blue-100">
                <tr>
                  <td colSpan={2} className="py-4 px-6 font-bold text-gray-700">
                    Page Totals
                  </td>
                  <td className="py-4 px-6 text-right font-bold text-gray-900">
                    {vouchers
                      .reduce((sum, v) => sum + (v.expenseAmount || 0), 0)
                      .toLocaleString("en-AE", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-6 text-right font-bold text-emerald-600">
                    {vouchers
                      .reduce((sum, v) => sum + (v.vatAmount || 0), 0)
                      .toLocaleString("en-AE", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-6 text-right font-bold text-blue-600">
                    {vouchers
                      .reduce((sum, v) => sum + (v.totalAmount || 0), 0)
                      .toLocaleString("en-AE", { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} vouchers
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                disabled={pagination.page === 1}
                className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg font-medium">
                {pagination.page}
              </span>
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseHistoryPage;
