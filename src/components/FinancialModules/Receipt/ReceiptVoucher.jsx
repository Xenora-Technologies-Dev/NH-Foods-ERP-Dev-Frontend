import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  Eye,
  X,
  User,
  TrendingUp,
  Calendar,
  CreditCard,
  FileText,
  DollarSign,
  Building,
  Banknote,
  RefreshCw,
  Save,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Receipt,
  AlertTriangle,
  Link2,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
} from "lucide-react";
import axios from "../../../axios/axios";
import InvoiceSelection from "./InvoiceSelection";
import PaymentInvoiceView from "../Payment/PaymentInvoiceView";
import CustomerSelect from "./CustomerSelect";
import VoucherDocument from "./VoucherDocument";
import {
  asArray,
  takeArray,
  formatCurrency,
  by,
  SessionManager,
} from "./utils";

const FormInput = ({ label, icon: Icon, error, ...props }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      <Icon size={16} className="inline mr-2" /> {label} {props.required && "*"}
    </label>
    <input
      {...props}
      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
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

const FormSelect = ({ label, icon: Icon, error, options, ...props }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      <Icon size={16} className="inline mr-2" /> {label} *
    </label>
    <select
      {...props}
      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
        error ? "border-red-300 bg-red-50" : "border-gray-300"
      }`}
    >
      {options.map(({ value, label }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
    {error && (
      <p className="mt-1 text-sm text-red-600 flex items-center">
        <AlertCircle size={12} className="mr-1" /> {error}
      </p>
    )}
  </div>
);

const Toast = ({ show, message, type }) =>
  show && (
    <div
      className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg text-white z-50 ${
        type === "success" ? "bg-emerald-500" : "bg-red-500"
      }`}
    >
      <div className="flex items-center space-x-2">
        {type === "success" ? <CheckCircle size={16} /> : <XCircle size={16} />}
        <span>{message}</span>
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
    className={`${bgColor} ${borderColor} rounded-2xl p-6 border transition-all duration-300 hover:shadow-lg cursor-pointer hover:scale-105`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 ${iconBg} rounded-xl`}>
        <div className={iconColor}>{icon}</div>
      </div>
      <button
        className={`text-xs ${textColor} hover:opacity-80 transition-opacity font-medium`}
      >
        View Details →
      </button>
    </div>
    <h3 className={`text-sm font-medium ${textColor} mb-2`}>{title}</h3>
    <p className="text-3xl font-bold text-gray-900">{count}</p>
    <p className="text-xs text-gray-500 mt-1">{subText}</p>
  </div>
);

const ReceiptVoucherManagement = () => {
  const [receipts, setReceipts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [availableInvoices, setAvailableInvoices] = useState([]);
  const [allChartOfAccounts, setAllChartOfAccounts] = useState([]); // All chart of accounts fetched at mount
  const [chartOfAccountsAccounts, setChartOfAccountsAccounts] = useState([]); // Filtered by category
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState(
    SessionManager.get("searchTerm") || ""
  );
  const [editReceiptId, setEditReceiptId] = useState(null);
  const [formData, setFormData] = useState({
    voucherNo: "",
    date: new Date().toISOString().split("T")[0],
    // FROM Section - Where money comes from (Customer)
    customerName: "",
    customerId: "",
    linkedInvoices: [],
    // TO Section - Where money goes to (Account)
    accountType: "", // cash, bank, other
    toAccountId: "",
    // Payment Details
    amount: "",
    narration: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showToast, setShowToast] = useState({
    visible: false,
    message: "",
    type: "success",
  });
  // Filter by account type removed - now using account directly
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [viewVoucher, setViewVoucher] = useState(null); // For viewing voucher document

  const formRef = useRef(null);

  useEffect(() => {
    const savedFormData = SessionManager.get("formData");
    if (savedFormData && typeof savedFormData === "object") {
      setFormData((prev) => ({ ...prev, ...savedFormData }));
    }
    fetchReceipts();
    fetchCustomers();
    fetchUnpaidInvoices();
    fetchAllChartOfAccounts(); // Fetch all chart of accounts at mount
  }, []);

  useEffect(() => {
    let timer;
    if (showModal) {
      timer = setTimeout(() => {
        SessionManager.set("formData", formData);
        SessionManager.set("lastSaveTime", new Date().toISOString());
      }, 800);
    }
    return () => clearTimeout(timer);
  }, [formData, showModal]);

  useEffect(() => {
    SessionManager.set("searchTerm", searchTerm);
  }, [searchTerm]);

  const showToastMessage = useCallback((message, type = "success") => {
    setShowToast({ visible: true, message, type });
    setTimeout(
      () => setShowToast((prev) => ({ ...prev, visible: false })),
      2800
    );
  }, []);

  const fetchReceipts = useCallback(
    async (showRefreshIndicator = false) => {
      try {
        showRefreshIndicator ? setIsRefreshing(true) : setIsLoading(true);
        const response = await axios.get("/vouchers/vouchers", {
          params: { voucherType: "receipt" },
        });
        setReceipts(takeArray(response));
        if (showRefreshIndicator) showToastMessage("Data refreshed", "success");
      } catch (err) {
        showToastMessage(
          err.response?.data?.message || "Failed to fetch receipt vouchers.",
          "error"
        );
        setReceipts([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [showToastMessage]
  );

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await axios.get("/customers/customers");
      setCustomers(takeArray(response));
    } catch (err) {
      showToastMessage("Failed to fetch customers.", "error");
      setCustomers([]);
    }
  }, [showToastMessage]);

  // Fetch all chart of accounts at mount
  const fetchAllChartOfAccounts = useCallback(async () => {
    try {
      setAccountsLoading(true);
      const response = await axios.get("/account-v2/Transactor");
      const allAccounts = (response.data?.data || []).filter(acc => acc.isActive !== false);
      setAllChartOfAccounts(
        allAccounts.map((acc) => ({
          ...acc,
          value: acc._id,
          label: `${acc.accountName} (${acc.accountCode})`,
          accountName: acc.accountName || "",
          accountCode: acc.accountCode || "",
          transactorCategory: acc.transactorCategory,
          balance: Number(acc.currentBalance || acc.openingBalance || 0),
        }))
      );
    } catch (err) {
      console.error("Error fetching chart of accounts:", err);
      showToastMessage("Failed to load accounts.", "error");
      setAllChartOfAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  }, [showToastMessage]);

  // Filter chart of accounts based on category (cash, bank, other) - no API call
  const filterChartOfAccountsByCategory = useCallback(
    (category) => {
      if (!category) {
        setChartOfAccountsAccounts([]);
        return;
      }

      const filtered = allChartOfAccounts.filter((acc) => {
        // Primary filter: use the transactorCategory field from the backend
        if (acc.transactorCategory) {
          const accountCategory = acc.transactorCategory.toLowerCase();
          const selectedCategory = category.toLowerCase();
          // Handle 'other'/'others' matching
          if (selectedCategory === 'other' || selectedCategory === 'others') {
            return accountCategory === 'other' || accountCategory === 'others';
          }
          return accountCategory === selectedCategory;
        }
        
        // Fallback: match by name/code if transactorCategory is not set
        const name = (acc.accountName || "").toLowerCase();
        const code = (acc.accountCode || "").toUpperCase();
        
        if (category === "cash") {
          return name.includes("cash") || name.includes("petty") || 
                 code.startsWith("CAS") || code.startsWith("PET");
        }
        if (category === "bank") {
          return name.includes("bank") || code.startsWith("BAN");
        }
        // "other" category - accounts that are not cash or bank
        return !name.includes("cash") && !name.includes("bank") && !name.includes("petty");
      });
      
      setChartOfAccountsAccounts(filtered);
    },
    [allChartOfAccounts]
  );

  // Re-filter accounts when allChartOfAccounts changes (in case category was selected before accounts loaded)
  useEffect(() => {
    if (formData.accountType && allChartOfAccounts.length > 0) {
      filterChartOfAccountsByCategory(formData.accountType);
    }
  }, [allChartOfAccounts, formData.accountType, filterChartOfAccountsByCategory]);

const fetchUnpaidInvoices = useCallback(
  async (customerId = null) => {
    if (!customerId) {
      setAvailableInvoices([]);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append("partyId", customerId);
      params.append("partyType", "Customer");
      params.append("type", "sales_order"); // or "sales_invoice" if you use that
      params.append("limit", "500"); // Fetch up to 500 invoices for selection

      const response = await axios.get(`/transactions/transactions?${params.toString()}`);

      let invoices = takeArray(response);

      // Filter only APPROVED invoices that have outstanding balance
      const outstandingInvoices = invoices
        .filter((inv) => {
          const outstanding = Number(inv.outstandingAmount || 0);
          const isApproved = (inv.status || "").toLowerCase() === "approved";
          return outstanding > 0 && isApproved;
        })
        .map((inv) => ({
          _id: inv._id,
          transactionNo: inv.transactionNo || inv.docno || "N/A",
          date: inv.date,
          totalAmount: Number(inv.totalAmount || 0),
          paidAmount: Number(inv.paidAmount || 0),
          outstandingAmount: Number(inv.outstandingAmount || 0),
          status: inv.status,
        }));

      setAvailableInvoices(outstandingInvoices);
    } catch (err) {
      console.error("Error fetching unpaid invoices:", err);
      showToastMessage("Failed to load outstanding invoices.", "error");
      setAvailableInvoices([]);
    }
  },
  [showToastMessage]
);

  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      const [section, field] = name.includes(".")
        ? name.split(".")
        : [name, null];
      
      // Handle account type change - filter accounts locally
      if (name === "accountType") {
        setFormData((prev) => ({
          ...prev,
          accountType: value,
          toAccountId: "", // Reset account selection
        }));
        filterChartOfAccountsByCategory(value);
        return;
      }
      
      setFormData((prev) => ({
        ...prev,
        [field ? section : name]: field
          ? { ...prev[section], [field]: value }
          : value,
      }));
      setErrors((prev) => ({ ...prev, [section]: "" }));
      if (name === "customerId") {
        const selected = customers.find((c) => c._id === value);
        setFormData((prev) => ({
          ...prev,
          customerName: selected?.customerName || "",
          linkedInvoices: [],
          amount: "",
        }));
        fetchUnpaidInvoices(value);
      }
    },
    [customers, fetchUnpaidInvoices, filterChartOfAccountsByCategory]
  );

const handleInvoiceSelection = useCallback((invoiceId) => {
  setFormData((prev) => {
    const list = asArray(prev.linkedInvoices);
    const exists = list.some((item) => item.invoiceId === invoiceId);

    let newList;
    if (exists) {
      newList = list.filter((item) => item.invoiceId !== invoiceId);
    } else {
      const invoice = availableInvoices.find((inv) => inv._id === invoiceId);
      if (!invoice) return prev;

      newList = [
        ...list,
        {
          invoiceId,
          amount: String(invoice.outstandingAmount),
          balance: "0",
        },
      ];
    }

    const total = newList.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
      ...prev,
      linkedInvoices: newList,
      amount: String(total.toFixed(2)),
    };
  });
}, [availableInvoices]);



const handleInvoiceAmountChange = useCallback(
  (invoiceId, value) => {
    setFormData((prev) => {
      const invoice = availableInvoices.find((inv) => inv._id === invoiceId);
      if (!invoice) return prev;

      const maxAllowed = invoice.outstandingAmount;
      const numValue = parseFloat(value) || 0;

      const newList = prev.linkedInvoices.map((item) =>
        item.invoiceId === invoiceId
          ? {
              ...item,
              amount: value, // Keep raw value for input
              balance: String((maxAllowed - numValue).toFixed(2)),
            }
          : item
      );

      const total = newList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

      return {
        ...prev,
        linkedInvoices: newList,
        amount: String(total.toFixed(2)),
      };
    });
  },
  [availableInvoices]
);

  const validateForm = useCallback(() => {
    const e = {};
    // FROM Section validation
    if (!formData.customerId) e.customerId = "Customer is required";
    // TO Section validation
    if (!formData.accountType) e.accountType = "Account type is required";
    if (!formData.toAccountId) e.toAccountId = "Account selection is required";
    // Basic validation
    if (!formData.date) e.date = "Date is required";
    if (!formData.amount || Number(formData.amount) <= 0)
      e.amount = "Amount must be greater than 0";
    if (!asArray(formData.linkedInvoices).length)
      e.linkedInvoices = "At least one invoice must be selected";
    return e;
  }, [formData]);

  const resetForm = useCallback(() => {
    setEditReceiptId(null);
    setFormData({
      voucherNo: "",
      date: new Date().toISOString().split("T")[0],
      // FROM Section
      customerName: "",
      customerId: "",
      linkedInvoices: [],
      // TO Section
      accountType: "",
      toAccountId: "",
      // Payment Details
      amount: "",
      narration: "",
    });
    setErrors({});
    setChartOfAccountsAccounts([]);
    setShowModal(false);
    setAvailableInvoices([]);
    SessionManager.remove("formData");
    SessionManager.remove("lastSaveTime");
  }, []);

  const handleSubmit = useCallback(async () => {
    const e = validateForm();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        date: formData.date,
        // FROM Section - Customer
        customerId: formData.customerId,
        customerName: formData.customerName,
        linkedInvoices: formData.linkedInvoices.map((inv) => ({
          invoiceId: inv.invoiceId,
          transactionNo: inv.transactionNo,
          amount: Number(inv.amount),
          balance: Number(inv.balance),
        })),
        // TO Section - Account
        accountType: formData.accountType,
        toAccountId: formData.toAccountId,
        // Payment Details
        totalAmount: Number(formData.amount),
        narration: formData.narration,
        voucherType: "receipt",
      };
      if (editReceiptId) {
        await axios.put(`/vouchers/vouchers/${editReceiptId}`, payload);
        showToastMessage("Receipt voucher updated successfully!", "success");
      } else {
        await axios.post("/vouchers/vouchers", payload);
        showToastMessage("Receipt voucher created successfully!", "success");
      }
      await fetchReceipts();
      resetForm();
    } catch (err) {
      showToastMessage(
        err.response?.data?.message || "Failed to save receipt voucher.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    editReceiptId,
    formData,
    fetchReceipts,
    resetForm,
    showToastMessage,
    validateForm,
  ]);

  const handleEdit = useCallback(
    (receipt) => {
      setEditReceiptId(receipt._id);
      const linkedInvoices = asArray(receipt.linkedInvoices).map((inv) => ({
        invoiceId:
          typeof inv.invoiceId === "object" ? inv.invoiceId._id : inv.invoiceId,
        amount: String(inv.amount || 0),
        balance: String(
          inv.balance ||
            (typeof inv.invoiceId === "object"
              ? inv.invoiceId.totalAmount
              : 0) - (inv.amount || 0)
        ),
      }));
      
      // Extract TO section fields
      const accountType = receipt.accountType || "";
      const toAccountId =
        typeof receipt.toAccountId === "object"
          ? receipt.toAccountId?._id
          : receipt.toAccountId || "";
      
      setFormData({
        voucherNo: receipt.voucherNo || "",
        date: receipt.date
          ? new Date(receipt.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        // FROM Section - Customer
        customerName:
          receipt.partyName ||
          receipt.customerName ||
          (typeof receipt.partyId === "object"
            ? receipt.partyId.customerName
            : "") ||
          "",
        customerId:
          typeof receipt.partyId === "object"
            ? receipt.partyId._id
            : receipt.partyId || receipt.customerId || "",
        linkedInvoices,
        // TO Section - Account
        accountType: accountType,
        toAccountId: toAccountId,
        // Payment Details
        amount: String(receipt.totalAmount || receipt.amount || 0),
        narration: receipt.narration || "",
      });
      
      // Fetch accounts for the account type if present (local filter)
      if (accountType) {
        filterChartOfAccountsByCategory(accountType);
      }
      
      setShowModal(true);
      const customerId =
        typeof receipt.partyId === "object"
          ? receipt.partyId._id
          : receipt.partyId || receipt.customerId;
      if (customerId) fetchUnpaidInvoices(customerId);
      SessionManager.remove("formData");
      SessionManager.remove("lastSaveTime");
    },
    [fetchUnpaidInvoices, filterChartOfAccountsByCategory]
  );

  const openAddModal = useCallback(() => {
    resetForm();
    setShowModal(true);
    setTimeout(() => {
      const modal = document.querySelector(".modal-container");
      if (modal) modal.classList.add("scale-100");
      if (formRef.current)
        formRef.current.querySelector('input[name="searchTerm"]')?.focus();
    }, 10);
  }, [resetForm]);

  const handleRefresh = useCallback(() => fetchReceipts(true), [fetchReceipts]);

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const formatLastSaveTime = useCallback((timeString) => {
    if (!timeString) return "";
    const t = new Date(timeString);
    const diffMins = Math.floor((Date.now() - t.getTime()) / 60000);
    return diffMins < 1
      ? "just now"
      : diffMins < 60
      ? `${diffMins} min${diffMins > 1 ? "s" : ""} ago`
      : t.toLocaleTimeString();
  }, []);

  const handleViewReceipt = useCallback(
    (receipt) => setSelectedReceipt(receipt),
    []
  );

  const handleBackToList = useCallback(() => setSelectedReceipt(null), []);

  const safeReceipts = useMemo(() => asArray(receipts), [receipts]);

  const receiptStats = useMemo(() => {
    const totalReceipts = safeReceipts.length;
    const totalAmount = safeReceipts.reduce(
      (sum, r) => sum + (Number(r.totalAmount ?? r.amount) || 0),
      0
    );
    const todayReceipts = safeReceipts.filter(
      (r) => new Date(r.date).toDateString() === new Date().toDateString()
    ).length;
    const avgAmount = totalReceipts ? totalAmount / totalReceipts : 0;
    return { totalReceipts, totalAmount, todayReceipts, avgAmount };
  }, [safeReceipts]);

  const sortedAndFilteredReceipts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let filtered = safeReceipts.filter((r) => {
      const voucherNo = r.voucherNo?.toLowerCase() || "";
      const customerName = (r.partyName || r.customerName || "").toLowerCase();
      const narration = r.narration?.toLowerCase() || "";
      return (
        voucherNo.includes(term) ||
        customerName.includes(term) ||
        narration.includes(term)
      );
    });
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const av =
          sortConfig.key === "amount"
            ? Number(a.totalAmount ?? a.amount)
            : sortConfig.key === "date"
            ? new Date(a.date).getTime()
            : sortConfig.key === "linkedInvoices"
            ? asArray(a.linkedInvoices).length
            : sortConfig.key === "toAccountId"
            ? (a.toAccountId?.accountName || "").toLowerCase()
            : by(a[sortConfig.key]);
        const bv =
          sortConfig.key === "amount"
            ? Number(b.totalAmount ?? b.amount)
            : sortConfig.key === "date"
            ? new Date(b.date).getTime()
            : sortConfig.key === "linkedInvoices"
            ? asArray(b.linkedInvoices).length
            : sortConfig.key === "toAccountId"
            ? (b.toAccountId?.accountName || "").toLowerCase()
            : by(b[sortConfig.key]);
        return av < bv
          ? sortConfig.direction === "asc"
            ? -1
            : 1
          : av > bv
          ? sortConfig.direction === "asc"
            ? 1
            : -1
          : 0;
      });
    }
    return filtered;
  }, [safeReceipts, searchTerm, sortConfig]);

  if (selectedReceipt) {
    return (
      <PaymentInvoiceView
        selectedPayment={selectedReceipt}
        vendors={customers}
        onBack={handleBackToList}
        voucherType="receipt"
        showToastMessage={showToastMessage}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2
            size={48}
            className="text-purple-600 animate-spin mx-auto mb-4"
          />
          <p className="text-gray-600 text-lg">Loading receipt vouchers...</p>
        </div>
      </div>
    );
  }

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <Receipt size={40} className="text-purple-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No receipt vouchers found
      </h3>
      <p className="text-gray-600 text-center mb-8 max-w-md">
        {searchTerm
          ? "No receipt vouchers match your current filters. Try adjusting your search criteria."
          : "Start recording payments by creating your first receipt voucher."}
      </p>
      <button
        onClick={openAddModal}
        className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
      >
        <Plus size={20} /> Create First Receipt
      </button>
    </div>
  );

  const lastSaveTime = SessionManager.get("lastSaveTime");

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4 sm:p-6">
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
            <h1 className="text-3xl font-bold text-black">Receipt Voucher</h1>
            <p className="text-gray-600 mt-1">
              {receiptStats.totalReceipts} total receipts •{" "}
              {sortedAndFilteredReceipts.length} displayed
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw
              size={16}
              className={`text-gray-600 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`p-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ${
              showFilters
                ? "bg-purple-100 text-purple-600"
                : "bg-white text-gray-600"
            }`}
            title="Toggle filters"
          >
            <Filter size={16} />
          </button>
        </div>
      </div>
      <div className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Receipts"
            count={receiptStats.totalReceipts}
            icon={<Receipt size={24} />}
            bgColor="bg-emerald-50"
            textColor="text-emerald-700"
            borderColor="border-emerald-200"
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
            subText="All time records"
          />
          <StatCard
            title="Today's Receipts"
            count={receiptStats.todayReceipts}
            icon={<Calendar size={24} />}
            bgColor="bg-blue-50"
            textColor="text-blue-700"
            borderColor="border-blue-200"
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            subText="Current day activity"
          />
          <StatCard
            title="Total Amount"
            count={formatCurrency(receiptStats.totalAmount, "text-purple-700")}
            icon={<TrendingUp size={24} />}
            bgColor="bg-purple-50"
            textColor="text-purple-700"
            borderColor="border-purple-200"
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
            subText="All collected payments"
          />
          <StatCard
            title="Avg Receipt Value"
            count={formatCurrency(receiptStats.avgAmount, "text-indigo-700")}
            icon={<Banknote size={24} />}
            bgColor="bg-indigo-50"
            textColor="text-indigo-700"
            borderColor="border-indigo-200"
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
            subText="Per receipt average"
          />
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Receipt Vouchers
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Manage payment receipts and vouchers
              </p>
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <Plus size={18} /> Add Receipt
            </button>
          </div>
          <div className="mt-6 space-y-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by voucher number, customer, or narration..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
              <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
                <button
                  onClick={() => {
                    setSearchTerm("");
                  }}
                  className="px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
        {sortedAndFilteredReceipts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  {[
                    { key: "voucherNo", label: "Voucher No" },
                    { key: "date", label: "Date" },
                    { key: "customerName", label: "Customer" },
                    { key: "linkedInvoices", label: "Linked Invoices" },
                    { key: "toAccountId", label: "Deposit Account" },
                    { key: "amount", label: "Amount" },
                    { key: "narration", label: "Narration" },
                    { key: null, label: "Actions" },
                  ].map((col) => (
                    <th
                      key={col.key || "actions"}
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={col.key ? () => handleSort(col.key) : undefined}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{col.label}</span>
                        {col.key && sortConfig.key === col.key && (
                          <span className="text-purple-600">
                            {sortConfig.direction === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedAndFilteredReceipts.map((r) => (
                  <tr
                    key={r._id}
                    className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all duration-200"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <button
                        onClick={() => handleViewReceipt(r)}
                        className="text-blue-600 hover:underline"
                      >
                        {r.voucherNo}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(r.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                          <User size={16} className="text-purple-600" />
                        </div>
                        <div className="font-medium">
                          {r.partyName || r.customerName || "-"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex flex-wrap gap-1">
                        {asArray(r.linkedInvoices).map((invoice, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium flex items-center"
                          >
                            <Link2 size={10} className="mr-1" />
                            {invoice.invoiceId?.transactionNo ||
                              invoice.transactionNo ||
                              (typeof invoice.invoiceId === 'string' ? invoice.invoiceId : null) ||
                              "N/A"}
                            {invoice.amount && (
                              <span className="ml-1">
                                ({formatCurrency(invoice.amount)})
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Wallet size={16} className="text-emerald-600" />
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          {r.toAccountId?.accountName || r.accountType || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {formatCurrency(r.totalAmount ?? r.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {r.narration || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => setViewVoucher(r)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          title="View receipt voucher"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Voucher Document Modal */}
      {viewVoucher && (
        <VoucherDocument
          voucher={viewVoucher}
          type="receipt"
          onClose={() => setViewVoucher(null)}
        />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-white/50 flex items-center justify-center p-4 z-50 modal-container transform scale-95 transition-transform duration-300">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50 sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {editReceiptId
                    ? "Edit Receipt Voucher"
                    : "Add Receipt Voucher"}
                </h3>
                <div className="flex items-center mt-1 space-x-4">
                  <p className="text-gray-600 text-sm">
                    {editReceiptId
                      ? "Update receipt voucher information"
                      : "Create a new receipt voucher"}
                  </p>
                  {lastSaveTime && (
                    <p className="text-sm text-green-600 flex items-center">
                      <Save size={12} className="mr-1" /> Draft saved{" "}
                      {formatLastSaveTime(lastSaveTime)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={resetForm}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-xl transition-all duration-200"
              >
                <X size={22} />
              </button>
            </div>
            <div className="p-6" ref={formRef}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {editReceiptId && (
                  <FormInput
                    label="Voucher No"
                    icon={Receipt}
                    value={formData.voucherNo}
                    disabled
                    className="md:col-span-2 bg-gray-50 text-gray-500"
                  />
                )}
                <FormInput
                  label="Date"
                  icon={Calendar}
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  error={errors.date}
                  required
                />
                
                {/* ========== FROM SECTION - Customer (Money Source) ========== */}
                <div className="md:col-span-2 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <h4 className="text-sm font-bold text-blue-700 mb-4 flex items-center">
                    <ArrowDownLeft size={18} className="mr-2" />
                    FROM - Receiving Payment From
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CustomerSelect
                      customers={customers}
                      value={formData.customerId}
                      onChange={handleChange}
                      error={errors.customerId}
                    />
                  </div>
                  
                  {/* Invoice Selection */}
                  <div className="mt-4">
                    <InvoiceSelection
                      availableInvoices={availableInvoices}
                      linkedInvoices={formData.linkedInvoices}
                      onInvoiceSelection={handleInvoiceSelection}
                      onInvoiceAmountChange={handleInvoiceAmountChange}
                      customerId={formData.customerId}
                      error={errors.linkedInvoices}
                    />
                  </div>
                </div>

                {/* ========== TO SECTION - Account (Money Destination) ========== */}
                <div className="md:col-span-2 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
                  <h4 className="text-sm font-bold text-emerald-700 mb-4 flex items-center">
                    <ArrowUpRight size={18} className="mr-2" />
                    TO - Depositing Into Account
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Account Type Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Wallet size={16} className="inline mr-2" /> Account Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="accountType"
                        value={formData.accountType}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 transition-all duration-200 ${
                          errors.accountType ? "border-red-300 bg-red-50" : "border-gray-300"
                        }`}
                      >
                        <option value="">Select Account Type</option>
                        <option value="cash">💵 Cash</option>
                        <option value="bank">🏦 Bank</option>
                        <option value="other">📁 Other</option>
                      </select>
                      {errors.accountType && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle size={12} className="mr-1" /> {errors.accountType}
                        </p>
                      )}
                    </div>

                    {/* Transactor Account Selection - Filtered by Type */}
                    {formData.accountType && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <Building size={16} className="inline mr-2" /> Select Account <span className="text-red-500">*</span>
                        </label>
                        {accountsLoading ? (
                          <div className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 flex items-center">
                            <Loader2 size={16} className="animate-spin mr-2" />
                            Loading accounts...
                          </div>
                        ) : (
                          <select
                            name="toAccountId"
                            value={formData.toAccountId}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 transition-all duration-200 ${
                              errors.toAccountId ? "border-red-300 bg-red-50" : "border-gray-300"
                            }`}
                          >
                            <option value="">Select Account</option>
                            {chartOfAccountsAccounts.map((acc) => (
                              <option key={acc.value} value={acc.value}>
                                {acc.label}
                              </option>
                            ))}
                          </select>
                        )}
                        {errors.toAccountId && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle size={12} className="mr-1" /> {errors.toAccountId}
                          </p>
                        )}
                        {chartOfAccountsAccounts.length === 0 && formData.accountType && !accountsLoading && (
                          <p className="mt-1 text-sm text-amber-600 flex items-center">
                            <AlertTriangle size={12} className="mr-1" /> No accounts found for this type
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ========== AMOUNT & NARRATION SECTION ========== */}
                <FormInput
                  label="Total Amount"
                  icon={DollarSign}
                  type="number"
                  name="amount"
                  value={formData.amount}
                  readOnly
                  error={errors.amount}
                  className="bg-gray-50 text-gray-500"
                />
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <FileText size={16} className="inline mr-2" /> Narration
                  </label>
                  <textarea
                    name="narration"
                    value={formData.narration}
                    onChange={handleChange}
                    placeholder="Enter any additional details or notes..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-y min-h-[100px]"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-8">
                <button
                  onClick={resetForm}
                  disabled={isSubmitting}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-200 font-medium disabled:opacity-50 flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />{" "}
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />{" "}
                      {editReceiptId ? "Update Receipt" : "Save Receipt"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptVoucherManagement;
