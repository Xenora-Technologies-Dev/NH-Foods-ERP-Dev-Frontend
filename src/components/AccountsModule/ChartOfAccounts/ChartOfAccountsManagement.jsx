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
} from "lucide-react";
import Select from "react-select";
import axiosInstance from "../../../axios/axios";

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

const StatCard = ({
  title,
  count,
  icon,
  bgColor,
  textColor,
  borderColor,
  iconBg,
  iconColor,
  subText,
}) => (
  <div
    className={`${bgColor} ${borderColor} rounded-2xl p-6 border-2 transition-all duration-300 hover:shadow-xl cursor-pointer hover:scale-105 hover:-translate-y-1`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 ${iconBg} rounded-xl shadow-md`}>
        <div className={iconColor}>{icon}</div>
      </div>
      <button
        className={`text-xs ${textColor} hover:opacity-80 transition-opacity font-semibold`}
      >
        View Details →
      </button>
    </div>
    <h3
      className={`text-sm font-semibold ${textColor} mb-2 uppercase tracking-wide`}
    >
      {title}
    </h3>
    <p className="text-3xl font-bold text-gray-900 mb-1">{count}</p>
    <p className="text-xs text-gray-600 font-medium">{subText}</p>
  </div>
);

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

const formatCurrency = (amount, colorClass = "text-gray-900") => {
  const num = Number(amount) || 0;
  const abs = Math.abs(num).toFixed(2);
  const neg = num < 0;
  return (
    <span className={`inline-flex items-center font-semibold ${colorClass}`}>
      {neg && <span className="text-red-600">-</span>}
      <span className="text-xs mr-1 opacity-70">AED</span>
      {abs.toLocaleString()}
    </span>
  );
};

const badgeClassForStatus = (status) => {
  const map = {
    Active:
      "bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border border-emerald-300",
    Inactive:
      "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300",
    Compliant:
      "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300",
    "Non-compliant":
      "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300",
    Pending:
      "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300",
    Expired:
      "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300",
  };
  return map[status] || "bg-gray-100 text-gray-800";
};

const ChartOfAccountsManagement = () => {
  const [chartOfAccounts, setChartOfAccounts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [accountTransactions, setAccountTransactions] = useState([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [viewingAccount, setViewingAccount] = useState(null); // Track which account's transactions are being viewed
  // Date filter states for transaction modal
  const [transactionDateFilter, setTransactionDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
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
  const [isLoading, setIsLoading] = useState(true);
  const [showToast, setShowToast] = useState({
    visible: false,
    message: "",
    type: "success",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const modalRef = useRef(null);

  const showToastMessage = useCallback((message, type = "success") => {
    setShowToast({ visible: true, message, type });
    setTimeout(
      () => setShowToast((prev) => ({ ...prev, visible: false })),
      3000
    );
  }, []);

  const fetchChartOfAccounts = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/account-v2/Transactor");
      const data = takeArray(res);
      setChartOfAccounts(
        data.map((t) => ({
          _id: t._id,
          id: t.accountCode,
          name: t.accountName,
          type: t.type || "ChartOfAccounts",
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
      // Use ledger API to get accurate calculated balances
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
        }))
      );
    } catch (err) {
      showToastMessage("Failed to fetch vendors.", "error");
      setVendors([]);
    }
  }, [showToastMessage]);

  const fetchCustomers = useCallback(async () => {
    try {
      // Use ledger API to get accurate calculated balances
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
        }))
      );
    } catch (err) {
      showToastMessage("Failed to fetch customers.", "error");
      setCustomers([]);
    }
  }, [showToastMessage]);

  const fetchExpenseAccounts = useCallback(async () => {
    try {
      // Fetch expense accounts from the new COA endpoint
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

  const openAddModal = useCallback(() => {
    setModalMode("add");
    setFormData({
      accountName: "",
      openingBalance: "0.00",
      currentBalance: "0.00",
      accountType: "",
      transactorCategory: "other",
      status: "Active",
    });
    setShowModal(true);
    setTimeout(() => {
      if (modalRef.current) {
        modalRef.current.classList.add("scale-100", "opacity-100");
      }
    }, 10);
  }, []);

  const openEditModal = useCallback((account) => {
    setModalMode("edit");
    setSelectedAccount(account);
    setFormData({
      accountName: account.name,
      openingBalance: account.openingBalance.toFixed(2),
      currentBalance: account.currentBalance.toFixed(2),
      accountType: account.accountType,
      accountCategory: account.accountCategory || "other",
      status: account.status,
    });
    setShowModal(true);
    setTimeout(() => {
      if (modalRef.current) {
        modalRef.current.classList.add("scale-100", "opacity-100");
      }
    }, 10);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setModalMode("add");
    setSelectedAccount(null);
    setFormData({
      accountName: "",
      openingBalance: "0.00",
      currentBalance: "0.00",
      accountType: "",
      accountCategory: "other",
      status: "Active",
    });
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
        await axiosInstance.put(
          `/account-v2/Transactor/${selectedAccount._id}`,
          payload
        );
        showToastMessage("Chart of account updated!", "success");
      } else {
        await axiosInstance.post("/account-v2/Transactor", payload);
        showToastMessage("Chart of account created!", "success");
      }
      closeModal();
      await fetchChartOfAccounts();
    } catch (er) {
      showToastMessage(
        er.response?.data?.message ||
          `Failed to ${modalMode === "edit" ? "update" : "create"} chart of account`,
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    formData,
    validateForm,
    showToastMessage,
    closeModal,
    modalMode,
    selectedAccount,
    fetchChartOfAccounts,
  ]);

  const handleDelete = useCallback(
    async (accountId) => {
      if (!window.confirm("Are you sure you want to delete this account?"))
        return;
      setIsSubmitting(true);
      try {
        await axiosInstance.delete(`/account-v2/Transactor/${accountId}`);
        showToastMessage("Chart of account deleted!", "success");
        await fetchChartOfAccounts();
      } catch (er) {
        showToastMessage(
          er.response?.data?.message || "Failed to delete account",
          "error"
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [showToastMessage, fetchChartOfAccounts]
  );

  const handleViewTransactions = useCallback(async (item, filterType = null) => {
    setTransactionLoading(true);
    setViewingAccount(item);
    try {
      let transactions = [];
      
      // Helper function to filter transactions by date
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
        
        return txns.filter(t => {
          const txDate = new Date(t.date);
          if (startDate && txDate < startDate) return false;
          if (endDate && txDate > endDate) return false;
          return true;
        });
      };
      
      if (item.isExpenseAccount) {
        // Fetch from expense accounts API for COA
        const params = new URLSearchParams();
        if (filterType && filterType !== "all") {
          params.append("filterType", filterType);
        }
        if (filterType === "custom" && customStartDate) {
          params.append("startDate", customStartDate);
        }
        if (filterType === "custom" && customEndDate) {
          params.append("endDate", customEndDate);
        }
        
        const res = await axiosInstance.get(
          `/expense-accounts/coa/${item._id}/transactions?${params.toString()}`
        );
        const data = res.data?.data || {};
        transactions = data.transactions || [];
      } else if (item.isChartOfAccounts) {
        // Fetch from transactor transaction log for Chart of Accounts
        const res = await axiosInstance.get(
          `/account-v2/transactor/${item._id}/transactions?limit=100`
        );
        const rawTransactions = res.data?.data?.transactions || [];
        
        // Filter by date if filterType is provided
        const filteredRaw = filterByDate(rawTransactions, filterType);
        
        // Calculate running balance from opening balance
        let runningBalance = item.openingBalance || 0;
        transactions = filteredRaw
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .map((t) => {
            // For Cash/Bank accounts (transactors), the log already contains:
            // - Debit = Money IN (increases the account balance)
            // - Credit = Money OUT (decreases the account balance)
            // Running balance calculation is simple: Opening + Debits - Credits
            runningBalance += (t.debitAmount || 0) - (t.creditAmount || 0);
            
            return {
              date: t.date,
              voucherType: t.voucherType || "journal",
              voucherNo: t.voucherNo || "-",
              referenceNo: t.referenceNo || t.partyName || "-",
              referenceType: t.referenceType || "other",
              debitAmount: t.debitAmount || 0,
              creditAmount: t.creditAmount || 0,
              runningBalance: runningBalance,
              partyName: t.partyName,
              description: t.description,
            };
          });
      } else if (item.partyType === "Vendor") {
        // Fetch from ledger API for Vendors
        const res = await axiosInstance.get(`/ledger/ledger/vendor/${item._id}`);
        const ledgerData = res.data?.data?.ledger || [];
        
        // Filter by date if filterType is provided
        const filteredLedger = filterByDate(ledgerData, filterType);
        
        // Transform vendor ledger data
        // For Vendors (Accounts Payable - Liability):
        // - Purchase Order = Credit (we owe them more) - increases payable
        // - Purchase Return = Debit (they owe us back) - decreases payable
        // - Payment = Debit (we paid them) - decreases payable
        let runningBalance = item.openingBalance || 0;
        transactions = filteredLedger.map((log) => {
          let debitAmount = 0;
          let creditAmount = 0;
          
          if (log.type === "PURCHASE ORDER") {
            creditAmount = Math.abs(log.amount);
            runningBalance += creditAmount; // Payable increases
          } else if (log.type === "PURCHASE RETURN") {
            debitAmount = Math.abs(log.amount);
            runningBalance -= debitAmount; // Payable decreases
          } else if (log.type === "PAYMENT RECEIVED") {
            debitAmount = Math.abs(log.paid || log.amount);
            runningBalance -= debitAmount; // Payable decreases
          }
          
          return {
            date: log.date,
            voucherType: log.type?.toLowerCase().replace(/ /g, "_") || "transaction",
            voucherNo: log.invNo || "-",
            referenceNo: log.ref || "-",
            referenceType: log.type?.includes("PAYMENT") ? "payment" : "invoice",
            debitAmount,
            creditAmount,
            runningBalance,
            status: log.status,
          };
        });
      } else if (item.partyType === "Customer") {
        // Fetch from ledger API for Customers
        const res = await axiosInstance.get(`/ledger/ledger/customer/${item._id}`);
        const ledgerData = res.data?.data?.ledger || [];
        
        // Filter by date if filterType is provided
        const filteredLedger = filterByDate(ledgerData, filterType);
        
        // Transform customer ledger data
        // For Customers (Accounts Receivable - Asset):
        // - Sales Order = Debit (they owe us) - increases receivable
        // - Sales Return = Credit (we owe them back) - decreases receivable  
        // - Payment Made = Credit (they paid us) - decreases receivable
        let runningBalance = item.openingBalance || 0;
        transactions = filteredLedger.map((log) => {
          let debitAmount = 0;
          let creditAmount = 0;
          
          if (log.type === "SALES ORDER") {
            debitAmount = Math.abs(log.amount);
            runningBalance += debitAmount; // Receivable increases
          } else if (log.type === "SALES RETURN") {
            creditAmount = Math.abs(log.amount);
            runningBalance -= creditAmount; // Receivable decreases
          } else if (log.type === "PAYMENT MADE") {
            creditAmount = Math.abs(log.paid || log.amount);
            runningBalance -= creditAmount; // Receivable decreases
          }
          
          return {
            date: log.date,
            voucherType: log.type?.toLowerCase().replace(/ /g, "_") || "transaction",
            voucherNo: log.invNo || "-",
            referenceNo: log.ref || "-",
            referenceType: log.type?.includes("PAYMENT") ? "receipt" : "invoice",
            debitAmount,
            creditAmount,
            runningBalance,
            status: log.status,
          };
        });
      }
      
      setAccountTransactions(transactions);
      setShowTransactionModal(true);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      showToastMessage("Failed to fetch transactions", "error");
    } finally {
      setTransactionLoading(false);
    }
  }, [showToastMessage, customStartDate, customEndDate]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    Promise.all([fetchChartOfAccounts(), fetchVendors(), fetchCustomers(), fetchExpenseAccounts()]).finally(
      () => {
        setIsRefreshing(false);
        showToastMessage("Data refreshed", "success");
      }
    );
  }, [fetchChartOfAccounts, fetchVendors, fetchCustomers, fetchExpenseAccounts, showToastMessage]);

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const combinedList = useMemo(() => {
    return [...chartOfAccounts, ...vendors, ...customers, ...expenseAccounts];
  }, [chartOfAccounts, vendors, customers, expenseAccounts]);

  const filteredList = useMemo(() => {
    let list = combinedList;
    if (selectedType) {
      list = list.filter((t) => t.type === selectedType.value);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          t.name?.toLowerCase().includes(term) ||
          t.id?.toLowerCase().includes(term)
      );
    }
    if (sortConfig.key) {
      list = [...list].sort((a, b) => {
        const aVal =
          sortConfig.key === "openingBalance" ||
          sortConfig.key === "currentBalance"
            ? Number(a[sortConfig.key])
            : a[sortConfig.key]?.toString().toLowerCase();
        const bVal =
          sortConfig.key === "openingBalance" ||
          sortConfig.key === "currentBalance"
            ? Number(b[sortConfig.key])
            : b[sortConfig.key]?.toString().toLowerCase();
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [combinedList, selectedType, searchTerm, sortConfig]);

  const stats = useMemo(() => {
    const total = filteredList.length;
    const active = filteredList.filter(
      (t) =>
        t.status === "Active" ||
        t.status === "Compliant" ||
        t.status === "Pending"
    ).length;
    const totalBalance = filteredList.reduce(
      (sum, t) => sum + Number(t.currentBalance),
      0
    );
    return { total, active, totalBalance };
  }, [filteredList]);

  const typeOptions = [
    { value: "", label: "All Types" },
    { value: "ChartOfAccounts", label: "Chart Of Accounts" },
    { value: "Vendor", label: "Vendor" },
    { value: "Customer", label: "Customer" },
    { value: "Expense", label: "Expense" },
    ...[...new Set(chartOfAccounts.map((t) => t.type))]
      .filter((type) => type !== "ChartOfAccounts")
      .map((type) => ({
        value: type,
        label: type.charAt(0).toUpperCase() + type.slice(1),
      })),
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2
            size={48}
            className="text-purple-600 animate-spin mx-auto mb-4"
          />
          <p className="text-gray-600 text-lg font-medium">Loading data...</p>
        </div>
      </div>
    );
  }

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <Users size={40} className="text-purple-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No records found
      </h3>
      <p className="text-gray-600 text-center max-w-md">
        {searchTerm
          ? "No results match your search."
          : "Try adjusting filters or add a new account."}
      </p>
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

      <Toast
        show={showToast.visible}
        message={showToast.message}
        type={showToast.type}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button className="p-3 rounded-xl bg-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Accounts
            </h1>
            <p className="text-gray-600 mt-1 font-medium">
              {stats.total} total accounts
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <button
            onClick={openAddModal}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold"
          >
            <Plus size={18} /> Add Chart Of Accounts
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-3 rounded-xl bg-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 hover:scale-105"
            title="Refresh"
          >
            <RefreshCw
              size={18}
              className={`text-gray-600 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`p-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 ${
              showFilters
                ? "bg-purple-100 text-purple-600 ring-2 ring-purple-300"
                : "bg-white text-gray-600"
            }`}
            title="Filters"
          >
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total"
            count={stats.total}
            icon={<Users size={24} />}
            bgColor="bg-emerald-50"
            textColor="text-emerald-700"
            borderColor="border-emerald-200"
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
            subText="All accounts"
          />
          <StatCard
            title="Active"
            count={stats.active}
            icon={<CheckCircle size={24} />}
            bgColor="bg-purple-50"
            textColor="text-purple-700"
            borderColor="border-purple-200"
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
            subText="Active or compliant"
          />
          <StatCard
            title="Outstanding"
            count={formatCurrency(stats.totalBalance, "text-blue-700")}
            icon={<DollarSign size={24} />}
            bgColor="bg-blue-50"
            textColor="text-blue-700"
            borderColor="border-blue-200"
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            subText="Total balance"
          />
          <StatCard
            title="Types"
            count={new Set(combinedList.map((t) => t.type)).size}
            icon={<Package size={24} />}
            bgColor="bg-red-50"
            textColor="text-red-700"
            borderColor="border-red-200"
            iconBg="bg-red-100"
            iconColor="text-red-600"
            subText="Distinct categories"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Accounts Ledger
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Manage chart of accounts, vendors, and customers
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all hover:border-gray-300"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {showFilters && (
              <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                <div className="w-full">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Filter size={16} className="inline mr-2" /> Type
                  </label>
                  <Select
                    value={selectedType}
                    onChange={setSelectedType}
                    options={typeOptions}
                    isSearchable
                    placeholder="All types"
                    classNamePrefix="react-select"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        {filteredList.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  {[
                    { key: "id", label: "ID" },
                    { key: "name", label: "Name" },
                    { key: "type", label: "Type" },
                    { key: "openingBalance", label: "Opening Balance" },
                    { key: "currentBalance", label: "Current Balance" },
                    { key: "accountType", label: "Account Type" },
                    { key: "accountCategory", label: "Category" },
                    { key: "status", label: "Status" },
                    { key: "actions", label: "Actions" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={
                        col.key !== "actions" ? () => handleSort(col.key) : null
                      }
                      className={`px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                        col.key !== "actions"
                          ? "cursor-pointer hover:bg-gray-100"
                          : ""
                      } transition-colors`}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{col.label}</span>
                        {sortConfig.key === col.key &&
                          col.key !== "actions" && (
                            <span className="text-purple-600 font-bold">
                              {sortConfig.direction === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredList.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all duration-200"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {item.id}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          item.type === "ChartOfAccounts"
                            ? "bg-gray-100 text-gray-800"
                            : item.type === "Customer"
                            ? "bg-blue-100 text-blue-800"
                            : item.type === "Expense"
                            ? "bg-red-100 text-red-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(item.openingBalance)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(item.currentBalance)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.accountType}
                    </td>
                    <td className="px-6 py-4">
                      {item.isChartOfAccounts ? (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            item.accountCategory === "bank"
                              ? "bg-blue-100 text-blue-800"
                              : item.accountCategory === "cash"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {(item.accountCategory || "other").charAt(0).toUpperCase() +
                            (item.accountCategory || "other").slice(1)}
                        </span>
                      ) : item.isExpenseAccount ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          Expense
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeClassForStatus(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex space-x-2">
                        {/* View Transactions - Available for all account types */}
                        <button
                          onClick={() => handleViewTransactions(item)}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-all duration-200 hover:scale-110"
                          title="View Transactions"
                        >
                          <Eye size={16} />
                        </button>
                        {/* Edit and Delete - Only for Chart of Accounts (not Expense Accounts from Expense section) */}
                        {item.isChartOfAccounts && !item.isExpenseAccount && (
                          <>
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-all duration-200 hover:scale-110"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(item._id)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-all duration-200 hover:scale-110"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                        {/* Expense accounts show info that edit is not allowed */}
                        {item.isExpenseAccount && (
                          <span className="text-xs text-gray-400 italic self-center ml-2" title="Edit from Expense Accounts section">
                            (Manage in Expense)
                          </span>
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

      {showModal && (
        <div className="fixed inset-0 bg-black/30 modal-backdrop flex items-center justify-center p-4 z-50">
          <div
            ref={modalRef}
            className="bg-white rounded-3xl shadow-2xl w-1/2 overflow-hidden transform scale-95 opacity-0 transition-all duration-300"
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 sticky top-0 z-10">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Users size={28} />
                  {modalMode === "edit"
                    ? "Edit Chart Of Accounts"
                    : "Add New Chart Of Accounts"}
                </h3>
                <p className="text-purple-100 text-sm mt-1">
                  {modalMode === "edit"
                    ? "Update chart of accounts details"
                    : "Create a new chart of accounts entry"}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-white hover:bg-white/20 rounded-xl transition-all duration-200 hover:rotate-90"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-l-4 border-purple-500">
                <div className="flex items-start gap-3">
                  <Sparkles size={20} className="text-purple-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      Quick Setup
                    </h4>
                    <p className="text-sm text-gray-600">
                      Fill the basic fields – the rest can be edited later.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <FormInput
                  label="Name"
                  icon={User}
                  name="accountName"
                  value={formData.accountName}
                  onChange={handleChange}
                  required
                  placeholder="e.g. ABC Corp"
                  error={errors.accountName}
                  hint="Enter the name of the account"
                />
                <FormInput
                  label="Opening Balance"
                  icon={DollarSign}
                  name="openingBalance"
                  type="number"
                  step="0.01"
                  value={formData.openingBalance}
                  onChange={handleChange}
                  placeholder="0.00"
                  hint="Initial balance (optional)"
                />
                <FormInput
                  label="Current Balance"
                  icon={DollarSign}
                  name="currentBalance"
                  type="number"
                  step="0.01"
                  value={formData.currentBalance}
                  onChange={handleChange}
                  placeholder="0.00"
                  hint="Current balance (optional)"
                />
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors group-focus-within:text-purple-600">
                    <FileText
                      size={16}
                      className="inline mr-2 text-purple-500"
                    />{" "}
                    Account Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="accountType"
                    value={formData.accountType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all duration-200 border-gray-300 hover:border-gray-400"
                  >
                    <option value="">Select account type</option>
                    {["asset", "liability", "equity", "income", "expense"].map(
                      (type) => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      )
                    )}
                  </select>
                  {errors.accountType && (
                    <p className="mt-1 text-sm text-red-600 flex items-center animate-shake">
                      <AlertCircle size={12} className="mr-1" />{" "}
                      {errors.accountType}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 flex items-center">
                    <Sparkles size={10} className="mr-1" /> Classify the account
                    type
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors group-focus-within:text-purple-600">
                    <Banknote
                      size={16}
                      className="inline mr-2 text-purple-500"
                    />{" "}
                    Account Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="accountCategory"
                    value={formData.accountCategory || "other"}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all duration-200 border-gray-300 hover:border-gray-400"
                  >
                    <option value="bank">Bank</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500 flex items-center">
                    <Sparkles size={10} className="mr-1" /> Specify the type of
                    account
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors group-focus-within:text-purple-600">
                    <AlertCircle
                      size={16}
                      className="inline mr-2 text-purple-500"
                    />{" "}
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="isActive"
                    value={formData.isActive ? "Active" : "Inactive"}
                    onChange={(e) =>
                      handleChange({
                        target: {
                          name: "isActive",
                          value: e.target.value === "Active",
                        },
                      })
                    }
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all duration-200 border-gray-300 hover:border-gray-400"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500 flex items-center">
                    <Sparkles size={10} className="mr-1" /> Set initial status
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-all duration-200 font-semibold disabled:opacity-50 hover:scale-105"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-semibold disabled:opacity-50 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 min-w-[160px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />{" "}
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} className="mr-2" />{" "}
                    {modalMode === "edit"
                      ? "Update Chart Of Accounts"
                      : "Save Chart Of Accounts"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTransactionModal && (
        <div className="fixed inset-0 bg-black/30 modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-4/5 overflow-hidden transform scale-95 opacity-0 transition-all duration-300 scale-100 opacity-100 max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 via-green-500 to-blue-600 sticky top-0 z-10">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Receipt size={28} />
                  Transaction History
                </h3>
                <p className="text-green-100 text-sm mt-1">
                  {viewingAccount ? (
                    <>
                      <span className="font-semibold">{viewingAccount.name}</span>
                      {" - "}
                      <span className="capitalize">{viewingAccount.type}</span>
                      {viewingAccount.isExpenseAccount && (
                        <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-xs">
                          Expense Account
                        </span>
                      )}
                    </>
                  ) : (
                    "View all transactions for this account"
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTransactionModal(false);
                  setViewingAccount(null);
                  setAccountTransactions([]);
                  setTransactionDateFilter("all");
                  setCustomStartDate("");
                  setCustomEndDate("");
                }}
                className="p-2 text-white hover:bg-white/20 rounded-xl transition-all duration-200 hover:rotate-90"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Date Filter Section */}
              <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-gray-600" />
                    <span className="font-semibold text-gray-700">Filter by:</span>
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
                          if (option.value !== "custom" && viewingAccount) {
                            handleViewTransactions(viewingAccount, option.value);
                          }
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          transactionDateFilter === option.value
                            ? "bg-green-600 text-white shadow-md"
                            : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {transactionDateFilter === "custom" && (
                    <div className="flex items-center gap-2 ml-auto">
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                        placeholder="Start Date"
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                        placeholder="End Date"
                      />
                      <button
                        onClick={() => {
                          if (viewingAccount) {
                            handleViewTransactions(viewingAccount, "custom");
                          }
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Summary Card */}
              {viewingAccount && (
                <div className="mb-6 grid grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <p className="text-sm text-blue-600 font-medium">Opening Balance</p>
                    <p className="text-xl font-bold text-blue-800">
                      {formatCurrency(viewingAccount.openingBalance || 0)}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <p className="text-sm text-green-600 font-medium">Total Debit (In)</p>
                    <p className="text-xl font-bold text-green-800">
                      {formatCurrency(
                        accountTransactions.reduce((sum, t) => sum + (Number(t.debitAmount) || 0), 0)
                      )}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <p className="text-sm text-red-600 font-medium">Total Credit (Out)</p>
                    <p className="text-xl font-bold text-red-800">
                      {formatCurrency(
                        accountTransactions.reduce((sum, t) => sum + (Number(t.creditAmount) || 0), 0)
                      )}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <p className="text-sm text-purple-600 font-medium">Closing Balance</p>
                    <p className="text-xl font-bold text-purple-800">
                      {formatCurrency(
                        accountTransactions.length > 0 
                          ? accountTransactions[accountTransactions.length - 1].runningBalance 
                          : (viewingAccount.openingBalance || 0)
                      )}
                    </p>
                  </div>
                </div>
              )}
              
              {transactionLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 size={32} className="text-green-600 animate-spin" />
                </div>
              ) : accountTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt size={48} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">
                    No transactions found for this account
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    {transactionDateFilter !== "all" 
                      ? "Try adjusting the date filter or select 'All Time'"
                      : "Transactions will appear here when vouchers are created"
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Voucher/Invoice No
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Reference/Party
                        </th>
                        {/* Remarks column - only for Expense accounts */}
                        {viewingAccount?.isExpenseAccount && (
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">
                            Remarks
                          </th>
                        )}
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">
                          Debit (Dr)
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">
                          Credit (Cr)
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">
                          Running Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Opening Balance Row */}
                      {viewingAccount && (
                        <tr className="bg-blue-50 border-t border-gray-200">
                          <td className="px-4 py-3 text-gray-700 font-medium">-</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                              Opening Balance
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">-</td>
                          <td className="px-4 py-3 text-gray-600">-</td>
                          {viewingAccount?.isExpenseAccount && (
                            <td className="px-4 py-3 text-gray-400">-</td>
                          )}
                          <td className="px-4 py-3 text-right text-gray-400">-</td>
                          <td className="px-4 py-3 text-right text-gray-400">-</td>
                          <td className="px-4 py-3 text-right font-bold text-blue-700">
                            {formatCurrency(viewingAccount.openingBalance || 0)}
                          </td>
                        </tr>
                      )}
                      {accountTransactions.map((transaction, idx) => (
                        <tr
                          key={idx}
                          className={`border-t border-gray-200 hover:bg-gray-50 transition-colors ${
                            idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="px-4 py-3 text-gray-900">
                            {new Date(transaction.date).toLocaleDateString(
                              "en-AE"
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                transaction.voucherType === "receipt"
                                  ? "bg-blue-100 text-blue-800"
                                  : transaction.voucherType === "payment"
                                  ? "bg-orange-100 text-orange-800"
                                  : transaction.voucherType === "journal"
                                  ? "bg-purple-100 text-purple-800"
                                  : transaction.voucherType === "contra"
                                  ? "bg-indigo-100 text-indigo-800"
                                  : transaction.voucherType === "expense"
                                  ? "bg-red-100 text-red-800"
                                  : transaction.voucherType?.includes("purchase")
                                  ? "bg-amber-100 text-amber-800"
                                  : transaction.voucherType?.includes("sales")
                                  ? "bg-emerald-100 text-emerald-800"
                                  : transaction.voucherType?.includes("payment")
                                  ? "bg-cyan-100 text-cyan-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {(transaction.voucherType || "N/A")
                                .replace(/_/g, " ")
                                .split(" ")
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(" ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-900 font-medium">
                            <span className="font-mono text-sm">{transaction.voucherNo}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <div className="flex flex-col">
                              <span>{transaction.referenceNo || "-"}</span>
                              {transaction.partyName && (
                                <span className="text-xs text-gray-400">{transaction.partyName}</span>
                              )}
                            </div>
                          </td>
                          {/* Remarks column - shows which expense type under the account */}
                          {viewingAccount?.isExpenseAccount && (
                            <td className="px-4 py-3 text-gray-600">
                              {transaction.remarks || transaction.expenseTypeName ? (
                                <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                                  {transaction.remarks || `Expense Type: ${transaction.expenseTypeName}`}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right">
                            {transaction.debitAmount ? (
                              <span className="text-green-600 font-semibold">
                                {Number(transaction.debitAmount).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {transaction.creditAmount ? (
                              <span className="text-red-600 font-semibold">
                                {Number(transaction.creditAmount).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            {Number(transaction.runningBalance).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {/* Closing Balance Row */}
                      {viewingAccount && accountTransactions.length > 0 && (
                        <tr className="bg-purple-50 border-t-2 border-purple-300">
                          <td className="px-4 py-3 text-gray-700 font-medium">-</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                              Closing Balance
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">-</td>
                          <td className="px-4 py-3 text-gray-600">-</td>
                          {viewingAccount?.isExpenseAccount && (
                            <td className="px-4 py-3 text-gray-400">-</td>
                          )}
                          <td className="px-4 py-3 text-right font-bold text-green-700">
                            {formatCurrency(
                              accountTransactions.reduce((sum, t) => sum + (Number(t.debitAmount) || 0), 0)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-red-700">
                            {formatCurrency(
                              accountTransactions.reduce((sum, t) => sum + (Number(t.creditAmount) || 0), 0)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-purple-700">
                            {formatCurrency(
                              accountTransactions[accountTransactions.length - 1]?.runningBalance || 0
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowTransactionModal(false)}
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
