import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  ShoppingCart,
  Building,
  User,
  Calendar,
  Hash,
  Package,
  DollarSign,
  Plus,
  Trash2,
  Eye,
  Edit3,
  CheckCircle,
  ArrowLeft,
  Truck,
  AlertCircle,
  Search,
  Filter,
  FileText,
  X,
  Save,
  Send,
  Clock,
  CheckSquare,
  XCircle,
  Receipt,
  Download,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Grid,
  List,
  Settings,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  Archive,
  FileDown,
} from "lucide-react";
import axiosInstance from "../../../axios/axios";
import POForm from "./POForm";
import TableView from "./TableView";
import GridView from "./GridView";
import InvoiceView from "./InvoiceView";
import { exportPurchaseOrdersToExcel } from "../../../utils/excelExport";
import PaginationControl from "../../Pagination/PaginationControl";
import { useVendorList, useStockList } from "../../../hooks/useDataFetching";
import { PageListSkeleton, RefetchIndicator } from "../../ui/Skeletons";
import {
  normalizeTransactionStatus,
  getDisplayStatus,
  isInvoiceStatus as checkInvoiceStatus,
  TRANSACTION_STATUS,
  getTransactionStatusColor,
} from "../../../utils/statusNormalizer";

const PurchaseOrderManagement = () => {
  const [activeView, setActiveView] = useState("dashboard");
  const [viewMode, setViewMode] = useState("table");
  const [selectedPO, setSelectedPO] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [vendorFilter, setVendorFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [notifications, setNotifications] = useState([]);
  const [selectedPOs, setSelectedPOs] = useState([]);
  // ── Cached data via React Query (shared across all pages) ──
  const { data: vendorData, isLoading: vendorsLoading, isFetching: vendorsFetching } = useVendorList();
  const { data: stockData, isLoading: stockLoading, isFetching: stockFetching } = useStockList();
  const vendors = useMemo(() => vendorData?.items || [], [vendorData]);
  const stockItems = useMemo(() => stockData?.items || [], [stockData]);

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [createdPO, setCreatedPO] = useState(null);

  const [formData, setFormData] = useState({
    transactionNo: "",
    partyId: "",
    vendorReference: "",
    date: new Date().toISOString().slice(0, 10),
    deliveryDate: "",
    status: "DRAFT",
    items: [
      {
        itemId: "",
        description: "",
        qty: "",
        rate: "0.00",
        taxPercent: "5",
        purchasePrice: 0,
        currentPurchasePrice: 0,
        category: "",
        brand: "",
        origin: "",
        uom: "",
        total: "0.00",
        vatAmount: "0.00",
        grandTotal: "0.00",
        vatPercent: "5",
      },
    ],
    terms: "",
    notes: "",
    priority: "Medium",
    discount: "0.00",
    roundoff: "0.00",
  });

  // Initial load - fetch transactions (vendors & stock come from React Query cache)
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Debounce search term to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Refresh list when filters change (using debounced search)
  useEffect(() => {
    fetchTransactions();
  }, [debouncedSearchTerm, statusFilter, vendorFilter, dateFrom, dateTo]);

  // Vendors and stock items are now provided by React Query hooks above

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      // When showing "ALL" statuses, exclude APPROVED/PAID/PARTIAL from purchase orders
      // because those belong in the Approved Purchases / Purchase Invoice view
      const { data } = await axiosInstance.get("/transactions/transactions", {
        params: {
          type: "purchase_order",
          search: debouncedSearchTerm,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          excludeStatus: statusFilter === "ALL" ? "APPROVED,PAID,PARTIAL" : undefined,
          partyId: vendorFilter !== "ALL" ? vendorFilter : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          limit: 1000, // Fetch up to 1000 records for display
        },
      });
      const rawTxs = data.data || [];
      // Double-check client-side: exclude APPROVED/PAID/PARTIAL from Purchase Order list
      // Using normalizer for case-insensitive matching (handles legacy mixed-case data)
      const txs = statusFilter === "ALL"
        ? rawTxs.filter((t) => !checkInvoiceStatus(t.status))
        : rawTxs;

      const enrichedPOs = txs.map((t) => {
        // FIX: Enrich vendor name using vendors array (reliable fallback)
        const vendorObj = vendors.find((v) => v._id === t.partyId);
        const vendorName = vendorObj?.vendorName || t.partyName || "Unknown Vendor";

        // Enrich each item with stock details (FIX: Preserve itemCode, fallback sku)
        const enrichedItems = (t.items || []).map((item) => {
          const stock = item.stockDetails || stockItems.find(s => String(s._id) === String(item.itemId)) || {};
          // FIX: Prefer stock master code (stock.itemId) over potentially stale item.itemCode; never use ObjectId as code
          const normalizedItemCode = stock.itemId || item.itemCode || item.sku || "-";

          return {
            // Preserve backend fields
            itemId: item.itemId,
            itemCode: normalizedItemCode,
            description: item.description || "",
            qty: item.qty || 0,
            rate: item.rate || 0,
            lineTotal: item.lineTotal || 0,
            vatAmount: item.vatAmount || 0,
            vatPercent: item.vatPercent || 5,

            // Enriched from stock or backend
            itemName: stock.itemName || "Unknown Item",
            sku: stock.sku || item.sku || normalizedItemCode,
            barcodeQrCode: stock.barcodeQrCode || "-",
            category: stock.category || "-",
            brand: stock.brand || "-",
            origin: stock.origin || "-",
            unitOfMeasure: stock.unitOfMeasureDetails?.unitName || stock.unitOfMeasure || "Unit",
            currentStock: stock.currentStock || 0,
            purchasePrice: stock.purchasePrice || 0,
            salesPrice: stock.salesPrice || 0,
            reorderLevel: stock.reorderLevel || 0,
            expiryDate: stock.expiryDate || null,
            batchNumber: stock.batchNumber || "-",
          };
        });

        return {
          id: t._id,
          transactionNo: t.transactionNo,
          vendorId: t.partyId,
          vendorName,  // FIX: Use enriched vendorName
          vendorReference: t.vendorReference || "",
          refNo: t.vendorReference || t.refNo || "",
          date: t.date ? new Date(t.date).toISOString().split("T")[0] : "",
          deliveryDate: t.deliveryDate
            ? new Date(t.deliveryDate).toISOString().split("T")[0]
            : "",
          status: t.status,
          totalAmount: Number(t.totalAmount || 0).toFixed(2),
          outstandingAmount: Number(t.outstandingAmount || 0).toFixed(2),
          paidAmount: Number(t.paidAmount || 0).toFixed(2),
          items: enrichedItems,
          terms: t.terms || "",
          notes: t.notes || "",
          createdBy: t.createdBy || "System",
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          grnGenerated: t.grnGenerated || false,
          invoiceGenerated: t.invoiceGenerated || false,
          priority: t.priority || "Medium",
          creditNoteIssued: t.creditNoteIssued || false,
          quoteRef: t.quoteRef || null,
          linkedRef: t.linkedRef || null,
          // Add orderNumber as fallback to transactionNo for display purposes
          orderNumber: t.orderNumber || t.transactionNo,
        };
      });

      console.log("DEBUG: Enriched POs sample:", enrichedPOs[0]?.items?.[0]);  // TEMP: Check first item's code fields
      setPurchaseOrders(enrichedPOs);
    } catch (e) {
      addNotification(
        `Transactions load error: ${e.response?.data?.message || e.message}`,
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllForExport = async () => {
    try {
      // Fetch all purchase orders from database (excluding invoice statuses)
      const { data } = await axiosInstance.get("/transactions/transactions", {
        params: {
          type: "purchase_order",
          excludeStatus: "APPROVED,PAID,PARTIAL",
          limit: 10000, // Fetch up to 10000 records
        },
      });
      return data?.data || [];
    } catch (error) {
      console.error("Error fetching data for export:", error);
      addNotification("Failed to export data", "error");
      return [];
    }
  };

  const handleExportAll = async () => {
    addNotification("Preparing export...", "info");
    const allData = await fetchAllForExport();
    
    if (allData.length === 0) {
      addNotification("No data to export", "error");
      return;
    }

    const enrichedPOs = allData.map((t) => {
      const vendorObj = vendors.find((v) => v._id === t.partyId);
      const vendorName = vendorObj?.vendorName || t.partyName || "Unknown Vendor";

      const enrichedItems = (t.items || []).map((item) => {
        const stock = item.stockDetails || stockItems.find(s => String(s._id) === String(item.itemId)) || {};
        // FIX: Prefer stock master code (stock.itemId) over potentially stale item.itemCode; never use ObjectId as code
        const normalizedItemCode = stock.itemId || item.itemCode || item.sku || "-";

        return {
          itemId: item.itemId,
          itemCode: normalizedItemCode,
          description: item.description || "",
          qty: item.qty || 0,
          rate: item.rate || 0,
          lineTotal: item.lineTotal || 0,
          vatAmount: item.vatAmount || 0,
          vatPercent: item.vatPercent || 5,
          itemName: stock.itemName || "Unknown Item",
          sku: stock.sku || item.sku || item.itemId || normalizedItemCode,
          barcodeQrCode: stock.barcodeQrCode || "-",
          category: stock.category || "-",
          brand: stock.brand || "-",
          origin: stock.origin || "-",
          unitOfMeasure: stock.unitOfMeasureDetails?.unitName || stock.unitOfMeasure || "Unit",
          currentStock: stock.currentStock || 0,
          purchasePrice: stock.purchasePrice || 0,
          salesPrice: stock.salesPrice || 0,
          reorderLevel: stock.reorderLevel || 0,
          expiryDate: stock.expiryDate || null,
          batchNumber: stock.batchNumber || "-",
        };
      });

      return {
        id: t._id,
        transactionNo: t.transactionNo,
        vendorId: t.partyId,
        vendorName,
        vendorReference: t.vendorReference || "",
        refNo: t.vendorReference || t.refNo || "",
        date: t.date ? new Date(t.date).toISOString().split("T")[0] : "",
        deliveryDate: t.deliveryDate
          ? new Date(t.deliveryDate).toISOString().split("T")[0]
          : "",
        status: t.status,
        totalAmount: Number(t.totalAmount || 0).toFixed(2),
        outstandingAmount: Number(t.outstandingAmount || 0).toFixed(2),
        paidAmount: Number(t.paidAmount || 0).toFixed(2),
        items: enrichedItems,
        terms: t.terms || "",
        notes: t.notes || "",
        createdBy: t.createdBy || "System",
        orderNumber: t.orderNumber || t.transactionNo,
      };
    });

    exportPurchaseOrdersToExcel(enrichedPOs, "Purchase_Orders_All");
    addNotification("Purchase orders exported to Excel successfully", "success");
  };

  // Generate transaction number on create view
  useEffect(() => {
    if (activeView === "create") {
      generateTransactionNumber();
    }
  }, [activeView]);

  const generateTransactionNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const sequence = String(Math.floor(Math.random() * 9999) + 1).padStart(
      3,
      "0"
    );
    setFormData((prev) => ({
      ...prev,
      transactionNo: `PO${sequence}`,
    }));
  };

  const addNotification = (message, type = "info") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  // Handle successful PO save
  const handlePOSuccess = (newPO) => {
    setCreatedPO(newPO);
    setSelectedPO(newPO);
    setActiveView("invoice");
    addNotification(
      "Purchase Order saved successfully! Showing invoice...",
      "success"
    );
    // Scroll to top after React re-renders the invoice view
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 150);
    setTimeout(resetForm, 0);
  };

  // Statistics calculations — use normalizeTransactionStatus for case-insensitive matching
  const getStatistics = useMemo(
    () => () => {
      const total = purchaseOrders.length;
      const pending = purchaseOrders.filter(
        (po) => normalizeTransactionStatus(po.status) === TRANSACTION_STATUS.DRAFT
      ).length;
      const paid = purchaseOrders.filter(
        (po) => normalizeTransactionStatus(po.status) === TRANSACTION_STATUS.PAID
      ).length;
      const approved = purchaseOrders.filter(
        (po) => normalizeTransactionStatus(po.status) === TRANSACTION_STATUS.APPROVED
      ).length;
      const draft = purchaseOrders.filter(
        (po) => normalizeTransactionStatus(po.status) === TRANSACTION_STATUS.DRAFT
      ).length;
      const rejected = purchaseOrders.filter(
        (po) => normalizeTransactionStatus(po.status) === TRANSACTION_STATUS.REJECTED
      ).length;

      const totalValue = purchaseOrders.reduce(
        (sum, po) => sum + parseFloat(po.totalAmount),
        0
      );
      const approvedValue = purchaseOrders
        .filter((po) => normalizeTransactionStatus(po.status) === TRANSACTION_STATUS.APPROVED)
        .reduce((sum, po) => sum + parseFloat(po.totalAmount), 0);

      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      const thisMonthPOs = purchaseOrders.filter((po) => {
        const poDate = new Date(po.date);
        return (
          poDate.getMonth() === thisMonth && poDate.getFullYear() === thisYear
        );
      }).length;

      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
      const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
      const lastMonthPOs = purchaseOrders.filter((po) => {
        const poDate = new Date(po.date);
        return (
          poDate.getMonth() === lastMonth &&
          poDate.getFullYear() === lastMonthYear
        );
      }).length;

      const growthRate =
        lastMonthPOs === 0
          ? 0
          : ((thisMonthPOs - lastMonthPOs) / lastMonthPOs) * 100;

      return {
        total,
        pending,
        approved,
        draft,
        paid,
        rejected,
        totalValue,
        approvedValue,
        thisMonthPOs,
        growthRate,
      };
    },
    [purchaseOrders]
  );

  const statistics = getStatistics();

  // Filtering and sorting logic
  const filteredAndSortedPOs = useMemo(
    () => () => {
      let filtered = purchaseOrders.filter((po) => {
        const matchesSearch =
          po.transactionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          po.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          po.createdBy.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === "ALL" || po.status === statusFilter;
        const matchesVendor =
          vendorFilter === "ALL" || po.vendorId === vendorFilter;

        let matchesDate = true;
        if (dateFrom || dateTo) {
          const poDate = new Date(po.date);
          poDate.setHours(0, 0, 0, 0);
          if (dateFrom) {
            const from = new Date(dateFrom);
            from.setHours(0, 0, 0, 0);
            if (poDate < from) matchesDate = false;
          }
          if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            if (poDate > to) matchesDate = false;
          }
        }

        return matchesSearch && matchesStatus && matchesVendor && matchesDate;
      });

      filtered.sort((a, b) => {
        let aVal, bVal;

        switch (sortBy) {
          case "date":
            aVal = new Date(a.date);
            bVal = new Date(b.date);
            break;
          case "amount":
            aVal = parseFloat(a.totalAmount);
            bVal = parseFloat(b.totalAmount);
            break;
          case "vendor":
            aVal = a.vendorName;
            bVal = b.vendorName;
            break;
          case "status":
            aVal = a.status;
            bVal = b.status;
            break;
          default:
            aVal = a.transactionNo;
            bVal = b.transactionNo;
        }

        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });

      return filtered;
    },
    [
      purchaseOrders,
      searchTerm,
      statusFilter,
      vendorFilter,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
      vendors,  // ADD: Depend on vendors for enrichment
    ]
  );

  const filteredPOs = filteredAndSortedPOs();
  const totalPages = Math.ceil(filteredPOs.length / itemsPerPage);
  const paginatedPOs = filteredPOs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusColor = (status) => {
    return getTransactionStatusColor(status);
  };

  const getStatusIcon = (status) => {
    const normalized = normalizeTransactionStatus(status);
    switch (normalized) {
      case TRANSACTION_STATUS.DRAFT:
        return <Edit3 className="w-3 h-3" />;
      case TRANSACTION_STATUS.APPROVED:
        return <CheckCircle className="w-3 h-3" />;
      case TRANSACTION_STATUS.PAID:
        return <DollarSign className="w-3 h-3" />;
      case TRANSACTION_STATUS.PARTIAL:
        return <DollarSign className="w-3 h-3" />;
      case TRANSACTION_STATUS.REJECTED:
        return <XCircle className="w-3 h-3" />;
      case TRANSACTION_STATUS.CANCELLED:
        return <XCircle className="w-3 h-3" />;
      default:
        return <FileText className="w-3 h-3" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High":
        return "bg-red-500";
      case "Medium":
        return "bg-yellow-500";
      case "Low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const handleBulkAction = async (action) => {
    if (selectedPOs.length === 0) {
      addNotification(
        "Please select orders to perform bulk actions",
        "warning"
      );
      return;
    }

    try {
      if (action === "approve") {
        for (const poId of selectedPOs) {
          await axiosInstance.patch(
            `/transactions/transactions/${poId}/process`,
            {
              action: "approve",
            }
          );
        }
        addNotification(
          `${selectedPOs.length} orders approved successfully`,
          "success"
        );
        fetchTransactions();
        fetchStockItems();
      } else if (action === "delete") {
        if (window.confirm(`Delete ${selectedPOs.length} selected orders?`)) {
          for (const poId of selectedPOs) {
            await axiosInstance.patch(
              `/transactions/transactions/${poId}/process`,
              {
                action: "reject",
              }
            );
          }
          addNotification(`${selectedPOs.length} orders deleted`, "success");
          fetchTransactions();
        }
      } else if (action === "export") {
        const selectedOrders = purchaseOrders.filter((po) =>
          selectedPOs.includes(po._id)
        );
        exportPurchaseOrdersToExcel(selectedOrders, "Purchase_Orders_Selected");
        addNotification("Orders exported to Excel successfully", "success");
      }
      setSelectedPOs([]);
    } catch (error) {
      console.error("Bulk Action Error:", error);
      addNotification(
        "Bulk action failed: " +
          (error.response?.data?.message || error.message),
        "error"
      );
    }
  };

  // Notifications Component
  const NotificationList = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification, i) => (
        <div
          key={i}
          className={`px-4 py-3 rounded-lg shadow-lg max-w-sm backdrop-blur-sm ${
            notification.type === "success"
              ? "bg-emerald-500/90 text-white"
              : notification.type === "warning"
              ? "bg-amber-500/90 text-white"
              : notification.type === "error"
              ? "bg-rose-500/90 text-white"
              : "bg-blue-500/90 text-white"
          } animate-slide-in border border-white/20`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === "success" && (
              <CheckCircle className="w-4 h-4" />
            )}
            {notification.type === "warning" && (
              <AlertCircle className="w-4 h-4" />
            )}
            {notification.type === "error" && (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      ))}
    </div>
  );

  // Dashboard Component
  const Dashboard = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Orders</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{statistics.total}</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-slate-600" />
            </div>
          </div>
          <div className="flex items-center mt-3">
            {statistics.growthRate >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500 mr-1" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-500 mr-1" />
            )}
            <span className={`text-xs font-medium ${statistics.growthRate >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {Math.abs(statistics.growthRate).toFixed(1)}% vs last month
            </span>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pending</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{statistics.pending}</p>
            </div>
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Requires attention</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Value</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">AED {statistics.totalValue.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Approved: AED {statistics.approvedValue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">This Month</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{statistics.thisMonthPOs}</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Orders created this month</p>
        </div>
      </div>

      {/* Recent Orders + Quick Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Recent Purchase Orders</h3>
            <span className="text-xs text-slate-500">{purchaseOrders.length} total</span>
          </div>
          <div className="divide-y divide-slate-100">
            {purchaseOrders.slice(0, 5).map((po) => (
              <div
                key={po.id}
                onClick={() => { setSelectedPO(po); setActiveView("invoice"); }}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className={`w-1.5 h-8 rounded-full ${getPriorityColor(po.priority)}`}></div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{po.orderNumber || po.transactionNo}</p>
                    <p className="text-xs text-slate-500 truncate">{po.vendorName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 flex-shrink-0">
                  <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(po.status)}`}>
                    {getStatusIcon(po.status)}
                    <span className="ml-1">{po.status.replace("_", " ")}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-700 tabular-nums">AED {parseFloat(po.totalAmount).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {purchaseOrders.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No purchase orders yet</div>
            )}
          </div>
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <button onClick={() => setActiveView("list")} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All Orders &rarr;
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Status Breakdown</h3>
          </div>
          <div className="p-5 space-y-4">
            {[
              { label: "Approved", count: statistics.approved, color: "bg-emerald-500", bgColor: "bg-emerald-100", textColor: "text-emerald-600" },
              { label: "Pending", count: statistics.pending, color: "bg-amber-500", bgColor: "bg-amber-100", textColor: "text-amber-600" },
              { label: "Draft", count: statistics.draft, color: "bg-slate-400", bgColor: "bg-slate-100", textColor: "text-slate-600" },
              { label: "Rejected", count: statistics.rejected, color: "bg-rose-500", bgColor: "bg-rose-100", textColor: "text-rose-600" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-medium text-slate-600">{item.label}</span>
                  <span className={`text-xs font-semibold ${item.textColor}`}>{item.count}</span>
                </div>
                <div className={`h-1.5 ${item.bgColor} rounded-full overflow-hidden`}>
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${statistics.total > 0 ? (item.count / statistics.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Pagination Component
  const Pagination = () => {
    return (
      <PaginationControl
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredPOs.length}
        itemsPerPage={itemsPerPage}
        onPageChange={(page) => setCurrentPage(page)}
        onItemsPerPageChange={(newItemsPerPage) => {
          setItemsPerPage(newItemsPerPage);
          setCurrentPage(1);
        }}
        isLoading={isLoading}
      />
    );
  };

  const resetForm = useCallback(() => {
    setFormData({
      transactionNo: "",
      partyId: "",
      vendorReference: "",
      date: new Date().toISOString().slice(0, 10),
      deliveryDate: "",
      status: "DRAFT",
      items: [
        {
          itemId: "",
          description: "",
          qty: "",
          rate: "0.00",
          taxPercent: "5",
          purchasePrice: 0,
          currentPurchasePrice: 0,
          category: "",
          brand: "",
          origin: "",
          uom: "",
          total: "0.00",
          vatAmount: "0.00",
          grandTotal: "0.00",
          vatPercent: "5",
        },
      ],
      terms: "",
      notes: "",
      priority: "Medium",
      discount: "0.00",
      roundoff: "0.00",
    });
  }, []);

  const calculateTotals = (items) => {
    let subtotal = 0,
      tax = 0;
    items
      .filter((i) => i.itemId && i.qty && i.currentPurchasePrice)
      .forEach((i) => {
        const qty = Number(i.qty) || 0;
        const price = Number(i.currentPurchasePrice) || 0;
        const vat = Number(i.vatPercent) || 0;
        const line = qty * price;
        const lineTax = line * (vat / 100);
        subtotal += line;
        tax += lineTax;
      });
    return {
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: (subtotal + tax).toFixed(2),
    };
  };

  const editPO = (po) => {
    const edited = {
      transactionNo: po.transactionNo,
      partyId: po.vendorId,
      partyType: "Vendor",
      vendorReference: po.vendorReference,
      date: po.date,
      deliveryDate: po.deliveryDate,
      status: po.status,
      priority: po.priority,
      terms: po.terms,
      notes: po.notes,
      discount: (po.discount ?? 0).toString(),
      roundoff: (po.roundoff ?? 0).toString(),
      items: po.items.map((i) => {
        console.log("DEBUG: Editing item:", i);  // TEMP: Verify itemCode/sku
        const stock = stockItems.find(s => String(s._id) === String(i.itemId));
        return {
          itemId: i.itemId,
          itemCode: i.itemCode,  // FIX: Preserve for form display
          description: i.description,
          qty: String(i.qty),
          rate: String(i.rate),
          taxPercent: String(i.vatPercent),
          purchasePrice: i.purchasePrice,
          currentPurchasePrice: i.rate / i.qty || i.purchasePrice || 0,  // FIX: Better fallback
          category: i.category,
          brand: i.brand,
          origin: i.origin,
          uom: stock?.unitOfMeasure?.shortCode || stock?.unitOfMeasure?.unitName || "",
          total: String(i.rate),
          vatAmount: String(i.vatAmount),
          grandTotal: String(i.lineTotal),
          vatPercent: String(i.vatPercent),
          // Add enriched fields for dropdowns
          itemName: i.itemName,
          sku: i.sku || i.itemCode,  // FIX: Fallback to itemCode
        };
      }),
    };

    setFormData(edited);
    setSelectedPO(po);
    setActiveView("edit");
  };

  // Approve PO
  const approvePO = async (id) => {
    try {
      await axiosInstance.patch(`/transactions/transactions/${id}/process`, {
        action: "approve",
      });
      addNotification("Purchase Order approved successfully", "success");
      fetchTransactions();
      fetchStockItems();
    } catch (error) {
      console.error("Approve PO Error:", error);
      addNotification(
        "Failed to approve purchase order: " +
          (error.response?.data?.message || error.message),
        "error"
      );
    }
  };
// Update a single PO in local list state (used when approving from invoice view)
const updatePurchaseOrderStatus = (id, newStatus) => {
  setPurchaseOrders((prev) => {
    if (checkInvoiceStatus(newStatus)) {
      // remove invoice-status orders from main PO list (they belong to Approved/Purchase Entry list)
      return prev.filter((po) => po.id !== id && po._id !== id);
    }
    return prev.map((po) =>
      po.id === id || po._id === id
        ? { ...po, status: newStatus }
        : po
    );
  });
};
  // Reject PO
  const rejectPO = async (id) => {
    try {
      await axiosInstance.patch(`/transactions/transactions/${id}/process`, {
        action: "reject",
      });
      addNotification("Purchase Order rejected successfully", "success");
      fetchTransactions();
    } catch (error) {
      console.error("Reject PO Error:", error);
      addNotification(
        "Failed to reject purchase order: " +
          (error.response?.data?.message || error.message),
        "error"
      );
    }
  };

  // Delete PO
  const deletePO = async (id) => {
    if (
      window.confirm("Are you sure you want to delete this purchase order?")
    ) {
      try {
        await axiosInstance.patch(`/transactions/transactions/${id}/process`, {
          action: "reject",
        });
        addNotification("Purchase Order deleted successfully", "success");
        fetchTransactions();
      } catch (error) {
        console.error("Delete PO Error:", error);
        addNotification(
          "Failed to delete purchase order: " +
            (error.response?.data?.message || error.message),
          "error"
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <NotificationList />
      <div className="relative bg-white/80 backdrop-blur-xl shadow-xl border-b border-gray-200/50">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <ShoppingCart className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-slate-800">
                  Purchase Order Management
                </h1>
                <p className="text-slate-600 mt-1">
                  Manage your purchase orders efficiently
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  resetForm();
                  setSelectedPO(null);
                  setActiveView("create");
                  generateTransactionNumber();
                }}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span>Create New PO</span>
              </button>
              <button
                onClick={() => {
                  fetchVendors();
                  fetchStockItems();
                  fetchTransactions();
                }}
                className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                <RefreshCw className="w-5 h-5 text-slate-600" />
              </button>
              <button className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                <Settings className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>

        {(activeView === "dashboard" || activeView === "list") && (
          <div className="px-8 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by PO number, vendor, or user..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-80 pl-10 pr-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <select
                  value={vendorFilter}
                  onChange={(e) => {
                    setVendorFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ALL">All Vendors</option>
                  {vendors.map((vendor) => (
                    <option key={vendor._id} value={vendor._id}>
                      {vendor.vendorName}
                    </option>
                  ))}
                </select>

                <div className="flex items-center space-x-2">
                  <label className="text-sm text-slate-500 whitespace-nowrap">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <label className="text-sm text-slate-500 whitespace-nowrap">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  {(dateFrom || dateTo) && (
                    <button
                      onClick={() => { setDateFrom(""); setDateTo(""); setCurrentPage(1); }}
                      className="px-2 py-1 text-xs bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"
                      title="Clear date filter"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveView("dashboard")}
                  className={`p-3 rounded-xl transition-colors ${
                    activeView === "dashboard"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-3 rounded-xl transition-colors ${
                    viewMode === "table"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-3 rounded-xl transition-colors ${
                    viewMode === "grid"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    if (dateFrom || dateTo) {
                      const filtered = filteredAndSortedPOs();
                      if (filtered.length === 0) {
                        addNotification("No data to export", "error");
                        return;
                      }
                      exportPurchaseOrdersToExcel(filtered, `Purchase_Orders_${dateFrom || "start"}_to_${dateTo || "end"}`);
                      addNotification("Filtered purchase orders exported to Excel", "success");
                    } else {
                      handleExportAll();
                    }
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                  title={(dateFrom || dateTo) ? "Export filtered purchase orders" : "Export all purchase orders from database"}
                >
                  <FileDown className="w-4 h-4" />
                  <span>{(dateFrom || dateTo) ? "Export Filtered" : "Export All"}</span>
                </button>
                {selectedPOs.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleBulkAction("approve")}
                      className="flex items-center space-x-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>Approve Selected</span>
                    </button>
                    <button
                      onClick={() => handleBulkAction("delete")}
                      className="flex items-center space-x-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Selected</span>
                    </button>
                    <button
                      onClick={() => handleBulkAction("export")}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export Selected</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-8">
        {(vendorsFetching || stockFetching) && <RefetchIndicator />}
        {(vendorsLoading || stockLoading || isLoading) ? (
          <PageListSkeleton rows={6} />
        ) : (
          <>
            {activeView === "dashboard" && <Dashboard />}
            {activeView === "list" && (
              <>
                {viewMode === "table" ? (
                  <TableView
                    paginatedPOs={paginatedPOs}
                    selectedPOs={selectedPOs}
                    setSelectedPOs={setSelectedPOs}
                    getPriorityColor={getPriorityColor}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                    handleSort={handleSort}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    setSelectedPO={setSelectedPO}
                    setActiveView={setActiveView}
                    editPO={editPO}
                    approvePO={approvePO}
                    deletePO={deletePO}
                  />
                ) : (
                  <GridView
                    paginatedPOs={paginatedPOs}
                    selectedPOs={selectedPOs}
                    setSelectedPOs={setSelectedPOs}
                    getPriorityColor={getPriorityColor}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                    setSelectedPO={setSelectedPO}
                    setActiveView={setActiveView}
                    editPO={editPO}
                    approvePO={approvePO}
                    rejectPO={rejectPO}
                    deletePO={deletePO}
                  />
                )}
                {filteredPOs.length > 0 && <Pagination />}
              </>
            )}
            {(activeView === "create" || activeView === "edit") && (
              <POForm
                formData={formData}
                setFormData={setFormData}
                vendors={vendors}
                stockItems={stockItems}
                addNotification={addNotification}
                selectedPO={selectedPO}
                setSelectedPO={setSelectedPO}
                setActiveView={setActiveView}
                setPurchaseOrders={setPurchaseOrders}
                resetForm={resetForm}
                calculateTotals={calculateTotals}
                onPOSuccess={handlePOSuccess}
                activeView={activeView}
              />
            )}
            {activeView === "invoice" && (
              <InvoiceView
                selectedPO={selectedPO}
                vendors={vendors}
                calculateTotals={calculateTotals}
                setActiveView={setActiveView}
                createdPO={createdPO}
                setSelectedPO={setSelectedPO}
                setCreatedPO={setCreatedPO}
                addNotification={addNotification} 
                updatePurchaseOrderStatus={updatePurchaseOrderStatus} // NEW
              />
            )}
          </> 
        )}
      </div>
    </div>
  );
};

export default PurchaseOrderManagement;