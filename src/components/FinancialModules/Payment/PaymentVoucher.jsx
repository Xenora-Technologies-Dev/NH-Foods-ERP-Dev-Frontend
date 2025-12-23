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
  Edit,
  Trash2,
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
  Link as LinkIcon,
  Loader2,
  Upload,
  Eye,
  Download,
  Printer,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
} from "lucide-react";
import axiosInstance from "../../../axios/axios";
import VendorSelect from "./PartySelect";
import PaymentInvoiceView from "./PaymentInvoiceView";
import VoucherDocument from "../Receipt/VoucherDocument";

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

const getColorFilter = (colorClass) => {
  switch (colorClass) {
    case "text-emerald-700":
      return "invert(34%) sepia(94%) saturate(1352%) hue-rotate(145deg) brightness(94%) contrast(101%)";
    case "text-blue-700":
      return "invert(35%) sepia(99%) saturate(1352%) hue-rotate(200deg) brightness(94%) contrast(101%)";
    case "text-indigo-700":
      return "invert(38%) sepia(99%) saturate(1352%) hue-rotate(230deg) brightness(94%) contrast(101%)";
    case "text-purple-700":
      return "invert(35%) sepia(99%) saturate(1352%) hue-rotate(280deg) brightness(94%) contrast(101%)";
    default:
      return "none";
  }
};

const SessionManager = {
  storage: {},
  key: (k) => `payment_voucher_${k}`,
  get(key) {
    try {
      return SessionManager.storage[SessionManager.key(key)] ?? null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      SessionManager.storage[SessionManager.key(key)] = value;
    } catch {}
  },
  remove(key) {
    try {
      delete SessionManager.storage[SessionManager.key(key)];
    } catch {}
  },
  clear() {
    Object.keys(SessionManager.storage).forEach((k) => {
      if (k.startsWith("payment_voucher_")) delete SessionManager.storage[k];
    });
  },
};

const asArray = (x) => (Array.isArray(x) ? x : []);

const takeArray = (resp) => {
  if (!resp) return [];
  const d = resp.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data.data ?? d.data;
  if (Array.isArray(d?.vouchers)) return d.vouchers;
  return [];
};

const formatCurrency = (amount, colorClass = "text-gray-900") => {
  const numAmount = Number(amount) || 0;
  const absAmount = Math.abs(numAmount).toFixed(2);
  const isNegative = numAmount < 0;
  return (
    <span className={`inline-flex items-center ${colorClass}`}>
      {isNegative && "-"}
      <span className="mr-1">AED</span>
      {absAmount}
    </span>
  );
};

const by = (v) => (typeof v === "string" ? v.toLowerCase() : v);

const isImage = (fileOrFilename) => {
  if (fileOrFilename instanceof File) {
    return fileOrFilename.type.startsWith("image/");
  }
  if (typeof fileOrFilename === "string") {
    const ext = fileOrFilename.split(".").pop()?.toLowerCase() || "";
    return ["jpg", "jpeg", "png"].includes(ext);
  }
  return false;
};

const getFileName = (fileOrFilename) => {
  if (fileOrFilename instanceof File) return fileOrFilename.name;
  return fileOrFilename || "Unknown file";
};

const getFileSize = (file) => {
  if (file instanceof File) {
    return (file.size / 1024).toFixed(2) + " KB";
  }
  if (file?.fileSize) {
    return (file.fileSize / 1024).toFixed(2) + " KB";
  }
  return "";
};

