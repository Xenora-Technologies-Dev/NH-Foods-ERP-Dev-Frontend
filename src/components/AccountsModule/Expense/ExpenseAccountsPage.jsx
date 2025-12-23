import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  X,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Save,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Receipt,
  FileText,
  Wallet,
} from "lucide-react";
import axiosInstance from "../../../axios/axios";
import { useNavigate } from "react-router-dom";

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
const StatCard = ({ title, value, icon: Icon, bgColor, textColor }) => (
  <div
    className={`${bgColor} rounded-2xl p-6 border-2 transition-all duration-300 hover:shadow-xl`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 font-medium">{title}</p>
        <p className={`text-2xl font-bold ${textColor} mt-1`}>
          AED {Number(value || 0).toLocaleString("en-AE", { minimumFractionDigits: 2 })}
        </p>
      </div>
      <div className={`p-3 rounded-xl ${bgColor}`}>
        <Icon size={24} className={textColor} />
      </div>
    </div>
  </div>
);

// Form input component
const FormInput = ({ label, icon: Icon, error, ...props }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      <Icon size={16} className="inline mr-2 text-purple-500" /> {label}
      {props.required && <span className="text-red-500">*</span>}
    </label>
    <input
      {...props}
      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all duration-200 ${
        error ? "border-red-300 bg-red-50" : "border-gray-300"
      }`}
    />
    {error && (
      <p className="mt-1 text-sm text-red-600 flex items-center">
        <AlertCircle size={12} className="mr-1" /> {error}
      </p>
    )}
  </div>
);

const ExpenseAccountsPage = () => {
  const navigate = useNavigate();
  
  // State management
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editAccountId, setEditAccountId] = useState(null);
  const [formData, setFormData] = useState({
    accountName: "",
    description: "",
  });
  const [errors, setErrors] = useState({});

  // Toast state
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // Show toast message
  const showToastMessage = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  }, []);

  // Fetch expense accounts
  const fetchAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await axiosInstance.get("/expense-accounts", {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: searchTerm || undefined,
        },
      });
      setAccounts(res.data?.data?.accounts || []);
      setPagination((prev) => ({
        ...prev,
        total: res.data?.data?.pagination?.total || 0,
        totalPages: res.data?.data?.pagination?.totalPages || 0,
      }));
    } catch (err) {
      showToastMessage(
        err.response?.data?.message || "Failed to fetch expense accounts",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, showToastMessage]);

  // Initial fetch
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchAccounts().finally(() => {
      setIsRefreshing(false);
      showToastMessage("Data refreshed", "success");
    });
  }, [fetchAccounts, showToastMessage]);

  // Calculate totals
  const totals = useMemo(() => {
    return accounts.reduce(
      (acc, account) => ({
        totalExpense: acc.totalExpense + (account.totalExpense || 0),
        totalVat: acc.totalVat + (account.totalVat || 0),
      }),
      { totalExpense: 0, totalVat: 0 }
    );
  }, [accounts]);

  // Form handlers
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.accountName?.trim()) {
      newErrors.accountName = "Account name is required";
    }
    return newErrors;
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData({ accountName: "", description: "" });
    setErrors({});
    setEditAccountId(null);
    setShowModal(false);
  }, []);

  const openAddModal = useCallback(() => {
    resetForm();
    setShowModal(true);
  }, [resetForm]);

  const openEditModal = useCallback((account) => {
    setFormData({
      accountName: account.accountName || "",
      description: account.description || "",
    });
    setEditAccountId(account._id);
    setShowModal(true);
  }, []);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editAccountId) {
        await axiosInstance.put(`/expense-accounts/${editAccountId}`, formData);
        showToastMessage("Expense account updated successfully!", "success");
      } else {
        await axiosInstance.post("/expense-accounts", formData);
        showToastMessage("Expense account created successfully!", "success");
      }
      await fetchAccounts();
      resetForm();
    } catch (err) {
      showToastMessage(
        err.response?.data?.message || "Failed to save expense account",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [editAccountId, formData, fetchAccounts, resetForm, showToastMessage, validateForm]);

  // Delete handler
  const handleDelete = useCallback(
    async (accountId) => {
      if (!window.confirm("Are you sure you want to delete this expense account?")) {
        return;
      }

      try {
        await axiosInstance.delete(`/expense-accounts/${accountId}`);
        showToastMessage("Expense account deleted successfully!", "success");
        await fetchAccounts();
      } catch (err) {
        showToastMessage(
          err.response?.data?.message || "Failed to delete expense account",
          "error"
        );
      }
    },
    [fetchAccounts, showToastMessage]
  );

  // View expense types under an account
  const handleViewTypes = useCallback(
    (accountId) => {
      navigate(`/expense-accounts/${accountId}/types`);
    },
    [navigate]
  );

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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
                Expense Accounts
              </h1>
              <p className="text-gray-500 mt-1">
                Manage expense accounts and view expense summaries
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Add Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Expense Accounts"
          value={pagination.total}
          icon={Wallet}
          bgColor="bg-purple-50 border-purple-200"
          textColor="text-purple-600"
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

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="relative">
          <Search
            size={20}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search expense accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={40} className="animate-spin text-purple-600" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Receipt size={48} className="mb-4 text-gray-300" />
            <p className="text-lg font-medium">No expense accounts found</p>
            <p className="text-sm">Create your first expense account to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-50 to-blue-50">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">
                    Account Code
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">
                    Account Name
                  </th>
                  <th className="text-right py-4 px-6 font-semibold text-gray-700">
                    Total Expense (AED)
                  </th>
                  <th className="text-right py-4 px-6 font-semibold text-gray-700">
                    Total VAT (AED)
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account, index) => (
                  <tr
                    key={account._id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                    }`}
                  >
                    <td className="py-4 px-6">
                      <span className="font-mono text-sm text-purple-600 bg-purple-50 px-2 py-1 rounded">
                        {account.accountCode || "-"}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium text-gray-900">
                          {account.accountName}
                        </p>
                        {account.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {account.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-semibold text-gray-900">
                        {Number(account.totalExpense || 0).toLocaleString("en-AE", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-semibold text-emerald-600">
                        {Number(account.totalVat || 0).toLocaleString("en-AE", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewTypes(account._id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Expense Types"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => openEditModal(account)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(account._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} accounts
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editAccountId ? "Edit Expense Account" : "Create Expense Account"}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <FormInput
                label="Account Name"
                icon={FileText}
                name="accountName"
                value={formData.accountName}
                onChange={handleChange}
                placeholder="e.g., Office Expenses"
                error={errors.accountName}
                required
              />

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FileText size={16} className="inline mr-2 text-purple-500" />
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {editAccountId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseAccountsPage;
