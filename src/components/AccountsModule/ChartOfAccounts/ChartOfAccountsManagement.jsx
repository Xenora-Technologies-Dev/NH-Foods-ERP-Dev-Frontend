import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  X,
  User,
  TrendingUp,
  Calendar,
  DollarSign,
  RefreshCw,
  Save,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Receipt,
  Loader2,
  Package,
  Sparkles,
  CreditCard,
  FileText,
  Users,
  Banknote,
  Edit,
  Trash2,
  Eye,
  Wallet,
  Download,
  Building2,
  ArrowDownCircle,
  BarChart3,
  ChevronDown,
  Hash,
  Clock,
} from "lucide-react";
import Select from "react-select";
import axiosInstance from "../../../axios/axios";
import {
  exportChartOfAccountsExcel,
  exportTrialBalanceExcel,
  exportLedgerExcel,
} from "../../../utils/excelExport";

// ─── Helpers ───────────────────────────────────────────────────────

const asArray = (x) => (Array.isArray(x) ? x : []);
const takeArray = (resp) => {
  if (!resp) return [];
  const d = resp.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data.data ?? d.data;
  if (Array.isArray(d?.chartOfAccounts)) return d.chartOfAccounts;
  if (Array.isArray(d?.vendors)) return d.vendors;
  if (Array.isArray(d?.customers)) return d.customers;
  return [];
};

/** Format currency consistently as AED with 2 decimals */
const formatCurrency = (amount, colorClass = "text-gray-900") => {
  const num = Number(amount) || 0;
  const abs = Math.abs(num).toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const neg = num < 0;
  return (
    <span className={`inline-flex items-center font-semibold ${colorClass}`}>
      {neg && <span className="text-red-600">-</span>}
      <span className="text-xs mr-1 opacity-70">AED</span>
      {abs}
    </span>
  );
};

/** Plain-text currency for export CSV / debugging */
const formatCurrencyPlain = (amount) => {
  const num = Number(amount) || 0;
  return `AED ${Math.abs(num).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${num < 0 ? " (Dr)" : ""}`;
};

/**
 * Task 2 — Map internal transaction types to business document names.
 * Keys are the internal types returned by the backend (upper-case, space-separated).
 */
const TRANSACTION_TYPE_LABELS = {
  "SALES ORDER": "Sales Invoice",
  "PURCHASE ORDER": "Purchase Invoice",
  "PAYMENT RECEIVED": "Payment Voucher",
  "PAYMENT MADE": "Receipt Voucher",
  "RECEIPT_ADVANCE": "Receipt Voucher (Advance)",
  "PAYMENT_ADVANCE": "Payment Voucher (Advance)",
  "SALES RETURN": "Sales Return",
  "PURCHASE RETURN": "Purchase Return",
  "GRN PURCHASE": "Purchase Invoice",
  RECEIPT: "Receipt Voucher",
  PAYMENT: "Payment Voucher",
  JOURNAL: "Journal Entry",
  ADJUSTMENT: "Adjustment",
  "INVOICE EDIT": "Invoice Edit",
  EXPENSE: "Expense Voucher",
};

/** Resolve a human-readable label for an internal transaction type */
const resolveTransactionLabel = (rawType) => {
  if (!rawType) return "Transaction";
  const upper = rawType.toUpperCase().replace(/_/g, " ").trim();
  return TRANSACTION_TYPE_LABELS[upper] || upper.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
};

/**
 * Task 3 — Types that should NOT be shown (allocation rows, etc).
 * These are internal log rows attached to payment allocation events.
 */
const HIDDEN_ALLOCATION_TYPES = new Set([
  "INVOICE ALLOCATION",
  "ALLOCATION",
  "PAYMENT ALLOCATION",
  "SETTLE",
  "SETTLEMENT",
]);

/** Returns true when a transaction should be displayed */
const isVisibleTransaction = (log) => {
  const upper = (log.type || log.voucherType || "").toUpperCase().replace(/_/g, " ").trim();
  return !HIDDEN_ALLOCATION_TYPES.has(upper);
};

/**
 * Task 6 — Return a meaningful reference string, never an ObjectId.
 * Falls back through voucherNo, invNo, ref, partyName.
 */
const resolveReference = (log) => {
  // Check if a value looks like a MongoDB ObjectId (24 hex chars)
  const isObjectId = (v) => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);

  const candidates = [log.voucherNo, log.invNo, log.ref, log.referenceNo];
  for (const c of candidates) {
    if (c && c !== "-" && !isObjectId(c)) return c;
  }
  if (log.partyName) return log.partyName;
  return "-";
};

// ─── Icon map for account types (Task 11) ───

const ACCOUNT_TYPE_ICON = {
  asset: <Building2 size={16} className="text-blue-600" />,
  Asset: <Building2 size={16} className="text-blue-600" />,
  liability: <ArrowDownCircle size={16} className="text-orange-600" />,
  Liability: <ArrowDownCircle size={16} className="text-orange-600" />,
  revenue: <DollarSign size={16} className="text-emerald-600" />,
  Revenue: <DollarSign size={16} className="text-emerald-600" />,
  income: <DollarSign size={16} className="text-emerald-600" />,
  Income: <DollarSign size={16} className="text-emerald-600" />,
  expense: <BarChart3 size={16} className="text-red-600" />,
  Expense: <BarChart3 size={16} className="text-red-600" />,
  equity: <Wallet size={16} className="text-purple-600" />,
  Equity: <Wallet size={16} className="text-purple-600" />,
};

const badgeClassForStatus = (status) => {
  const map = {
    Active: "bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border border-emerald-300",
    Inactive: "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300",
    Compliant: "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300",
    "Non-compliant": "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300",
    Pending: "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300",
    Expired: "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300",
  };
  return map[status] || "bg-gray-100 text-gray-800";
};

// ─── Sub-components ────────────────────────────────────────────────