const PaymentVoucherManagement = () => {
  const [payments, setPayments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [availableInvoices, setAvailableInvoices] = useState([]);
  const [allTransactors, setAllTransactors] = useState([]); // All transactors fetched at mount
  const [transactorAccounts, setTransactorAccounts] = useState([]); // Filtered by category
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState(
    SessionManager.get("searchTerm") || ""
  );
  const [editPaymentId, setEditPaymentId] = useState(null);
  const [formData, setFormData] = useState({
    voucherNo: "",
    date: new Date().toISOString().split("T")[0],
    // FROM Section
    accountType: "",
    fromAccountId: "",
    // TO Section
    vendorName: "",
    vendorId: "",
    linkedInvoices: [],
    // Payment Details
    amount: "",
    narration: "",
    attachedProof: null,
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [existingProof, setExistingProof] = useState(null);
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
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [viewVoucher, setViewVoucher] = useState(null); // For viewing voucher document

  const formRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedFormData = SessionManager.get("formData");
    if (savedFormData && typeof savedFormData === "object") {
      setFormData((prev) => ({ ...prev, ...savedFormData }));
    }
    fetchPayments();
    fetchVendors();
    fetchOutstandingInvoices();
    fetchAllTransactors();
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

  useEffect(() => {
    return () => {
      if (previewUrl && selectedFile) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, selectedFile]);

  const showToastMessage = useCallback((message, type = "success") => {
    setShowToast({ visible: true, message, type });
    setTimeout(
      () => setShowToast((prev) => ({ ...prev, visible: false })),
      2800
    );
  }, []);

  const fetchPayments = useCallback(
    async (showRefreshIndicator = false) => {
      try {
        showRefreshIndicator ? setIsRefreshing(true) : setIsLoading(true);
        const response = await axiosInstance.get("/vouchers/vouchers", {
          params: { voucherType: "payment" },
        });
        console.log(response);
        setPayments(takeArray(response));
        if (showRefreshIndicator) showToastMessage("Data refreshed", "success");
      } catch (err) {
        showToastMessage(
          err.response?.data?.message || "Failed to fetch payment vouchers.",
          "error"
        );
        setPayments([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [showToastMessage]
  );

  const fetchVendors = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/vendors/vendors");
      setVendors(takeArray(response));
    } catch (err) {
      showToastMessage("Failed to fetch vendors.", "error");
      setVendors([]);
    }
  }, [showToastMessage]);

  const fetchOutstandingInvoices = useCallback(
    async (vendorId = null) => {
      if (!vendorId) {
        setAvailableInvoices([]);
        return;
      }

      try {
        const params = new URLSearchParams();
        params.append("partyId", vendorId);
        params.append("partyType", "Vendor");
        params.append("type", "purchase_order"); // or "purchase_invoice" if you use that
        // Remove status=APPROVED if not needed — better to get all and filter outstanding

        const response = await axiosInstance.get(
          `/transactions/transactions?${params.toString()}`
        );

        let invoices = takeArray(response);

        // Filter only invoices with outstanding balance > 0
        const outstandingInvoices = invoices
          .filter((inv) => {
            const outstanding = Number(inv.outstandingAmount || 0);
            return outstanding > 0;
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
        console.error("Error fetching invoices:", err);
        showToastMessage("Failed to load outstanding invoices.", "error");
        setAvailableInvoices([]);
      }
    },
    [showToastMessage]
  );

  // Fetch all transactor accounts at mount
  const fetchAllTransactors = useCallback(async () => {
    try {
      setAccountsLoading(true);
      const response = await axiosInstance.get("/account-v2/Transactor");
      const allAccounts = (response.data?.data || []).filter(acc => acc.isActive !== false);
      setAllTransactors(
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
      console.error("Error fetching transactors:", err);
      showToastMessage("Failed to load accounts.", "error");
      setAllTransactors([]);
    } finally {
      setAccountsLoading(false);
    }
  }, [showToastMessage]);

  // Filter transactor accounts based on category (cash, bank, other) - no API call
  const filterTransactorsByCategory = useCallback(
    (category) => {
      if (!category) {
        setTransactorAccounts([]);
        return;
      }

      const filtered = allTransactors.filter((acc) => {
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
      
      setTransactorAccounts(filtered);
    },
    [allTransactors]
  );

  // Re-filter accounts when allTransactors changes (in case category was selected before accounts loaded)
  useEffect(() => {
    if (formData.accountType && allTransactors.length > 0) {
      filterTransactorsByCategory(formData.accountType);
    }
  }, [allTransactors, formData.accountType, filterTransactorsByCategory]);

  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      const [section, field] = name.includes(".")
        ? name.split(".")
        : [name, null];
      
      // Handle account type and from account selection
      if (name === "accountType") {
        setFormData((prev) => ({
          ...prev,
          accountType: value,
          fromAccountId: "",  // Reset account selection
          linkedInvoices: [],
          amount: "",
        }));
        filterTransactorsByCategory(value);
        return;
      }

      setFormData((prev) => ({
        ...prev,
        [field ? section : name]: field
          ? { ...prev[section], [field]: value }
          : value,
      }));
      setErrors((prev) => ({ ...prev, [section]: "" }));
      if (name === "vendorId") {
        const selected = vendors.find((v) => v._id === value);
        setFormData((prev) => ({
          ...prev,
          vendorName: selected?.vendorName || "",
          linkedInvoices: [],
          amount: "",
        }));
        fetchOutstandingInvoices(value);
      }
    },
    [vendors, fetchOutstandingInvoices]
  );

  const handleFileSelect = useCallback(
    (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg",
      ];
      if (!allowedTypes.includes(file.type)) {
        showToastMessage("Please upload PDF, JPG, or PNG files only.", "error");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showToastMessage("File size should be less than 5MB.", "error");
        return;
      }

      if (previewUrl && selectedFile) {
        URL.revokeObjectURL(previewUrl);
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setExistingProof(null);
    },
    [previewUrl, selectedFile, showToastMessage]
  );

  const handleRemoveFile = useCallback(() => {
    if (previewUrl && selectedFile) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setExistingProof(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [previewUrl, selectedFile]);

  const handleInvoiceSelection = useCallback(
    (invoiceId) => {
      setFormData((prev) => {
        const list = asArray(prev.linkedInvoices);
        const exists = list.some((item) => item.invoiceId === invoiceId);

        let newList;
        if (exists) {
          newList = list.filter((item) => item.invoiceId !== invoiceId);
        } else {
          const invoice = availableInvoices.find(
            (inv) => inv._id === invoiceId
          );
          if (!invoice) return prev;

          newList = [
            ...list,
            {
              invoiceId,
              amount: String(invoice.outstandingAmount), // Pre-fill with full outstanding
              balance: "0",
            },
          ];
        }

        const total = newList.reduce(
          (sum, item) => sum + Number(item.amount || 0),
          0
        );

        return {
          ...prev,
          linkedInvoices: newList,
          amount: String(total.toFixed(2)),
        };
      });
    },
    [availableInvoices]
  );

  const handleInvoiceAmountChange = useCallback(
    (invoiceId, value) => {
      // Allow free typing - don't clamp immediately
      setFormData((prev) => {
        const newList = prev.linkedInvoices.map((item) => {
          if (item.invoiceId === invoiceId) {
            const invoice = availableInvoices.find((inv) => inv._id === invoiceId);
            const maxAllowed = invoice?.outstandingAmount || 0;
            const numValue = Number(value) || 0;
            return {
              ...item,
              amount: value, // Keep raw value for free typing
              balance: String((maxAllowed - numValue).toFixed(2)),
            };
          }
          return item;
        });

        const total = newList.reduce(
          (sum, item) => sum + Number(item.amount || 0),
          0
        );

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
    if (!formData.accountType) e.accountType = "Account type is required";
    if (!formData.fromAccountId) e.fromAccountId = "Account selection is required";
    // TO Section validation
    if (!formData.vendorId) e.vendorId = "Vendor is required";
    if (!formData.date) e.date = "Date is required";
    if (!formData.amount || Number(formData.amount) <= 0)
      e.amount = "Amount must be greater than 0";
    if (!asArray(formData.linkedInvoices).length)
      e.linkedInvoices = "At least one invoice must be selected";
    return e;
  }, [formData]);

  const resetForm = useCallback(() => {
    setEditPaymentId(null);
    setFormData({
      voucherNo: "",
      date: new Date().toISOString().split("T")[0],
      accountType: "",
      fromAccountId: "",
      vendorName: "",
      vendorId: "",
      linkedInvoices: [],
      amount: "",
      narration: "",
      attachedProof: null,
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setExistingProof(null);
    setErrors({});
    setTransactorAccounts([]);
    setShowModal(false);
    setAvailableInvoices([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
        // FROM Section
        accountType: formData.accountType,
        fromAccountId: formData.fromAccountId,
        // TO Section
        vendorId: formData.vendorId,
        vendorName: formData.vendorName,
        linkedInvoices: formData.linkedInvoices.map((inv) => ({
          invoiceId: inv.invoiceId,
          transactionNo: inv.transactionNo,
          amount: Number(inv.amount),
          balance: Number(inv.balance),
        })),
        // Payment Details
        totalAmount: Number(formData.amount),
        narration: formData.narration,
        voucherType: "payment",
        attachedProof: existingProof?._id || null,
      };
      const fd = new FormData();
      fd.append("data", JSON.stringify(payload));
      if (selectedFile) fd.append("attachedProof", selectedFile);

      if (editPaymentId) {
        await axiosInstance.put(`/vouchers/vouchers/${editPaymentId}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        showToastMessage("Payment voucher updated successfully!", "success");
      } else {
        await axiosInstance.post("/vouchers/vouchers", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        showToastMessage("Payment voucher created successfully!", "success");
      }
      await fetchPayments();
      resetForm();
    } catch (err) {
      showToastMessage(
        err.response?.data?.message || "Failed to save payment voucher.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    editPaymentId,
    formData,
    existingProof,
    selectedFile,
    fetchPayments,
    resetForm,
    showToastMessage,
    validateForm,
  ]);

  const handleEdit = useCallback(
    (payment) => {
      setEditPaymentId(payment._id);
      const linkedInvoices = asArray(payment.linkedInvoices).map((inv) => ({
        invoiceId:
          typeof inv === "object" ? inv.invoiceId?._id || inv.invoiceId : inv,
        amount: String(inv.amount || payment.totalAmount || 0),
        balance: String(
          inv.balance ||
            ((typeof inv.invoiceId === "object"
              ? inv.invoiceId?.totalAmount
              : payment.totalAmount) || 0) - (inv.amount || 0)
        ),
      }));
      
      // Extract FROM section fields
      const accountType = payment.accountType || "";
      const fromAccountId =
        typeof payment.fromAccountId === "object"
          ? payment.fromAccountId?._id
          : payment.fromAccountId || "";
      
      setFormData({
        voucherNo: payment.voucherNo || "",
        date: payment.date
          ? new Date(payment.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        // FROM Section
        accountType: accountType,
        fromAccountId: fromAccountId,
        // TO Section
        vendorName:
          payment.partyName ||
          payment.vendorName ||
          (typeof payment.partyId === "object"
            ? payment.partyId?.vendorName
            : "") ||
          "",
        vendorId:
          typeof payment.partyId === "object"
            ? payment.partyId?._id
            : payment.partyId || payment.vendorId || "",
        linkedInvoices,
        amount: String(payment.totalAmount || payment.amount || 0),
        narration: payment.narration || payment.remarks || "",
        attachedProof: null,
      });
      
      // Fetch accounts for the account type if present
      if (accountType) {
        filterTransactorsByCategory(accountType);
      }
      
      const proof = asArray(payment.attachments)[0] || null;
      setExistingProof(proof);
      setPreviewUrl(proof?.filePath || null);
      setSelectedFile(null);
      setShowModal(true);
      const vendorId =
        typeof payment.partyId === "object"
          ? payment.partyId?._id
          : payment.partyId || payment.vendorId;
      if (vendorId) fetchOutstandingInvoices(vendorId);
      SessionManager.remove("formData");
      SessionManager.remove("lastSaveTime");
    },
    [fetchOutstandingInvoices, filterTransactorsByCategory]
  );

  const openAddModal = useCallback(() => {
    resetForm();
    setShowModal(true);
    setTimeout(() => {
      const modal = document.querySelector(".modal-container");
      if (modal) modal.classList.add("scale-100");
      if (formRef.current)
        formRef.current.querySelector('select[name="vendorId"]')?.focus();
    }, 10);
  }, [resetForm]);

  const handleRefresh = useCallback(() => fetchPayments(true), [fetchPayments]);

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

  const handleViewPayment = useCallback((payment) => {
    setSelectedPayment(payment);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedPayment(null);
  }, []);

  const safePayments = useMemo(() => asArray(payments), [payments]);

  const paymentStats = useMemo(() => {
    const totalPayments = safePayments.length;
    const totalAmount = safePayments.reduce(
      (sum, p) => sum + (Number(p.totalAmount ?? p.amount) || 0),
      0
    );
    const todayPayments = safePayments.filter(
      (p) => new Date(p.date).toDateString() === new Date().toDateString()
    ).length;
    const avgAmount = totalPayments ? totalAmount / totalPayments : 0;
    return { totalPayments, totalAmount, todayPayments, avgAmount };
  }, [safePayments]);

  const sortedAndFilteredPayments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let filtered = safePayments.filter((p) => {
      const voucherNo = p.voucherNo?.toLowerCase() || "";
      const vendorName = (p.partyName || p.vendorName || "").toLowerCase();
      const narration = p.narration?.toLowerCase() || "";
      return (
        voucherNo.includes(term) ||
        vendorName.includes(term) ||
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
            : sortConfig.key === "fromAccountId"
            ? (a.fromAccountId?.accountName || "").toLowerCase()
            : by(a[sortConfig.key]);
        const bv =
          sortConfig.key === "amount"
            ? Number(b.totalAmount ?? b.amount)
            : sortConfig.key === "date"
            ? new Date(b.date).getTime()
            : sortConfig.key === "linkedInvoices"
            ? asArray(b.linkedInvoices).length
            : sortConfig.key === "fromAccountId"
            ? (b.fromAccountId?.accountName || "").toLowerCase()
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
  }, [safePayments, searchTerm, sortConfig]);

  if (selectedPayment) {
    return (
      <PaymentInvoiceView
        selectedPayment={selectedPayment}
        vendors={vendors}
        onBack={handleBackToList}
        voucherType="payment"
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
          <p className="text-gray-600 text-lg">Loading payment vouchers...</p>
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
        No payment vouchers found
      </h3>
      <p className="text-gray-600 text-center mb-8 max-w-md">
        {searchTerm
          ? "No payment vouchers match your current filters. Try adjusting your search criteria."
          : "Start recording payments by creating your first payment voucher."}
      </p>
      <button
        onClick={openAddModal}
        className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
      >
        <Plus size={20} /> Create First Payment
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
            <h1 className="text-3xl font-bold text-black">Payment Voucher</h1>
            <p className="text-gray-600 mt-1">
              {paymentStats.totalPayments} total payments •{" "}
              {sortedAndFilteredPayments.length} displayed
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
            title="Total Payments"
            count={paymentStats.totalPayments}
            icon={<Receipt size={24} />}
            bgColor="bg-emerald-50"
            textColor="text-emerald-700"
            borderColor="border-emerald-200"
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
            subText="All time records"
          />
          <StatCard
            title="Today's Payments"
            count={paymentStats.todayPayments}
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
            count={formatCurrency(paymentStats.totalAmount, "text-purple-700")}
            icon={<TrendingUp size={24} />}
            bgColor="bg-purple-50"
            textColor="text-purple-700"
            borderColor="border-purple-200"
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
            subText="All disbursed payments"
          />
          <StatCard
            title="Avg Payment Value"
            count={formatCurrency(paymentStats.avgAmount, "text-indigo-700")}
            icon={<Banknote size={24} />}
            bgColor="bg-indigo-50"
            textColor="text-indigo-700"
            borderColor="border-indigo-200"
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
            subText="Per payment average"
          />
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Payment Vouchers
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Manage payment vouchers and transactions
              </p>
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <Plus size={18} /> Add Payment
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
                placeholder="Search by voucher number, vendor, or narration..."
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
        {sortedAndFilteredPayments.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  {[
                    { key: "voucherNo", label: "Voucher No" },
                    { key: "date", label: "Date" },
                    { key: "vendorName", label: "Vendor" },
                    { key: "linkedInvoices", label: "Linked Invoices" },
                    { key: "fromAccountId", label: "Spend Account" },
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
                {sortedAndFilteredPayments.map((p) => (
                  <tr
                    key={p._id}
                    className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all duration-200"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <button
                        onClick={() => handleViewPayment(p)}
                        className="text-blue-600 hover:underline"
                      >
                        {p.voucherNo}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(p.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                          <User size={16} className="text-purple-600" />
                        </div>
                        <div className="font-medium">
                          {p.partyName || p.vendorName || "-"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex flex-wrap gap-1">
                        {asArray(p.linkedInvoices).map((inv, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium flex items-center"
                          >
                            <LinkIcon size={10} className="mr-1" />
                            {inv.invoiceId?.transactionNo ||
                              inv.transactionNo ||
                              (typeof inv.invoiceId === 'string' ? inv.invoiceId : null) ||
                              "N/A"}
                            {inv.amount && (
                              <span className="ml-1">
                                ({formatCurrency(inv.amount)})
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Wallet size={16} className="text-red-600" />
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          {p.fromAccountId?.accountName || p.accountType || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {formatCurrency(p.totalAmount ?? p.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {p.narration || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setViewVoucher(p)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          title="View voucher"
                        >
                          <Eye size={16} />
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
      {viewVoucher && (
        <VoucherDocument
          voucher={viewVoucher}
          type="payment"
          onClose={() => setViewVoucher(null)}
        />
      )}
      {showModal && (
        <div className="fixed inset-0 bg-white/50 flex items-center justify-center p-4 z-50 modal-container transform scale-95 transition-transform duration-300">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50 sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {editPaymentId
                    ? "Edit Payment Voucher"
                    : "Add Payment Voucher"}
                </h3>
                <div className="flex items-center mt-1 space-x-4">
                  <p className="text-gray-600 text-sm">
                    {editPaymentId
                      ? "Update payment voucher information"
                      : "Create a new payment voucher"}
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
                {editPaymentId && (
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
                
                {/* ========== FROM SECTION - Account (Money Source) ========== */}
                <div className="md:col-span-2 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <h4 className="text-sm font-bold text-blue-700 mb-4 flex items-center">
                    <ArrowDownLeft size={18} className="mr-2" />
                    FROM - Paying From Account
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
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 ${
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
                            name="fromAccountId"
                            value={formData.fromAccountId}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 ${
                              errors.fromAccountId ? "border-red-300 bg-red-50" : "border-gray-300"
                            }`}
                          >
                            <option value="">Select Account</option>
                            {transactorAccounts.map((acc) => (
                              <option key={acc.value} value={acc.value}>
                                {acc.label}
                              </option>
                            ))}
                          </select>
                        )}
                        {errors.fromAccountId && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle size={12} className="mr-1" /> {errors.fromAccountId}
                          </p>
                        )}
                        {transactorAccounts.length === 0 && formData.accountType && !accountsLoading && (
                          <p className="mt-1 text-sm text-amber-600 flex items-center">
                            <AlertTriangle size={12} className="mr-1" /> No accounts found for this type
                          </p>
                        )}
                        {/* Show selected account balance */}
                        {formData.fromAccountId && (() => {
                          const selectedAccount = transactorAccounts.find(acc => acc.value === formData.fromAccountId);
                          if (selectedAccount) {
                            return (
                              <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-purple-700 font-medium">Available Balance:</span>
                                  <span className="text-lg font-bold text-purple-800">
                                    AED {(selectedAccount.balance || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* ========== TO SECTION - Vendor (Payment Recipient) ========== */}
                <div className="md:col-span-2 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
                  <h4 className="text-sm font-bold text-emerald-700 mb-4 flex items-center">
                    <ArrowUpRight size={18} className="mr-2" />
                    TO - Paying To Vendor
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <VendorSelect
                      vendor={vendors}
                      value={formData.vendorId}
                      onChange={handleChange}
                      error={errors.vendorId}
                    />
                    
                    {/* Linked Invoices */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <LinkIcon size={16} className="inline mr-2" /> Linked Invoice(s) <span className="text-red-500">*</span>
                      </label>
                      <div
                        className={`border rounded-xl p-4 max-h-64 overflow-y-auto ${
                          errors.linkedInvoices
                            ? "border-red-300 bg-red-50"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {availableInvoices.length === 0 ? (
                          <p className="text-gray-500 text-center py-8">
                            {formData.vendorId
                              ? "No outstanding invoices found for this vendor"
                              : "Please select a vendor to view outstanding invoices"}
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {availableInvoices.map((inv) => {
                              const linkedItem = formData.linkedInvoices.find(
                                (i) => i.invoiceId === inv._id
                              );
                              const isSelected = !!linkedItem;

                              return (
                                <div
                                  key={inv._id}
                                  className={`p-4 rounded-lg border ${
                                    isSelected
                                      ? "border-emerald-300 bg-emerald-50"
                                      : "border-gray-200 bg-white"
                                  } transition-all`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-3">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() =>
                                          handleInvoiceSelection(inv._id)
                                        }
                                        className="mt-1 h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                                      />
                                      <div>
                                        <p className="font-semibold text-gray-900">
                                          {inv.transactionNo}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                          {new Date(inv.date).toLocaleDateString()}{" "}
                                          • Total: {formatCurrency(inv.totalAmount)}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                          Paid: {formatCurrency(inv.paidAmount)} •{" "}
                                          <span className="text-red-600 font-medium">
                                            Due:{" "}
                                            {formatCurrency(inv.outstandingAmount)}
                                          </span>
                                        </p>
                                      </div>
                                    </div>

                                    {isSelected && (
                                      <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                          <div>
                                            <span className="text-gray-500">Outstanding:</span>
                                            <span className="ml-2 font-semibold text-gray-900">
                                              {formatCurrency(inv.outstandingAmount)}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-gray-500">New Balance:</span>
                                            <span className={`ml-2 font-semibold ${Number(linkedItem.balance) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                              {formatCurrency(linkedItem.balance || inv.outstandingAmount)}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2">
                                          <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">AED</span>
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              value={linkedItem.amount || ""}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                                                  handleInvoiceAmountChange(inv._id, val);
                                                }
                                              }}
                                              onBlur={(e) => {
                                                const numVal = Number(e.target.value) || 0;
                                                const maxAllowed = inv.outstandingAmount;
                                                const clamped = Math.max(0, Math.min(numVal, maxAllowed));
                                                if (numVal !== clamped) {
                                                  handleInvoiceAmountChange(inv._id, String(clamped));
                                                }
                                              }}
                                              className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                              placeholder="0.00"
                                            />
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleInvoiceAmountChange(inv._id, String(inv.outstandingAmount))}
                                            className="px-3 py-2 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
                                          >
                                            Pay Full
                                          </button>
                                        </div>
                                        {Number(linkedItem.balance) < 0 && (
                                          <p className="mt-2 text-xs text-red-600 flex items-center">
                                            <AlertCircle size={12} className="mr-1" />
                                            Amount exceeds outstanding balance
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      {errors.linkedInvoices && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle size={12} className="mr-1" />{" "}
                          {errors.linkedInvoices}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ========== AMOUNT & ATTACHMENTS SECTION ========== */}

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
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <FileText size={16} className="inline mr-2" /> Payment Proof
                  </label>
                  {!previewUrl ? (
                    <div className="relative">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center justify-center space-x-2"
                      >
                        <Upload size={18} />
                        <span>Upload proof</span>
                      </button>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {isImage(selectedFile || existingProof?.fileName) ? (
                            <img
                              src={previewUrl}
                              alt="Proof preview"
                              className="w-12 h-12 object-cover rounded-md border border-gray-200"
                            />
                          ) : (
                            <FileText size={32} className="text-blue-600" />
                          )}
                          <div>
                            <p className="font-medium text-sm text-gray-900">
                              {getFileName(
                                selectedFile || existingProof?.fileName
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {getFileSize(selectedFile || existingProof)}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => window.open(previewUrl, "_blank")}
                            className="p-1 text-blue-600 hover:text-blue-800"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <FileText size={16} className="inline mr-2" /> Narration
                  </label>
                  <textarea
                    name="narration"
                    value={formData.narration}
                    onChange={handleChange}
                    placeholder="Enter any additional details or notes..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-y min-h-[100px]"
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
                      {editPaymentId ? "Update Payment" : "Save Payment"}
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

export default PaymentVoucherManagement;