const FormInput = ({ label, icon: Icon, error, readOnly, hint, ...props }) => (
  <div className="group relative">
    <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors group-focus-within:text-purple-600">
      <Icon size={16} className="inline mr-2 text-purple-500" /> {label}{" "}
      {props.required && <span className="text-red-500">*</span>}
    </label>
    <input
      {...props}
      readOnly={readOnly}
      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all duration-200 ${
        error
          ? "border-red-300 bg-red-50 focus:ring-red-500"
          : readOnly
          ? "bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 cursor-not-allowed"
          : "border-gray-300 hover:border-gray-400"
      }`}
    />
    {hint && !error && (
      <p className="mt-1 text-xs text-gray-500 flex items-center">
        <Sparkles size={10} className="mr-1" /> {hint}
      </p>
    )}
    {error && (
      <p className="mt-1 text-sm text-red-600 flex items-center animate-shake">
        <AlertCircle size={12} className="mr-1" /> {error}
      </p>
    )}
  </div>
);

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

/** Task 9 — New stat card with icon badge */
const StatCard = ({ title, value, icon, bgColor, textColor, borderColor, iconBg, iconColor, subText }) => (
  <div className={`${bgColor} ${borderColor} rounded-2xl p-5 border-2 transition-all duration-300 hover:shadow-xl cursor-pointer hover:scale-[1.03] hover:-translate-y-0.5`}>
    <div className="flex items-center justify-between mb-3">
      <div className={`p-2.5 ${iconBg} rounded-xl shadow-md`}>
        <div className={iconColor}>{icon}</div>
      </div>
    </div>
    <h3 className={`text-xs font-semibold ${textColor} mb-1 uppercase tracking-wide`}>{title}</h3>
    <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>
    {subText && <p className="text-xs text-gray-500 font-medium">{subText}</p>}
  </div>
);

// ─── Allowed primary transaction types for display (Task 3) ────────

const PRIMARY_TYPES = new Set([
  "SALES ORDER",
  "PURCHASE ORDER",
  "SALES RETURN",
  "PURCHASE RETURN",
  "PAYMENT RECEIVED",
  "PAYMENT MADE",
  "RECEIPT_ADVANCE",
  "PAYMENT_ADVANCE",
  "GRN PURCHASE",
  "JOURNAL",
  "ADJUSTMENT",
  "INVOICE EDIT",
  "EXPENSE",
  // Lowercase variants the backend may return
  "sales_order",
  "purchase_order",
  "sales_return",
  "purchase_return",
  "payment_received",
  "payment_made",
  "receipt_advance",
  "payment_advance",
  "grn_purchase",
  "journal",
  "adjustment",
  "invoice_edit",
  "expense",
]);

const TRANSACTION_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "sales_order", label: "Sales Invoice" },
  { value: "purchase_order", label: "Purchase Invoice" },
  { value: "sales_return", label: "Sales Return" },
  { value: "purchase_return", label: "Purchase Return" },
  { value: "payment_received", label: "Payment Voucher" },
  { value: "payment_made", label: "Receipt Voucher" },
  { value: "receipt_advance", label: "Receipt Voucher (Advance)" },
  { value: "journal", label: "Journal Entry" },
  { value: "adjustment", label: "Adjustment" },
  { value: "invoice_edit", label: "Invoice Edit" },
];

// ==================================================================
// Main Component
// ==================================================================

const ChartOfAccountsManagement = () => {
  // ─── Data state ────────────────────────────────────────────────
  const [chartOfAccounts, setChartOfAccounts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);

  // ─── Tab state (Task 1) ────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("accounts");

  // ─── Search and filter ─────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // ─── Add / Edit modal ─────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [formData, setFormData] = useState({
    accountName: "",
    openingBalance: "0.00",
    currentBalance: "0.00",
    accountType: "",
    accountCategory: "other",
    status: "Active",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Transaction / Ledger modal ────────────────────────────────
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [accountTransactions, setAccountTransactions] = useState([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [backendSummary, setBackendSummary] = useState({});
  const [viewingAccount, setViewingAccount] = useState(null);
  const [transactionDateFilter, setTransactionDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // ─── Ledger advanced filters (Task 7) ──────────────────────────
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState("all");
  const [ledgerVoucherNoFilter, setLedgerVoucherNoFilter] = useState("");
  const [ledgerInvoiceNoFilter, setLedgerInvoiceNoFilter] = useState("");
  const [ledgerAmountMin, setLedgerAmountMin] = useState("");
  const [ledgerAmountMax, setLedgerAmountMax] = useState("");
  const [ledgerPartyFilter, setLedgerPartyFilter] = useState("");

  // ─── Export dropdown (Task 8) ──────────────────────────────────
  const [showExportMenu, setShowExportMenu] = useState(false);

  // ─── General UI ────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [showToast, setShowToast] = useState({ visible: false, message: "", type: "success" });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const modalRef = useRef(null);
  const exportMenuRef = useRef(null);

  // ─── Toast helper ──────────────────────────────────────────────
  const showToastMessage = useCallback((message, type = "success") => {
    setShowToast({ visible: true, message, type });
    setTimeout(() => setShowToast((prev) => ({ ...prev, visible: false })), 3000);
  }, []);

  // ─── Close export menu on outside click ────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Data fetchers ─────────────────────────────────────────────

  const fetchChartOfAccounts = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/account-v2/Transactor");
      const data = takeArray(res);
      setChartOfAccounts(
        data.map((t) => ({
          _id: t._id,
          id: t.accountCode,
          name: t.accountName,
          type: "ChartOfAccounts",
          openingBalance: t.openingBalance || 0,
          currentBalance: t.currentBalance || 0,
          accountType: t.accountType,
          accountCategory: t.accountCategory || t.transactorCategory || "other",
          status: t.status,
          isChartOfAccounts: true,
        }))
      );
    } catch (err) {
      showToastMessage("Failed to fetch chart of accounts.", "error");
      setChartOfAccounts([]);
    }
  }, [showToastMessage]);

  const fetchVendors = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/ledger/debit-accounts");
      const data = response?.data?.data || [];
      setVendors(
        data.map((v) => ({
          _id: v._id,
          id: v.partyId,
          name: v.name,
          type: "Vendor",
          openingBalance: 0,
          currentBalance: v.balance || 0,
          accountType: "Liability",
          status: "Active",
          isChartOfAccounts: false,
          partyType: "Vendor",
          totalInvoices: v.totalInvoices || 0,
          totalInvoiced: v.totalInvoiced || 0,
          totalPaid: v.totalPaid || 0,
          totalPayable: v.totalPayable || 0,
        }))
      );
    } catch (err) {
      showToastMessage("Failed to fetch vendors.", "error");
      setVendors([]);
    }
  }, [showToastMessage]);

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/ledger/credit-accounts");
      const data = response?.data?.data || [];
      setCustomers(
        data.map((c) => ({
          _id: c._id,
          id: c.partyId,
          name: c.name,
          type: "Customer",
          openingBalance: 0,
          currentBalance: c.balance || 0,
          accountType: "Asset",
          status: "Active",
          isChartOfAccounts: false,
          partyType: "Customer",
          totalInvoices: c.totalInvoices || 0,
          totalInvoiced: c.totalInvoiced || 0,
          totalPaid: c.totalPaid || 0,
          totalReceivable: c.totalReceivable || 0,
        }))
      );
    } catch (err) {
      showToastMessage("Failed to fetch customers.", "error");
      setCustomers([]);
    }
  }, [showToastMessage]);

  const fetchExpenseAccounts = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/expense-accounts/coa/list");
      const data = response?.data?.data || [];
      setExpenseAccounts(
        data.map((e) => ({
          _id: e._id,
          id: e.accountCode || e.id,
          name: e.accountName || e.name,
          type: "Expense",
          openingBalance: e.openingBalance || 0,
          currentBalance: e.currentBalance || e.totalExpense || 0,
          accountType: "Expense",
          accountCategory: "expense",
          status: e.status || "Active",
          isChartOfAccounts: false,
          isExpenseAccount: true,
          partyType: null,
          voucherCount: e.voucherCount || 0,
        }))
      );
    } catch (err) {
      console.error("Failed to fetch expense accounts:", err);
      showToastMessage("Failed to fetch expense accounts.", "error");
      setExpenseAccounts([]);
    }
  }, [showToastMessage]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchChartOfAccounts(), fetchVendors(), fetchCustomers(), fetchExpenseAccounts()]);
      setIsLoading(false);
    };
    load();
  }, [fetchChartOfAccounts, fetchVendors, fetchCustomers, fetchExpenseAccounts]);

  // ─── Modal handlers ────────────────────────────────────────────

  const openAddModal = useCallback(() => {
    setModalMode("add");
    setFormData({
      accountName: "",
      openingBalance: "0.00",
      currentBalance: "0.00",
      accountType: "",
      accountCategory: "other",
      status: "Active",
    });
    setShowModal(true);
    setTimeout(() => {
      if (modalRef.current) modalRef.current.classList.add("scale-100", "opacity-100");
    }, 10);
  }, []);

  const openEditModal = useCallback((account) => {
    setModalMode("edit");
    setSelectedAccount(account);
    setFormData({
      accountName: account.name,
      openingBalance: (account.openingBalance || 0).toFixed(2),
      currentBalance: (account.currentBalance || 0).toFixed(2),
      accountType: account.accountType,
      accountCategory: account.accountCategory || "other",
      status: account.status,
    });
    setShowModal(true);
    setTimeout(() => {
      if (modalRef.current) modalRef.current.classList.add("scale-100", "opacity-100");
    }, 10);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setModalMode("add");
    setSelectedAccount(null);
    setFormData({ accountName: "", openingBalance: "0.00", currentBalance: "0.00", accountType: "", accountCategory: "other", status: "Active" });
    setErrors({});
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }, []);

  const validateForm = useCallback(() => {
    const e = {};
    if (!formData.accountName) e.accountName = "Name is required";
    if (!formData.accountType) e.accountType = "Account type is required";
    return e;
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    const err = validateForm();
    if (Object.keys(err).length) {
      setErrors(err);
      showToastMessage("Please fix the errors", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        accountName: formData.accountName,
        openingBalance: Number(formData.openingBalance),
        currentBalance: Number(formData.currentBalance),
        accountType: formData.accountType,
        transactorCategory: formData.accountCategory || "other",
        status: formData.status,
      };
      if (modalMode === "edit" && selectedAccount) {
        await axiosInstance.put(`/account-v2/Transactor/${selectedAccount._id}`, payload);
        showToastMessage("Account updated!", "success");
      } else {
        await axiosInstance.post("/account-v2/Transactor", payload);
        showToastMessage("Account created!", "success");
      }
      closeModal();
      await fetchChartOfAccounts();
    } catch (er) {
      showToastMessage(er.response?.data?.message || `Failed to ${modalMode === "edit" ? "update" : "create"} account`, "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, showToastMessage, closeModal, modalMode, selectedAccount, fetchChartOfAccounts]);

  const handleDelete = useCallback(
    async (accountId) => {
      if (!window.confirm("Are you sure you want to delete this account?")) return;
      setIsSubmitting(true);
      try {
        await axiosInstance.delete(`/account-v2/Transactor/${accountId}`);
        showToastMessage("Account deleted!", "success");
        await fetchChartOfAccounts();
      } catch (er) {
        showToastMessage(er.response?.data?.message || "Failed to delete account", "error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [showToastMessage, fetchChartOfAccounts]
  );

  // ─── Transaction Viewer ────────────────────────────────────────
  // Tasks 2, 3, 4, 5, 6 are all applied here

  const handleViewTransactions = useCallback(
    async (item, filterType = null) => {
      setTransactionLoading(true);
      setViewingAccount(item);
      try {
        let transactions = [];

        const filterByDate = (txns, fType) => {
          if (!fType || fType === "all") return txns;
          const now = new Date();
          let startDate, endDate;
          if (fType === "day") {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          } else if (fType === "month") {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          } else if (fType === "year") {
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
          } else if (fType === "custom") {
            startDate = customStartDate ? new Date(customStartDate) : null;
            endDate = customEndDate ? new Date(customEndDate + "T23:59:59.999") : null;
          }
          return txns.filter((t) => {
            const txDate = new Date(t.date);
            if (startDate && txDate < startDate) return false;
            if (endDate && txDate > endDate) return false;
            return true;
          });
        };

        if (item.isExpenseAccount) {
          const params = new URLSearchParams();
          if (filterType && filterType !== "all") params.append("filterType", filterType);
          if (filterType === "custom" && customStartDate) params.append("startDate", customStartDate);
          if (filterType === "custom" && customEndDate) params.append("endDate", customEndDate);
          const res = await axiosInstance.get(`/expense-accounts/coa/${item._id}/transactions?${params.toString()}`);
          const data = res.data?.data || {};
          transactions = (data.transactions || []).filter(isVisibleTransaction);
        } else if (item.isChartOfAccounts) {
          const res = await axiosInstance.get(`/account-v2/transactor/${item._id}/transactions?limit=100`);
          const rawTransactions = (res.data?.data?.transactions || []).filter(isVisibleTransaction);
          const filteredRaw = filterByDate(rawTransactions, filterType);

          // Task 5 — use backend balance when available; otherwise compute
          let runningBalance = item.openingBalance || 0;
          transactions = filteredRaw
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map((t) => {
              // Use backend-supplied balance if present (Task 5)
              if (t.balance !== undefined && t.balance !== null) {
                runningBalance = Number(t.balance);
              } else {
                runningBalance += (t.debitAmount || 0) - (t.creditAmount || 0);
              }
              return {
                date: t.date,
                type: t.voucherType || "journal",
                voucherType: t.voucherType || "journal",
                voucherNo: resolveReference(t),
                referenceNo: t.referenceNo || t.partyName || "-",
                referenceType: t.referenceType || "other",
                debitAmount: t.debitAmount || 0,
                creditAmount: t.creditAmount || 0,
                runningBalance,
                partyName: t.partyName,
                description: t.description,
              };
            });
        } else if (item.partyType === "Vendor") {
          const res = await axiosInstance.get(`/ledger/ledger/vendor/${item._id}`);
          const rawLedger = (res.data?.data?.ledger || []).filter(isVisibleTransaction);
          const vendorBackendSummary = res.data?.data?.summary || {};
          const filteredLedger = filterByDate(rawLedger, filterType);

          let runningBalance = item.openingBalance || 0;
          transactions = filteredLedger.map((log) => {
            let debitAmount = 0;
            let creditAmount = 0;

            const upperType = (log.type || "").toUpperCase();
            if (upperType === "PURCHASE ORDER" || upperType === "GRN PURCHASE") {
              creditAmount = Math.abs(log.amount);
              // Task 5: prefer backend balance
              if (log.balance !== undefined && log.balance !== null) {
                runningBalance = Number(log.balance);
              } else {
                runningBalance += creditAmount;
              }
            } else if (upperType === "PURCHASE RETURN") {
              debitAmount = Math.abs(log.amount);
              if (log.balance !== undefined && log.balance !== null) {
                runningBalance = Number(log.balance);
              } else {
                runningBalance -= debitAmount;
              }
            } else if (upperType === "PAYMENT RECEIVED") {
              debitAmount = Math.abs(log.paid || log.amount);
              if (log.balance !== undefined && log.balance !== null) {
                runningBalance = Number(log.balance);
              } else {
                runningBalance -= debitAmount;
              }
            } else if (upperType === "INVOICE EDIT") {
              const editAmt = log.amount || 0;
              if (editAmt > 0) {
                creditAmount = Math.abs(editAmt);
              } else {
                debitAmount = Math.abs(editAmt);
              }
              if (log.balance !== undefined && log.balance !== null) {
                runningBalance = Number(log.balance);
              } else {
                runningBalance += editAmt;
              }
            }

            // Determine payment label: advance vs invoice payment
            let displayType = log.type;
            if (upperType === "PAYMENT RECEIVED") {
              displayType = log.status === "ADVANCE" ? "PAYMENT_ADVANCE" : "PAYMENT RECEIVED";
            }

            return {
              date: log.date,
              type: displayType,
              voucherType: displayType.toLowerCase().replace(/ /g, "_") || "transaction",
              voucherNo: resolveReference(log),
              referenceNo: resolveReference({ ...log, voucherNo: null }),
              referenceType: log.type?.includes("PAYMENT") ? "payment" : "invoice",
              debitAmount,
              creditAmount,
              runningBalance,
              status: log.status,
              partyName: log.partyName,
            };
          });

          // Store backend summary for ERP metrics
          setBackendSummary(vendorBackendSummary);
        } else if (item.partyType === "Customer") {
          const res = await axiosInstance.get(`/ledger/ledger/customer/${item._id}`);
          const rawLedger = (res.data?.data?.ledger || []).filter(isVisibleTransaction);
          const backendSummary = res.data?.data?.summary || {};
          const filteredLedger = filterByDate(rawLedger, filterType);

          let runningBalance = item.openingBalance || 0;
          transactions = filteredLedger.map((log) => {
            let debitAmount = 0;
            let creditAmount = 0;

            const upperType = (log.type || "").toUpperCase();
            if (upperType === "SALES ORDER") {
              debitAmount = Math.abs(log.amount);
              if (log.balance !== undefined && log.balance !== null) {
                runningBalance = Number(log.balance);
              } else {
                runningBalance += debitAmount;
              }
            } else if (upperType === "SALES RETURN") {
              creditAmount = Math.abs(log.amount);
              if (log.balance !== undefined && log.balance !== null) {
                runningBalance = Number(log.balance);
              } else {
                runningBalance -= creditAmount;
              }
            } else if (upperType === "PAYMENT MADE") {
              creditAmount = Math.abs(log.paid || log.amount);
              if (log.balance !== undefined && log.balance !== null) {
                runningBalance = Number(log.balance);
              } else {
                runningBalance -= creditAmount;
              }
            } else if (upperType === "INVOICE EDIT") {
              const editAmt = log.amount || 0;
              if (editAmt > 0) {
                debitAmount = Math.abs(editAmt);
              } else {
                creditAmount = Math.abs(editAmt);
              }
              if (log.balance !== undefined && log.balance !== null) {
                runningBalance = Number(log.balance);
              } else {
                runningBalance += editAmt;
              }
            }

            // Determine receipt label: advance vs invoice payment
            let displayType = log.type;
            if (upperType === "PAYMENT MADE") {
              displayType = log.status === "ADVANCE" ? "RECEIPT_ADVANCE" : "PAYMENT MADE";
            }

            return {
              date: log.date,
              type: displayType,
              voucherType: displayType.toLowerCase().replace(/ /g, "_") || "transaction",
              voucherNo: resolveReference(log),
              referenceNo: resolveReference({ ...log, voucherNo: null }),
              referenceType: upperType === "PAYMENT MADE" ? "receipt" : "invoice",
              debitAmount,
              creditAmount,
              runningBalance,
              status: log.status,
              partyName: log.partyName,
            };
          });

          // Store backend summary for ERP metrics
          setBackendSummary(backendSummary);
        }

        setAccountTransactions(transactions);
        setShowTransactionModal(true);
      } catch (err) {
        console.error("Error fetching transactions:", err);
        showToastMessage("Failed to fetch transactions", "error");
      } finally {
        setTransactionLoading(false);
      }
    },
    [showToastMessage, customStartDate, customEndDate]
  );

  // ─── Filtered ledger transactions (Task 7) ────────────────────

  const filteredTransactions = useMemo(() => {
    let list = accountTransactions;

    // Type filter
    if (ledgerTypeFilter && ledgerTypeFilter !== "all") {
      list = list.filter((t) => {
        const raw = (t.type || t.voucherType || "").toLowerCase().replace(/ /g, "_");
        return raw === ledgerTypeFilter;
      });
    }

    // Voucher No filter
    if (ledgerVoucherNoFilter.trim()) {
      const term = ledgerVoucherNoFilter.trim().toLowerCase();
      list = list.filter((t) => (t.voucherNo || "").toLowerCase().includes(term));
    }

    // Invoice No filter
    if (ledgerInvoiceNoFilter.trim()) {
      const term = ledgerInvoiceNoFilter.trim().toLowerCase();
      list = list.filter(
        (t) =>
          (t.voucherNo || "").toLowerCase().includes(term) ||
          (t.referenceNo || "").toLowerCase().includes(term)
      );
    }

    // Amount range
    if (ledgerAmountMin !== "") {
      const min = Number(ledgerAmountMin);
      list = list.filter((t) => Math.max(t.debitAmount || 0, t.creditAmount || 0) >= min);
    }
    if (ledgerAmountMax !== "") {
      const max = Number(ledgerAmountMax);
      list = list.filter((t) => Math.max(t.debitAmount || 0, t.creditAmount || 0) <= max);
    }

    // Party filter
    if (ledgerPartyFilter.trim()) {
      const term = ledgerPartyFilter.trim().toLowerCase();
      list = list.filter(
        (t) =>
          (t.partyName || "").toLowerCase().includes(term) ||
          (t.referenceNo || "").toLowerCase().includes(term)
      );
    }

    return list;
  }, [accountTransactions, ledgerTypeFilter, ledgerVoucherNoFilter, ledgerInvoiceNoFilter, ledgerAmountMin, ledgerAmountMax, ledgerPartyFilter]);

  // ─── Transaction Summary (Task 10) ────────────────────────────
  // Uses ONLY backend ledger values — no allocation-based recalculation.
  // Outstanding = totalInvoiced - totalReturns - totalPayments (actual financial movement).
  const transactionSummary = useMemo(() => {
    const txns = filteredTransactions;
    const totalDebit = txns.reduce((s, t) => s + (Number(t.debitAmount) || 0), 0);
    const totalCredit = txns.reduce((s, t) => s + (Number(t.creditAmount) || 0), 0);
    const openingBal = viewingAccount?.openingBalance || 0;
    const closingBal = txns.length > 0 ? txns[txns.length - 1].runningBalance : openingBal;
    const lastDate = txns.length > 0 ? txns[txns.length - 1].date : null;

    const isCustomer = viewingAccount?.partyType === "Customer";
    const isVendor = viewingAccount?.partyType === "Vendor";

    // Always derive from backend ledger summary (single source of truth)
    const totalSales = backendSummary.totalSales ?? (isCustomer ? totalDebit : 0);
    const totalPurchases = backendSummary.totalPurchases ?? (isVendor ? totalDebit : 0);
    const totalPayments = backendSummary.totalPayments ?? totalCredit;
    const totalReturns = backendSummary.totalReturns ?? 0;

    // Outstanding = closingBalance from backend (derived from actual transactions)
    // Positive closingBalance = outstanding; Negative = advance (inferred automatically)
    const closingBalFromBackend = backendSummary.closingBalance ?? closingBal;
    const outstandingReceivable = isCustomer ? Math.max(0, closingBalFromBackend) : 0;
    const outstandingPayable = isVendor ? Math.max(0, closingBalFromBackend) : 0;

    return {
      openingBalance: openingBal,
      totalDebit,
      totalCredit,
      closingBalance: closingBal,
      transactionCount: txns.length,
      lastTransactionDate: lastDate,
      // ERP metrics — all derived from actual financial transactions
      totalSales,
      totalPurchases,
      totalPayments,
      totalReturns,
      outstandingReceivable,
      outstandingPayable,
      isCustomer,
      isVendor,
    };
  }, [filteredTransactions, viewingAccount, backendSummary]);

  // ─── Refresh ───────────────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    Promise.all([fetchChartOfAccounts(), fetchVendors(), fetchCustomers(), fetchExpenseAccounts()]).finally(() => {
      setIsRefreshing(false);
      showToastMessage("Data refreshed", "success");
    });
  }, [fetchChartOfAccounts, fetchVendors, fetchCustomers, fetchExpenseAccounts, showToastMessage]);

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc" }));
  }, []);

  // ─── Task 1: Tab-based filtering ──────────────────────────────

  const currentTabList = useMemo(() => {
    switch (activeTab) {
      case "accounts":
        return chartOfAccounts;
      case "customers":
        return customers;
      case "vendors":
        return vendors;
      case "expenses":
        return expenseAccounts;
      default:
        return chartOfAccounts;
    }
  }, [activeTab, chartOfAccounts, customers, vendors, expenseAccounts]);

  const filteredList = useMemo(() => {
    let list = currentTabList;
    if (selectedType) {
      list = list.filter((t) => t.accountType === selectedType.value || t.type === selectedType.value);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter((t) => t.name?.toLowerCase().includes(term) || t.id?.toLowerCase().includes(term));
    }
    if (sortConfig.key) {
      list = [...list].sort((a, b) => {
        const isNumeric = sortConfig.key === "openingBalance" || sortConfig.key === "currentBalance";
        const aVal = isNumeric ? Number(a[sortConfig.key]) : (a[sortConfig.key] || "").toString().toLowerCase();
        const bVal = isNumeric ? Number(b[sortConfig.key]) : (b[sortConfig.key] || "").toString().toLowerCase();
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [currentTabList, selectedType, searchTerm, sortConfig]);

  // ─── Task 9: Enhanced stat cards ──────────────────────────────

  const stats = useMemo(() => {
    const allAccounts = chartOfAccounts;
    const totalAccounts = allAccounts.length;
    const assetsBalance = allAccounts.filter((a) => (a.accountType || "").toLowerCase() === "asset").reduce((s, a) => s + Number(a.currentBalance || 0), 0);
    const liabilitiesBalance = allAccounts.filter((a) => (a.accountType || "").toLowerCase() === "liability").reduce((s, a) => s + Number(a.currentBalance || 0), 0);
    const accountsReceivable = customers.reduce((s, c) => s + Math.max(0, Number(c.currentBalance || 0)), 0);
    const accountsPayable = vendors.reduce((s, v) => s + Math.max(0, Number(v.currentBalance || 0)), 0);
    return { totalAccounts, assetsBalance, liabilitiesBalance, accountsReceivable, accountsPayable };
  }, [chartOfAccounts, customers, vendors]);

  // ─── Type filter options (context-aware) ───────────────────────

  const typeOptions = useMemo(() => {
    if (activeTab === "accounts") {
      const types = [...new Set(chartOfAccounts.map((a) => a.accountType).filter(Boolean))];
      return [{ value: "", label: "All Types" }, ...types.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))];
    }
    return [];
  }, [activeTab, chartOfAccounts]);

  // ─── Export handlers (Task 8) ─────────────────────────────────

  const handleExportLedger = useCallback(() => {
    if (filteredTransactions.length === 0) return;
    exportLedgerExcel(filteredTransactions, viewingAccount, transactionSummary);
  }, [filteredTransactions, viewingAccount, transactionSummary]);

  const handleExportCOA = useCallback(() => {
    const mapped = chartOfAccounts.map((a) => ({
      accountCode: a.id,
      accountName: a.name,
      accountType: a.accountType,
      accountSubType: a.accountCategory,
      currentBalance: a.currentBalance,
      openingBalance: a.openingBalance,
      isActive: a.status === "Active",
      isSystemAccount: false,
    }));
    exportChartOfAccountsExcel(mapped, { accountType: selectedType?.value, search: searchTerm });
  }, [chartOfAccounts, selectedType, searchTerm]);

  const handleExportTrialBalance = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/reports/trial-balance");
      const report = res.data?.data || res.data;
      if (report) {
        exportTrialBalanceExcel(report);
      } else {
        showToastMessage("No trial balance data available", "error");
      }
    } catch (err) {
      showToastMessage("Failed to fetch trial balance for export", "error");
    }
  }, [showToastMessage]);

  const resetLedgerFilters = useCallback(() => {
    setLedgerTypeFilter("all");
    setLedgerVoucherNoFilter("");
    setLedgerInvoiceNoFilter("");
    setLedgerAmountMin("");
    setLedgerAmountMax("");
    setLedgerPartyFilter("");
  }, []);

  // ─── Loading skeleton ──────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="animate-pulse bg-gray-200 rounded-full w-10 h-10" />
            <div>
              <div className="animate-pulse bg-gray-200 rounded w-48 h-6 mb-2" />
              <div className="animate-pulse bg-gray-200 rounded w-64 h-3" />
            </div>
          </div>
          <div className="animate-pulse bg-gray-200 rounded-lg w-36 h-10" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="animate-pulse bg-gray-200 rounded w-24 h-3" />
                <div className="animate-pulse bg-gray-200 rounded-full w-8 h-8" />
              </div>
              <div className="animate-pulse bg-gray-200 rounded w-16 h-7 mb-2" />
              <div className="animate-pulse bg-gray-200 rounded w-32 h-3" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="bg-gray-50 border-b px-6 py-4">
            <div className="flex gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-200 rounded w-24 h-3" />
              ))}
            </div>
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`px-6 py-4 flex gap-4 ${i % 2 === 1 ? "bg-gray-50/50" : ""} border-b border-gray-100`}>
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="animate-pulse bg-gray-200 rounded w-24 h-4" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Tab definitions (Task 1) ──────────────────────────────────

  const tabs = [
    { key: "accounts", label: "Accounts", icon: <Building2 size={16} />, count: chartOfAccounts.length },
    { key: "customers", label: "Customers (AR)", icon: <Users size={16} />, count: customers.length },
    { key: "vendors", label: "Vendors (AP)", icon: <Package size={16} />, count: vendors.length },
    { key: "expenses", label: "Expenses", icon: <BarChart3 size={16} />, count: expenseAccounts.length },
  ];

  // ─── Columns per tab ──────────────────────────────────────────

  const getColumns = () => {
    switch (activeTab) {
      case "accounts":
        return [
          { key: "id", label: "Code" },
          { key: "name", label: "Account Name" },
          { key: "accountType", label: "Type" },
          { key: "accountCategory", label: "Category" },
          { key: "openingBalance", label: "Opening Balance" },
          { key: "currentBalance", label: "Current Balance" },
          { key: "status", label: "Status" },
          { key: "actions", label: "Actions" },
        ];
      case "customers":
        return [
          { key: "id", label: "ID" },
          { key: "name", label: "Customer Name" },
          { key: "currentBalance", label: "Balance" },
          { key: "status", label: "Status" },
          { key: "actions", label: "Actions" },
        ];
      case "vendors":
        return [
          { key: "id", label: "ID" },
          { key: "name", label: "Vendor Name" },
          { key: "currentBalance", label: "Balance" },
          { key: "status", label: "Status" },
          { key: "actions", label: "Actions" },
        ];
      case "expenses":
        return [
          { key: "id", label: "Code" },
          { key: "name", label: "Expense Account" },
          { key: "currentBalance", label: "Total Expense" },
          { key: "status", label: "Status" },
          { key: "actions", label: "Actions" },
        ];
      default:
        return [];
    }
  };

  // ─── VoucherType badge color ───────────────────────────────────

  const txBadgeClass = (rawType) => {
    const upper = (rawType || "").toUpperCase().replace(/_/g, " ");
    if (upper.includes("SALES ORDER")) return "bg-emerald-100 text-emerald-800";
    if (upper.includes("PURCHASE ORDER") || upper.includes("GRN")) return "bg-amber-100 text-amber-800";
    if (upper.includes("SALES RETURN")) return "bg-teal-100 text-teal-800";
    if (upper.includes("PURCHASE RETURN")) return "bg-yellow-100 text-yellow-800";
    if (upper.includes("PAYMENT RECEIVED")) return "bg-orange-100 text-orange-800";
    if (upper.includes("PAYMENT MADE") || upper.includes("RECEIPT ON ACCOUNT")) return "bg-blue-100 text-blue-800";
    if (upper.includes("RECEIPT")) return "bg-blue-100 text-blue-800";
    if (upper.includes("JOURNAL")) return "bg-purple-100 text-purple-800";
    if (upper.includes("EXPENSE")) return "bg-red-100 text-red-800";
    if (upper.includes("CONTRA")) return "bg-indigo-100 text-indigo-800";
    return "bg-gray-100 text-gray-800";
  };

  // ─── Render ────────────────────────────────────────────────────

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <Users size={40} className="text-purple-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No records found</h3>
      <p className="text-gray-600 text-center max-w-md">{searchTerm ? "No results match your search." : "Try adjusting filters or add a new account."}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4 sm:p-6">
      <style>{`
        @keyframes slide-in { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
        .animate-slide-in { animation: slide-in .3s ease-out; }
        .animate-shake { animation: shake .3s ease-in-out; }
        .modal-backdrop { backdrop-filter: blur(8px); animation: fadeIn .2s ease-out; }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      `}</style>

      <Toast show={showToast.visible} message={showToast.message} type={showToast.type} />

      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button className="p-3 rounded-xl bg-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Chart of Accounts</h1>
            <p className="text-gray-600 mt-1 font-medium">{stats.totalAccounts} accounts &middot; {customers.length} customers &middot; {vendors.length} vendors</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          {activeTab === "accounts" && (
            <button onClick={openAddModal} className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold">
              <Plus size={18} /> Add Account
            </button>
          )}

          {/* Task 8 — Export dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Download size={18} /> Export <ChevronDown size={14} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 py-2">
                <button onClick={() => { handleExportCOA(); setShowExportMenu(false); }} className="w-full text-left px-4 py-2.5 hover:bg-purple-50 text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FileText size={15} className="text-purple-500" /> Export Chart of Accounts
                </button>
                <button onClick={() => { handleExportTrialBalance(); setShowExportMenu(false); }} className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm font-medium text-gray-700 flex items-center gap-2">
                  <BarChart3 size={15} className="text-blue-500" /> Export Trial Balance
                </button>
              </div>
            )}
          </div>

          <button onClick={handleRefresh} disabled={isRefreshing} className="p-3 rounded-xl bg-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 hover:scale-105" title="Refresh">
            <RefreshCw size={18} className={`text-gray-600 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          {activeTab === "accounts" && (
            <button onClick={() => setShowFilters((v) => !v)} className={`p-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 ${showFilters ? "bg-purple-100 text-purple-600 ring-2 ring-purple-300" : "bg-white text-gray-600"}`} title="Filters">
              <Filter size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ─── Task 9: Stat Cards ─────────────────────────────────── */}
      <div className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <StatCard title="Total Accounts" value={stats.totalAccounts} icon={<Building2 size={22} />} bgColor="bg-emerald-50" textColor="text-emerald-700" borderColor="border-emerald-200" iconBg="bg-emerald-100" iconColor="text-emerald-600" subText="All chart of accounts" />
          <StatCard title="Assets Balance" value={formatCurrency(stats.assetsBalance, "text-blue-700")} icon={<Building2 size={22} />} bgColor="bg-blue-50" textColor="text-blue-700" borderColor="border-blue-200" iconBg="bg-blue-100" iconColor="text-blue-600" subText="Total asset accounts" />
          <StatCard title="Liabilities Balance" value={formatCurrency(stats.liabilitiesBalance, "text-orange-700")} icon={<ArrowDownCircle size={22} />} bgColor="bg-orange-50" textColor="text-orange-700" borderColor="border-orange-200" iconBg="bg-orange-100" iconColor="text-orange-600" subText="Total liability accounts" />
          <StatCard title="Accounts Receivable" value={formatCurrency(stats.accountsReceivable, "text-purple-700")} icon={<Users size={22} />} bgColor="bg-purple-50" textColor="text-purple-700" borderColor="border-purple-200" iconBg="bg-purple-100" iconColor="text-purple-600" subText={`${customers.length} customers`} />
          <StatCard title="Accounts Payable" value={formatCurrency(stats.accountsPayable, "text-red-700")} icon={<Package size={22} />} bgColor="bg-red-50" textColor="text-red-700" borderColor="border-red-200" iconBg="bg-red-100" iconColor="text-red-600" subText={`${vendors.length} vendors`} />
        </div>
      </div>

      {/* ─── Task 1: Tabs ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSearchTerm("");
                  setSelectedType(null);
                }}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all duration-200 border-b-2 ${
                  activeTab === tab.key
                    ? "border-purple-600 text-purple-700 bg-purple-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.icon}
                {tab.label}
                <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${activeTab === tab.key ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Search & Filters ──────────────────────────────────── */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {activeTab === "accounts" && "Chart of Accounts"}
                {activeTab === "customers" && "Customer Accounts (Receivable)"}
                {activeTab === "vendors" && "Vendor Accounts (Payable)"}
                {activeTab === "expenses" && "Expense Accounts"}
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                {filteredList.length} {activeTab === "accounts" ? "accounts" : "records"} found
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Search by name or ID...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all hover:border-gray-300"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              )}
            </div>
            {showFilters && activeTab === "accounts" && typeOptions.length > 1 && (
              <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                <div className="w-full sm:w-64">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Filter size={16} className="inline mr-2" /> Account Type
                  </label>
                  <Select value={selectedType} onChange={setSelectedType} options={typeOptions} isSearchable placeholder="All types" classNamePrefix="react-select" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Table ─────────────────────────────────────────────── */}
        {filteredList.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  {getColumns().map((col) => (
                    <th
                      key={col.key}
                      onClick={col.key !== "actions" ? () => handleSort(col.key) : null}
                      className={`px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${col.key !== "actions" ? "cursor-pointer hover:bg-gray-100" : ""} transition-colors`}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{col.label}</span>
                        {sortConfig.key === col.key && col.key !== "actions" && (
                          <span className="text-purple-600 font-bold">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredList.map((item) => (
                  <tr key={item._id || item.id} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all duration-200">
                    {/* ID / Code */}
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.id}</td>

                    {/* Name with icon (Task 11) */}
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      <div className="flex items-center gap-2">
                        {ACCOUNT_TYPE_ICON[item.accountType] || null}
                        {item.name}
                      </div>
                    </td>

                    {/* Tab: Accounts — extra columns */}
                    {activeTab === "accounts" && (
                      <>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            (item.accountType || "").toLowerCase() === "asset" ? "bg-blue-100 text-blue-800"
                            : (item.accountType || "").toLowerCase() === "liability" ? "bg-orange-100 text-orange-800"
                            : (item.accountType || "").toLowerCase() === "equity" ? "bg-purple-100 text-purple-800"
                            : (item.accountType || "").toLowerCase() === "revenue" || (item.accountType || "").toLowerCase() === "income" ? "bg-emerald-100 text-emerald-800"
                            : (item.accountType || "").toLowerCase() === "expense" ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                          }`}>
                            {item.accountType ? item.accountType.charAt(0).toUpperCase() + item.accountType.slice(1) : "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            item.accountCategory === "bank" ? "bg-blue-100 text-blue-800"
                            : item.accountCategory === "cash" ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                          }`}>
                            {(item.accountCategory || "other").charAt(0).toUpperCase() + (item.accountCategory || "other").slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">{formatCurrency(item.openingBalance)}</td>
                      </>
                    )}

                    {/* Current Balance — all tabs */}
                    <td className="px-6 py-4 text-sm">{formatCurrency(item.currentBalance)}</td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeClassForStatus(item.status)}`}>{item.status}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-sm">
                      <div className="flex space-x-2">
                        <button onClick={() => handleViewTransactions(item)} className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-all duration-200 hover:scale-110" title="View Ledger">
                          <Eye size={16} />
                        </button>
                        {item.isChartOfAccounts && !item.isExpenseAccount && (
                          <>
                            <button onClick={() => openEditModal(item)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-all duration-200 hover:scale-110" title="Edit">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleDelete(item._id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-all duration-200 hover:scale-110" title="Delete">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                        {item.isExpenseAccount && (
                          <span className="text-xs text-gray-400 italic self-center ml-2" title="Edit from Expense Accounts section">(Manage in Expense)</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          Add / Edit Account Modal
          ═══════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 modal-backdrop flex items-center justify-center p-4 z-50">
          <div ref={modalRef} className="bg-white rounded-3xl shadow-2xl w-1/2 overflow-hidden transform scale-95 opacity-0 transition-all duration-300">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 sticky top-0 z-10">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Users size={28} />
                  {modalMode === "edit" ? "Edit Account" : "Add New Account"}
                </h3>
                <p className="text-purple-100 text-sm mt-1">{modalMode === "edit" ? "Update account details" : "Create a new account entry"}</p>
              </div>
              <button onClick={closeModal} className="p-2 text-white hover:bg-white/20 rounded-xl transition-all duration-200 hover:rotate-90">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-l-4 border-purple-500">
                <div className="flex items-start gap-3">
                  <Sparkles size={20} className="text-purple-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Quick Setup</h4>
                    <p className="text-sm text-gray-600">Fill the basic fields – the rest can be edited later.</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <FormInput label="Account Name" icon={User} name="accountName" value={formData.accountName} onChange={handleChange} required placeholder="e.g. Petty Cash" error={errors.accountName} hint="Enter the name of the account" />
                <FormInput label="Opening Balance" icon={DollarSign} name="openingBalance" type="number" step="0.01" value={formData.openingBalance} onChange={handleChange} placeholder="0.00" hint="Initial balance (optional)" />
                <FormInput label="Current Balance" icon={DollarSign} name="currentBalance" type="number" step="0.01" value={formData.currentBalance} onChange={handleChange} placeholder="0.00" hint="Current balance (optional)" />
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <FileText size={16} className="inline mr-2 text-purple-500" /> Account Type <span className="text-red-500">*</span>
                  </label>
                  <select name="accountType" value={formData.accountType} onChange={handleChange} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all duration-200 border-gray-300 hover:border-gray-400">
                    <option value="">Select account type</option>
                    {["asset", "liability", "equity", "income", "expense"].map((type) => (
                      <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                    ))}
                  </select>
                  {errors.accountType && (
                    <p className="mt-1 text-sm text-red-600 flex items-center animate-shake"><AlertCircle size={12} className="mr-1" /> {errors.accountType}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Banknote size={16} className="inline mr-2 text-purple-500" /> Account Category
                  </label>
                  <select name="accountCategory" value={formData.accountCategory || "other"} onChange={handleChange} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all duration-200 border-gray-300 hover:border-gray-400">
                    <option value="bank">Bank</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <AlertCircle size={16} className="inline mr-2 text-purple-500" /> Status
                  </label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all duration-200 border-gray-300 hover:border-gray-400">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button onClick={closeModal} disabled={isSubmitting} className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-all duration-200 font-semibold disabled:opacity-50 hover:scale-105">Cancel</button>
              <button onClick={handleSubmit} disabled={isSubmitting} className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-semibold disabled:opacity-50 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 min-w-[160px]">
                {isSubmitting ? (<><Loader2 size={18} className="mr-2 animate-spin" /> Saving...</>) : (<><Save size={18} className="mr-2" /> {modalMode === "edit" ? "Update Account" : "Save Account"}</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          Transaction / Ledger Modal (Tasks 2-7, 10)
          ═══════════════════════════════════════════════════════════ */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black/30 modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-[92%] max-w-7xl overflow-hidden transform scale-100 opacity-100 transition-all duration-300 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 via-green-500 to-blue-600 shrink-0">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Receipt size={28} /> Ledger History
                </h3>
                <p className="text-green-100 text-sm mt-1">
                  {viewingAccount ? (
                    <>
                      <span className="font-semibold">{viewingAccount.name}</span>{" – "}
                      <span className="capitalize">{activeTab === "customers" ? "Customer (AR)" : activeTab === "vendors" ? "Vendor (AP)" : viewingAccount.type}</span>
                    </>
                  ) : "View all transactions for this account"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Task 8 — Export Ledger button inside modal */}
                <button
                  onClick={handleExportLedger}
                  disabled={filteredTransactions.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all text-sm font-medium disabled:opacity-50"
                >
                  <Download size={16} /> Export Ledger
                </button>
                <button
                  onClick={() => { setShowTransactionModal(false); setViewingAccount(null); setAccountTransactions([]); setTransactionDateFilter("all"); setCustomStartDate(""); setCustomEndDate(""); resetLedgerFilters(); }}
                  className="p-2 text-white hover:bg-white/20 rounded-xl transition-all duration-200 hover:rotate-90"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Date Filter Section */}
              <div className="mb-5 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-gray-600" />
                    <span className="font-semibold text-gray-700">Period:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "all", label: "All Time" },
                      { value: "day", label: "Today" },
                      { value: "month", label: "This Month" },
                      { value: "year", label: "This Year" },
                      { value: "custom", label: "Custom Range" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setTransactionDateFilter(option.value);
                          if (option.value !== "custom" && viewingAccount) handleViewTransactions(viewingAccount, option.value);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${transactionDateFilter === option.value ? "bg-green-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {transactionDateFilter === "custom" && (
                    <div className="flex items-center gap-2 ml-auto">
                      <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500" />
                      <span className="text-gray-400">to</span>
                      <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500" />
                      <button onClick={() => { if (viewingAccount) handleViewTransactions(viewingAccount, "custom"); }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all">Apply</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Task 7 — Advanced Ledger Filters */}
              <div className="mb-5 p-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Filter size={16} className="text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">Filters</span>
                  <button onClick={resetLedgerFilters} className="ml-auto text-xs text-purple-600 hover:text-purple-800 font-medium">Reset All</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Transaction Type</label>
                    <select value={ledgerTypeFilter} onChange={(e) => setLedgerTypeFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500">
                      {TRANSACTION_TYPE_FILTER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Voucher No</label>
                    <input type="text" placeholder="e.g. RV-001" value={ledgerVoucherNoFilter} onChange={(e) => setLedgerVoucherNoFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Invoice No</label>
                    <input type="text" placeholder="e.g. INV-001" value={ledgerInvoiceNoFilter} onChange={(e) => setLedgerInvoiceNoFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Amount Min</label>
                    <input type="number" placeholder="0" value={ledgerAmountMin} onChange={(e) => setLedgerAmountMin(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Amount Max</label>
                    <input type="number" placeholder="999999" value={ledgerAmountMax} onChange={(e) => setLedgerAmountMax(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Party</label>
                    <input type="text" placeholder="Name..." value={ledgerPartyFilter} onChange={(e) => setLedgerPartyFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
                  </div>
                </div>
              </div>

              {/* Transaction Summary Cards (ERP Metrics) — unified balance from ledger */}
              {viewingAccount && (transactionSummary.isCustomer || transactionSummary.isVendor) && (
                <div className="mb-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <p className="text-xs text-blue-600 font-medium">Opening Balance</p>
                    <p className="text-lg font-bold text-blue-800">{formatCurrency(transactionSummary.openingBalance)}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <p className="text-xs text-green-600 font-medium">
                      {transactionSummary.isCustomer ? "Total Sales" : "Total Purchases"}
                    </p>
                    <p className="text-lg font-bold text-green-800">
                      {formatCurrency(transactionSummary.isCustomer ? transactionSummary.totalSales : transactionSummary.totalPurchases)}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <p className="text-xs text-red-600 font-medium">
                      {transactionSummary.isCustomer ? "Total Payments Received" : "Total Payments Made"}
                    </p>
                    <p className="text-lg font-bold text-red-800">{formatCurrency(transactionSummary.totalPayments)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <p className="text-xs text-purple-600 font-medium">
                      {transactionSummary.isCustomer ? "Outstanding Receivable" : "Outstanding Payable"}
                    </p>
                    <p className="text-lg font-bold text-purple-800">
                      {formatCurrency(transactionSummary.isCustomer ? transactionSummary.outstandingReceivable : transactionSummary.outstandingPayable)}
                    </p>
                  </div>
                </div>
              )}
              {/* Generic accounts / expenses: basic debit/credit summary */}
              {viewingAccount && !transactionSummary.isCustomer && !transactionSummary.isVendor && (
                <div className="mb-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <p className="text-xs text-blue-600 font-medium">Opening Balance</p>
                    <p className="text-lg font-bold text-blue-800">{formatCurrency(transactionSummary.openingBalance)}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <p className="text-xs text-green-600 font-medium">Total Debit</p>
                    <p className="text-lg font-bold text-green-800">{formatCurrency(transactionSummary.totalDebit)}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <p className="text-xs text-red-600 font-medium">Total Credit</p>
                    <p className="text-lg font-bold text-red-800">{formatCurrency(transactionSummary.totalCredit)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <p className="text-xs text-purple-600 font-medium">Closing Balance</p>
                    <p className="text-lg font-bold text-purple-800">{formatCurrency(transactionSummary.closingBalance)}</p>
                  </div>
                </div>
              )}

              {/* Transaction Table */}
              {transactionLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 size={32} className="text-green-600 animate-spin" />
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt size={48} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No transactions found</p>
                  <p className="text-gray-400 text-sm mt-2">
                    {transactionDateFilter !== "all" || ledgerTypeFilter !== "all" || ledgerVoucherNoFilter || ledgerPartyFilter
                      ? "Try adjusting the filters"
                      : "Transactions will appear here when vouchers are created"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Voucher / Invoice No</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Reference / Party</th>
                        {viewingAccount?.isExpenseAccount && (
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Remarks</th>
                        )}
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Debit (Dr)</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Credit (Cr)</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Opening Balance Row */}
                      {viewingAccount && (
                        <tr className="bg-blue-50 border-t border-gray-200">
                          <td className="px-4 py-3 text-gray-700 font-medium">-</td>
                          <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Opening Balance</span></td>
                          <td className="px-4 py-3 text-gray-400">-</td>
                          <td className="px-4 py-3 text-gray-400">-</td>
                          {viewingAccount?.isExpenseAccount && <td className="px-4 py-3 text-gray-400">-</td>}
                          <td className="px-4 py-3 text-right text-gray-400">-</td>
                          <td className="px-4 py-3 text-right text-gray-400">-</td>
                          <td className="px-4 py-3 text-right font-bold text-blue-700">{formatCurrency(transactionSummary.openingBalance)}</td>
                        </tr>
                      )}

                      {filteredTransactions.map((transaction, idx) => (
                        <tr key={idx} className={`border-t border-gray-200 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                          <td className="px-4 py-3 text-gray-900">{transaction.date ? new Date(transaction.date).toLocaleDateString("en-GB") : "-"}</td>
                          <td className="px-4 py-3">
                            {/* Task 2 — show business document name */}
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${txBadgeClass(transaction.type || transaction.voucherType)}`}>
                              {resolveTransactionLabel(transaction.type || transaction.voucherType)}
                            </span>
                          </td>
                          {/* Task 6 — never display ObjectIds */}
                          <td className="px-4 py-3 text-gray-900 font-medium">
                            <span className="font-mono text-sm">{transaction.voucherNo || "-"}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <div className="flex flex-col">
                              <span>{transaction.referenceNo || "-"}</span>
                              {transaction.partyName && transaction.partyName !== transaction.referenceNo && (
                                <span className="text-xs text-gray-400">{transaction.partyName}</span>
                              )}
                            </div>
                          </td>
                          {viewingAccount?.isExpenseAccount && (
                            <td className="px-4 py-3 text-gray-600">
                              {transaction.remarks || transaction.expenseTypeName ? (
                                <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                                  {transaction.remarks || `Expense: ${transaction.expenseTypeName}`}
                                </span>
                              ) : <span className="text-gray-400">-</span>}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right">
                            {transaction.debitAmount ? (
                              <span className="text-green-600 font-semibold">
                                {Number(transaction.debitAmount).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : <span className="text-gray-400">-</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {transaction.creditAmount ? (
                              <span className="text-red-600 font-semibold">
                                {Number(transaction.creditAmount).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : <span className="text-gray-400">-</span>}
                          </td>
                          {/* Task 5 — balance from backend */}
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            {Number(transaction.runningBalance).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}

                      {/* Closing Balance Row */}
                      {viewingAccount && filteredTransactions.length > 0 && (
                        <tr className="bg-purple-50 border-t-2 border-purple-300">
                          <td className="px-4 py-3 text-gray-700 font-medium">-</td>
                          <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">Closing Balance</span></td>
                          <td className="px-4 py-3 text-gray-400">-</td>
                          <td className="px-4 py-3 text-gray-400">-</td>
                          {viewingAccount?.isExpenseAccount && <td className="px-4 py-3 text-gray-400">-</td>}
                          <td className="px-4 py-3 text-right font-bold text-green-700">{formatCurrency(transactionSummary.totalDebit)}</td>
                          <td className="px-4 py-3 text-right font-bold text-red-700">{formatCurrency(transactionSummary.totalCredit)}</td>
                          <td className="px-4 py-3 text-right font-bold text-purple-700">{formatCurrency(transactionSummary.closingBalance)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 bg-gray-50 shrink-0">
              <button
                onClick={() => { setShowTransactionModal(false); setViewingAccount(null); setAccountTransactions([]); resetLedgerFilters(); }}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-all duration-200 font-semibold hover:scale-105"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartOfAccountsManagement;
