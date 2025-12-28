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
import SOForm from "./SOForm";
import TableView from "./TableView";
import GridView from "./GridView";
import SaleInvoiceView from "./InvoiceView";
import { exportSalesOrdersToExcel } from "../../../utils/excelExport";
import PaginationControl from "../../Pagination/PaginationControl";

const SalesOrderManagement = () => {
  const [activeView, setActiveView] = useState("dashboard");
  const [viewMode, setViewMode] = useState("table");
  const [selectedSO, setSelectedSO] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [customerFilter, setCustomerFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [notifications, setNotifications] = useState([]);
  const [selectedSOs, setSelectedSOs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [createdSO, setCreatedSO] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    transactionNo: "",
    transactionNoMode: "AUTO",
    partyId: "",
    partyName: "",
    date: new Date().toISOString().slice(0, 10),
    deliveryDate: "",
    status: "DRAFT",
    priority: "Medium",
    terms: "",
    notes: "",
    refNo: "",
    docNo: "",
    discount: "0.00",
    items: [
      {
        _id: "",
        itemId: "",
        description: "",
        itemName: "",
        qty: "",
        rate: "0.00",
        salesPrice: "0.00",
        vatPercent: "5",
        vatAmount: "0.00",
        lineTotal: "0.00",
        category: "",
        unitOfMeasure: "",
        unitOfMeasureDetails: {},
        stockDetails: {},
      },
    ],
  });

  // Fetch data on mount
  useEffect(() => {
    fetchCustomers();
    fetchStockItems();
    fetchTransactions();
  }, []);

  // Debounce search term to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Refetch on filter change (using debounced search)
  useEffect(() => {
    fetchTransactions();
  }, [debouncedSearchTerm, statusFilter, customerFilter, dateFilter]);

  // Generate SO number on create
  useEffect(() => {
    if (activeView === "create") {
      generateTransactionNumber();
    }
  }, [activeView]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get("/customers/customers");
      setCustomers(response.data.data || []);
    } catch (error) {
      addNotification(
        "Failed to fetch customers: " +
          (error.response?.data?.message || error.message),
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStockItems = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get("/stock/stock");
      const stocks = response.data.data?.stocks || response.data.data || [];
      setStockItems(
        stocks.map((item) => ({
          _id: item._id,
          itemId: item.itemId,
          itemName: item.itemName,
          sku: item.sku,
          category: item.category,
          unitOfMeasure: item.unitOfMeasure,
          unitOfMeasureDetails: item.unitOfMeasureDetails || {},
          currentStock: item.currentStock,
          purchasePrice: item.purchasePrice,
          salesPrice: item.salesPrice,
          reorderLevel: item.reorderLevel,
          status: item.status,
          taxPercent: item.taxPercent || 5,
        }))
      );
    } catch (error) {
      addNotification(
        "Failed to fetch stock items: " +
          (error.response?.data?.message || error.message),
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get("/transactions/transactions", {
        params: {
          type: "sales_order",
          search: debouncedSearchTerm,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          partyId: customerFilter !== "ALL" ? customerFilter : undefined,
          dateFilter: dateFilter !== "ALL" ? dateFilter : undefined,
          limit: 1000, // Fetch up to 1000 records for display
        },
      });

      const transactions = response.data?.data || [];
      // Exclude APPROVED orders from the main Sales list unless user explicitly selects status=APPROVED
      const txs = statusFilter === "ALL" ? transactions.filter((t) => t.status !== "APPROVED") : transactions;
      // DEBUG: Log raw backend rows for LPO/DOC/Discount audit
      //console.log("[FETCH SO LIST] rows:", transactions.map(t => ({ id: t._id, lpono: t.lpono ?? t.refNo, docno: t.docno ?? t.docNo, discount: t.discount })));
      console.log("Transaction Fetch from backend "+transactions);
      // helper to format display number for APPROVED orders:
      // If SOYYYYMM-NNNNN pattern, show NNNNN; otherwise keep digits padded to 5
      const formatDisplayTransactionNo = (t) => {
        try {
          const tx = t.transactionNo || '';
          if (t.status === 'APPROVED' && tx) {
            const m = String(tx).match(/^SO\d{6}-(\d{5})$/i);
            if (m) return m[1];
            const digits = String(tx).replace(/\D/g, '');
            if (!digits) return tx;
            return digits.slice(-5).padStart(5, '0');
          }
          return tx;
        } catch (e) {
          return t.transactionNo;
        }
      };

        setSalesOrders(
      txs.map((t) => {
    const displayTransactionNo = formatDisplayTransactionNo(t);
    return {
      id: t._id,
      transactionNo: t.transactionNo,
      displayTransactionNo,
      customerId: t.partyId,
      customerName: t.party?.customerName || t.partyName,
      date: t.date,
      deliveryDate: t.deliveryDate,
      status: t.status,
      totalAmount: parseFloat(t.totalAmount).toFixed(2),
      items: t.items,
      terms: t.terms || "",
      notes: t.notes || "",
      createdBy: t.createdBy,
      createdAt: t.createdAt,
      invoiceGenerated: t.invoiceGenerated,
      priority: t.priority || "Medium",
      // Map backend fields for LPO, Doc No, and Discount to UI fields
      refNo: t.lpono ?? t.refNo ?? "",
      docNo: t.docno ?? t.docNo ?? "",
      discount: typeof t.discount === "number" ? t.discount : 0,
      // Add orderNumber as fallback to transactionNo for display purposes
      orderNumber: t.orderNumber || t.transactionNo,
    };
  })
);
    } catch (error) {
      addNotification(
        "Failed to fetch transactions: " +
          (error.response?.data?.message || error.message),
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllForExport = async () => {
    try {
      // Fetch all sales orders from database (no pagination limit)
      const response = await axiosInstance.get("/transactions/transactions", {
        params: {
          type: "sales_order",
          limit: 10000, // Fetch up to 10000 records
        },
      });
      return response.data?.data || [];
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

    const formatDisplayTransactionNo = (t) => {
      try {
        const tx = t.transactionNo || '';
        if (t.status === 'APPROVED' && tx) {
          const m = String(tx).match(/^SO\d{6}-(\d{5})$/i);
          if (m) return m[1];
          const digits = String(tx).replace(/\D/g, '');
          if (!digits) return tx;
          return digits.slice(-5).padStart(5, '0');
        }
        return tx;
      } catch (e) {
        return t.transactionNo;
      }
    };

    const formattedData = allData.map((t) => {
      const displayTransactionNo = formatDisplayTransactionNo(t);
      return {
        id: t._id,
        transactionNo: t.transactionNo,
        displayTransactionNo,
        customerId: t.partyId,
        customerName: t.party?.customerName || t.partyName,
        date: t.date,
        deliveryDate: t.deliveryDate,
        status: t.status,
        totalAmount: parseFloat(t.totalAmount).toFixed(2),
        items: t.items,
        terms: t.terms || "",
        notes: t.notes || "",
        createdBy: t.createdBy,
        createdAt: t.createdAt,
        invoiceGenerated: t.invoiceGenerated,
        priority: t.priority || "Medium",
        refNo: t.lpono ?? t.refNo ?? "",
        docNo: t.docno ?? t.docNo ?? "",
        discount: typeof t.discount === "number" ? t.discount : 0,
        orderNumber: t.orderNumber || t.transactionNo,
      };
    });

    exportSalesOrdersToExcel(formattedData, "Sales_Orders_All");
    addNotification("Sales orders exported to Excel successfully", "success");
  };

  const generateTransactionNumber = () => {
    const sequence = String(Math.floor(Math.random() * 999) + 1).padStart(
      3,
      "0"
    );
    setFormData((prev) => ({ ...prev, transactionNo: `SO${sequence}` }));
  };

  const addNotification = (message, type = "info") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setNotifications((prev) => prev.filter((n) => n.id !== id)),
      5000
    );
  };

  const handleSOSuccess = (newSO) => {
    setCreatedSO(newSO);
    setSelectedSO(newSO);
    setActiveView("invoice");
    addNotification(
      "Sales Order saved successfully! Showing invoice...",
      "success"
    );
    setTimeout(resetForm, 0);
  };

  const getStockItemById = useCallback(
    (itemId) => stockItems.find((s) => s._id === itemId),
    [stockItems]
  );

  // EDIT SO – FULLY WORKING
const editSO = (so) => {
  const formItems = (so.items || []).map((it) => {
    const stock = getStockItemById(it.itemId) || {};

    // parse numeric helpers
    const lineQty = parseFloat(it.qty) || 0;
    const lineRateRaw = parseFloat(it.rate) || 0; // backend 'rate' is line subtotal in your save flow
    const backendSalesPrice = it.salesPrice != null ? parseFloat(it.salesPrice) : null;
    const backendPrice = it.price != null ? parseFloat(it.price) : null; // sometimes backend uses `price` as per-unit
    // Determine per-unit sales price: prefer explicit salesPrice -> price -> rate/qty -> stock salesPrice
    const perUnitPrice =
      backendSalesPrice !== null
        ? backendSalesPrice
        : backendPrice !== null
        ? backendPrice
        : lineQty > 0
        ? lineRateRaw / lineQty
        : stock.salesPrice || 0;

    const purchasePrice =
      it.purchasePrice != null
        ? parseFloat(it.purchasePrice)
        : stock.purchasePrice || 0;

    const vatPct = it.vatPercent != null ? parseFloat(it.vatPercent) : (stock.taxPercent || 5);
    // lineTotal: prefer backend lineTotal/grandTotal -> use computed (perUnitPrice * qty) + VAT
    const lineSubtotal = lineQty * perUnitPrice;
    const vatAmount = it.vatAmount != null ? parseFloat(it.vatAmount) : lineSubtotal * (vatPct / 100);
    const lineTotal = it.lineTotal != null
      ? parseFloat(it.lineTotal)
      : it.grandTotal != null
      ? parseFloat(it.grandTotal)
      : lineSubtotal + vatAmount;

    return {
      _id: it._id || "",
      itemId: it.itemId,
      description: it.description || stock.itemName || "",
      itemName: stock.itemName || it.description || "",
      qty: lineQty ? lineQty.toString() : (it.qty ?? "").toString(),
      // IMPORTANT: set `rate` and `salesPrice` to per-unit price (string) — form expects per-unit
      rate: perUnitPrice.toString(),
      salesPrice: perUnitPrice.toString(),
      purchasePrice: purchasePrice.toString(),
      vatPercent: vatPct.toString(),
      vatAmount: vatAmount.toFixed(2).toString(),
      lineTotal: parseFloat(lineTotal).toFixed(2).toString(),
      category: stock.category || "",
      unitOfMeasure: stock.unitOfMeasure || "",
      unitOfMeasureDetails: stock.unitOfMeasureDetails || {},
      stockDetails: it.stockDetails || {},
      currentStock: typeof stock.currentStock === "number" ? stock.currentStock : 0,
    };
  });


    setFormData({
      transactionNo: so.transactionNo,
      partyId: so.customerId,
      partyName: so.customerName,
      date: new Date(so.date).toISOString().slice(0, 10),
      deliveryDate: so.deliveryDate
        ? new Date(so.deliveryDate).toISOString().slice(0, 10)
        : "",
      status: so.status,
      priority: so.priority || "Medium",
      terms: so.terms || "",
      notes: so.notes || "",
      refNo: so.refNo || "",
      docNo: so.docNo || "",
      discount: (so.discount ?? 0).toString(),
      items: formItems,
    });

    setSelectedSO(so);
    setActiveView("edit");
  };

  // CALCULATE TOTALS – MATCHES BACKEND
  const calculateTotals = (items) => {
    let subtotal = 0;
    let tax = 0;

    const validItems = items.filter(
      (i) => i.itemId && parseFloat(i.qty) > 0 && parseFloat(i.rate) > 0
    );

    validItems.forEach((i) => {
      const qty = parseFloat(i.qty) || 0;
      const price = parseFloat(i.rate) || 0;
      const vatPct = parseFloat(i.vatPercent) || 0;

      const lineSub = qty * price;
      const lineVat = lineSub * (vatPct / 100);
      const lineTot = lineSub + lineVat;

      subtotal += lineSub;
      tax += lineVat;

      i.lineTotal = lineTot.toFixed(2);
      i.vatAmount = lineVat.toFixed(2);
    });

    return {
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: (subtotal + tax).toFixed(2),
      validItems,
    };
  };

  // STATISTICS
  const getStatistics = useMemo(
    () => () => {
      const total = salesOrders.length;
      const draft = salesOrders.filter((so) => so.status === "DRAFT").length;
      const confirmed = salesOrders.filter(
        (so) => so.status === "APPROVED"
      ).length;
      const invoiced = salesOrders.filter(
        (so) => so.status === "INVOICED"
      ).length;

      const totalValue = salesOrders.reduce(
        (sum, so) => sum + parseFloat(so.totalAmount),
        0
      );
      const invoicedValue = salesOrders
        .filter((so) => so.status === "INVOICED")
        .reduce((sum, so) => sum + parseFloat(so.totalAmount), 0);

      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      const thisMonthSOs = salesOrders.filter((so) => {
        const soDate = new Date(so.date);
        return (
          soDate.getMonth() === thisMonth && soDate.getFullYear() === thisYear
        );
      }).length;

      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
      const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
      const lastMonthSOs = salesOrders.filter((so) => {
        const soDate = new Date(so.date);
        return (
          soDate.getMonth() === lastMonth &&
          soDate.getFullYear() === lastMonthYear
        );
      }).length;

      const growthRate =
        lastMonthSOs === 0
          ? 0
          : ((thisMonthSOs - lastMonthSOs) / lastMonthSOs) * 100;

      return {
        total,
        draft,
        confirmed,
        invoiced,
        totalValue,
        invoicedValue,
        thisMonthSOs,
        growthRate,
      };
    },
    [salesOrders]
  );

  const statistics = getStatistics();

  // FILTERING & SORTING
  const filteredAndSortedSOs = useMemo(
    () => () => {
      let filtered = salesOrders.filter((so) => {
        const txNo = String(so.transactionNo || "").toLowerCase();
        const custName = String(so.customerName || "").toLowerCase();
        const createdBy = String(so.createdBy || "").toLowerCase();
        const term = String(searchTerm || "").toLowerCase();
        const matchesSearch =
          txNo.includes(term) ||
          custName.includes(term) ||
          createdBy.includes(term);

        const matchesStatus =
          statusFilter === "ALL" || so.status === statusFilter;
        const matchesCustomer =
          customerFilter === "ALL" || so.customerId === customerFilter;

        let matchesDate = true;
        if (dateFilter !== "ALL") {
          const soDate = new Date(so.date);
          const today = new Date();
          switch (dateFilter) {
            case "TODAY":
              matchesDate = soDate.toDateString() === today.toDateString();
              break;
            case "WEEK":
              const weekAgo = new Date(
                today.getTime() - 7 * 24 * 60 * 60 * 1000
              );
              matchesDate = soDate >= weekAgo;
              break;
            case "MONTH":
              const monthAgo = new Date(
                today.getFullYear(),
                today.getMonth() - 1,
                today.getDate()
              );
              matchesDate = soDate >= monthAgo;
              break;
          }
        }
        return matchesSearch && matchesStatus && matchesCustomer && matchesDate;
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
          case "customer":
            aVal = a.customerName;
            bVal = b.customerName;
            break;
          case "status":
            aVal = a.status;
            bVal = b.status;
            break;
          default:
            aVal = a.transactionNo;
            bVal = b.transactionNo;
        }
        return sortOrder === "asc"
          ? aVal < bVal
            ? -1
            : 1
          : aVal > bVal
          ? -1
          : 1;
      });

      return filtered;
    },
    [
      salesOrders,
      searchTerm,
      statusFilter,
      customerFilter,
      dateFilter,
      sortBy,
      sortOrder,
    ]
  );

  const filteredSOs = filteredAndSortedSOs();
  const totalPages = Math.ceil(filteredSOs.length / itemsPerPage);
  const paginatedSOs = filteredSOs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "DRAFT":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "APPROVED":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "INVOICED":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "DRAFT":
        return <Edit3 className="w-3 h-3" />;
      case "APPROVED":
        return <CheckSquare className="w-3 h-3" />;
      case "INVOICED":
        return <Receipt className="w-3 h-3" />;
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

  // BULK ACTIONS – FIXED
  const handleBulkAction = async (action) => {
    if (selectedSOs.length === 0) {
      addNotification(
        "Please select orders to perform bulk actions",
        "warning"
      );
      return;
    }

    try {
      if (action === "confirm") {
        for (const soId of selectedSOs) {
          await axiosInstance.patch(
            `/transactions/transactions/${soId}/process`,
            { action: "approve" }
          );
        }
        addNotification(
          `${selectedSOs.length} orders approved successfully`,
          "success"
        );
      } else if (action === "delete") {
        if (window.confirm(`Delete ${selectedSOs.length} selected orders?`)) {
          for (const soId of selectedSOs) {
            await axiosInstance.patch(
              `/transactions/transactions/${soId}/process`,
              { action: "reject" }
            );
          }
          addNotification(`${selectedSOs.length} orders deleted`, "success");
        }
      } else if (action === "export") {
        const selectedOrders = salesOrders.filter((so) =>
          selectedSOs.includes(so._id)
        );
        exportSalesOrdersToExcel(selectedOrders, "Sales_Orders_Selected");
        addNotification("Orders exported to Excel successfully", "success");
      }
      setSelectedSOs([]);
      fetchTransactions();
    } catch (error) {
      addNotification(
        "Bulk action failed: " +
          (error.response?.data?.message || error.message),
        "error"
      );
    }
  };

  const resetForm = useCallback(() => {
    setFormData({
      transactionNo: "",
      partyId: "",
      partyName: "",
      date: new Date().toISOString().slice(0, 10),
      deliveryDate: "",
      status: "DRAFT",
      priority: "Medium",
      terms: "",
      notes: "",
      refNo: "",
      docNo: "",
      discount: "0.00",
      items: [
        {
          _id: "",
          itemId: "",
          description: "",
          itemName: "",
          qty: "",
          rate: "0.00",
          salesPrice: "0.00",
          vatPercent: "5",
          vatAmount: "0.00",
          lineTotal: "0.00",
          category: "",
          unitOfMeasure: "",
          unitOfMeasureDetails: {},
          stockDetails: {},
        },
      ],
    });
    setFormErrors({});
  }, []);

  const confirmSO = async (id) => {
    try {
      // Soft stock validation: warn for items exceeding stock but do not block approval
      const so = salesOrders.find((s) => s.id === id);
      if (so && Array.isArray(so.items)) {
        so.items.forEach((it) => {
          const stock = stockItems.find((s) => String(s._id) === String(it.itemId));
          const qty = parseFloat(it.qty) || 0;
          if (stock && typeof stock.currentStock === 'number' && qty > stock.currentStock) {
            addNotification(`Insufficient stock for ${stock.itemName} (available ${stock.currentStock})`, 'warning');
          }
        });
      }

      await axiosInstance.patch(`/transactions/transactions/${id}/process`, {
        action: "approve",
      });
      addNotification("Sales Order approved successfully", "success");
      fetchTransactions();
    } catch (error) {
      addNotification(
        "Failed to approve: " +
          (error.response?.data?.message || error.message),
        "error"
      );
    }
  };
// Update a single SO in local list state (used when approving from invoice view)
const updateSalesOrderStatus = (id, newStatus) => {
  setSalesOrders((prev) => {
    if (newStatus === "APPROVED") {
      return prev.filter((so) => so.id !== id && so._id !== id);
    }
    return prev.map((so) =>
      so.id === id || so._id === id
        ? { ...so, status: newStatus, approvedAt: new Date().toISOString() }
        : so
    );
  });
};
  // Generate invoice PDF for a given SO and copy type from the list views
  const downloadInvoiceCopy = async (so, copyType) => {
    try {
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '210mm';
      container.style.height = '297mm';
      container.id = 'print-root';
      document.body.appendChild(container);

      const root = document.createElement('div');
      root.id = 'invoice-content';
      container.appendChild(root);

      // Render minimal invoice HTML using current InvoiceView approach is heavy; instead snapshot current page content area
      // We mimic InvoiceView by navigating data into a temporary node
      const el = document.createElement('div');
      el.innerHTML = document.querySelector('#invoice-content')?.outerHTML || '';

      // Fallback: if no invoice-content in DOM, inform user
      if (!el.innerHTML) {
        // Dynamically import html2canvas/jsPDF and build from a lightweight template using SO data
        const html2canvas = (await import('html2canvas')).default;
        const { jsPDF } = await import('jspdf');

        const temp = document.createElement('div');
        temp.style.width = '210mm';
        temp.style.padding = '10mm';
        temp.style.background = '#fff';
        temp.style.fontFamily = 'Arial,Helvetica,sans-serif';
        temp.id = 'invoice-content';
        temp.innerHTML = `<div id="copy-label" style="text-align:right;font-weight:bold;margin-bottom:9px">${copyType}</div>
          <div style="text-align:center;font-weight:800;margin-bottom:8px">${so.displayTransactionNo || so.transactionNo}</div>`;
        container.innerHTML = '';
        container.appendChild(temp);

        const canvas = await html2canvas(temp, { scale: 2.5, useCORS: true, backgroundColor: '#fff' });
        const img = canvas.toDataURL('image/jpeg', 0.92);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfW = 210, pdfH = 297;
        const ratio = Math.min(pdfW / canvas.width, pdfH / canvas.height);
        const w = canvas.width * ratio, h = canvas.height * ratio;
        pdf.addImage(img, 'JPEG', (pdfW - w) / 2, (pdfH - h) / 2, w, h, undefined, 'FAST');
        const fname = `${so.status === 'APPROVED' ? 'INV' : 'SO'}_${(so.displayTransactionNo || so.transactionNo)}_${copyType.replace(/\s+/g, '_')}.pdf`;
        pdf.save(fname);
        document.body.removeChild(container);
        return;
      }

      // If an invoice-content exists in DOM, use it directly
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const copyLabel = document.getElementById('copy-label');
      if (copyLabel) copyLabel.innerText = copyType;
      await new Promise(r => setTimeout(r, 80));
      const node = document.getElementById('invoice-content');
      const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: '#fff' });
      const img = canvas.toDataURL('image/jpeg', 0.8);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = 210, pdfH = 297;
      const ratio = Math.min(pdfW / canvas.width, pdfH / canvas.height);
      const w = canvas.width * ratio, h = canvas.height * ratio;
      pdf.addImage(img, 'PNG', (pdfW - w) / 2, (pdfH - h) / 2, w, h);
      const fname = `${so.status === 'APPROVED' ? 'INV' : 'SO'}_${(so.displayTransactionNo || so.transactionNo)}_${copyType.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fname);
      if (copyLabel) copyLabel.innerText = 'Customer Copy';
      document.body.removeChild(container);
    } catch (e) {
      addNotification('Failed to generate PDF', 'error');
    }
  };

  const deleteSO = async (id) => {
    if (window.confirm("Delete this sales order?")) {
      try {
        await axiosInstance.patch(`/transactions/transactions/${id}/process`, {
          action: "reject",
        });
        addNotification("Sales Order deleted", "success");
        fetchTransactions();
      } catch (error) {
        addNotification(
          "Failed to delete: " +
            (error.response?.data?.message || error.message),
          "error"
        );
      }
    }
  };

  // COMPONENTS
  const NotificationList = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`px-4 py-3 rounded-lg shadow-lg max-w-sm backdrop-blur-sm ${
            n.type === "success"
              ? "bg-emerald-500/90 text-white"
              : n.type === "warning"
              ? "bg-amber-500/90 text-white"
              : n.type === "error"
              ? "bg-rose-500/90 text-white"
              : "bg-blue-500/90 text-white"
          } animate-slide-in border border-white/20`}
        >
          <div className="flex items-center space-x-2">
            {n.type === "success" && <CheckCircle className="w-4 h-4" />}
            {n.type === "warning" && <AlertCircle className="w-4 h-4" />}
            {n.type === "error" && <AlertCircle className="w-4 h-4" />}
            <span className="text-sm font-medium">{n.message}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const Dashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Orders</p>
              <p className="text-3xl font-bold text-slate-900">
                {statistics.total}
              </p>
              <div className="flex items-center mt-2">
                {statistics.growthRate >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-500 mr-1" />
                )}
                <span
                  className={`text-sm font-medium ${
                    statistics.growthRate >= 0
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}
                >
                  {Math.abs(statistics.growthRate).toFixed(1)}% from last month
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Approved</p>
              <p className="text-3xl font-bold text-blue-600">
                {statistics.confirmed}
              </p>
              <p className="text-sm text-slate-500 mt-2">Ready for dispatch</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Value</p>
              <p className="text-3xl font-bold text-emerald-600">
                AED {statistics.totalValue.toLocaleString()}
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Invoiced: AED {statistics.invoicedValue.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">This Month</p>
              <p className="text-3xl font-bold text-indigo-600">
                {statistics.thisMonthSOs}
              </p>
              <p className="text-sm text-slate-500 mt-2">New orders created</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Recent Sales Orders
          </h3>
          <div className="space-y-3">
            {salesOrders.slice(0, 5).map((so) => (
              <div
                key={so.id}
                className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-2 h-2 rounded-full ${getPriorityColor(
                      so.priority
                    )}`}
                  ></div>
                  <div>
                    <p className="font-medium text-slate-900">
                     {so.displayTransactionNo || so.transactionNo}
                    </p>

                    <p className="text-sm text-slate-600">{so.customerName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      so.status
                    )}`}
                  >
                    {getStatusIcon(so.status)}
                    <span className="ml-1">{so.status}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    AED {parseFloat(so.totalAmount).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setActiveView("list")}
            className="w-full mt-4 py-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            View All Orders
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Status Overview
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-slate-700">Approved</span>
                <span className="text-xs font-medium text-blue-600">
                  {statistics.confirmed}
                </span>
              </div>
              <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500 ease-out"
                  style={{
                    width: `${
                      (statistics.confirmed / statistics.total) * 100 || 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-slate-700">Invoiced</span>
                <span className="text-xs font-medium text-purple-600">
                  {statistics.invoiced}
                </span>
              </div>
              <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-500 ease-out"
                  style={{
                    width: `${
                      (statistics.invoiced / statistics.total) * 100 || 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-slate-700">Draft</span>
                <span className="text-xs font-medium text-slate-600">
                  {statistics.draft}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-400 transition-all duration-500 ease-out"
                  style={{
                    width: `${
                      (statistics.draft / statistics.total) * 100 || 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const Pagination = () => {
    return (
      <PaginationControl
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredSOs.length}
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
                  Sales Order Management
                </h1>
                <p className="text-slate-600 mt-1">
                  Manage your sales orders efficiently
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  resetForm();
                  setSelectedSO(null);
                  setActiveView("create");
                  generateTransactionNumber();
                }}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span>Create New SO</span>
              </button>
              <button
                onClick={() => {
                  fetchCustomers();
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
                    placeholder="Search by SO number, customer, or user..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-80 pl-10 pr-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="APPROVED">Approved</option>
                  <option value="INVOICED">Invoiced</option>
                </select>
                <select
                  value={customerFilter}
                  onChange={(e) => {
                    setCustomerFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Customers</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.customerName}
                    </option>
                  ))}
                </select>
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Dates</option>
                  <option value="TODAY">Today</option>
                  <option value="WEEK">This Week</option>
                  <option value="MONTH">This Month</option>
                </select>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveView("dashboard")}
                  className={`p-3 rounded-xl ${
                    activeView === "dashboard"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-3 rounded-xl ${
                    viewMode === "table"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-3 rounded-xl ${
                    viewMode === "grid"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={handleExportAll}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                  title="Export all sales orders from database"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Export All</span>
                </button>
                {selectedSOs.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleBulkAction("confirm")}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleBulkAction("delete")}
                      className="flex items-center space-x-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                    <button
                      onClick={() => handleBulkAction("export")}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
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
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {activeView === "dashboard" && <Dashboard />}
            {activeView === "list" && (
              <>
                {viewMode === "table" ? (
                  <TableView
                    paginatedSOs={paginatedSOs}
                    selectedSOs={selectedSOs}
                    setSelectedSOs={setSelectedSOs}
                    getPriorityColor={getPriorityColor}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                    handleSort={handleSort}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    setSelectedSO={setSelectedSO}
                    setActiveView={setActiveView}
                    editSO={editSO}
                    confirmSO={confirmSO}
                    deleteSO={deleteSO}
                    onDownloadInternal={(so) => downloadInvoiceCopy(so, 'Internal Copy')}
                    onDownloadCustomer={(so) => downloadInvoiceCopy(so, 'Customer Copy')}
                  />
                ) : (
                  <GridView
                    paginatedSOs={paginatedSOs}
                    selectedSOs={selectedSOs}
                    setSelectedSOs={setSelectedSOs}
                    getPriorityColor={getPriorityColor}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                    setSelectedSO={setSelectedSO}
                    setActiveView={setActiveView}
                    editSO={editSO}
                    confirmSO={confirmSO}
                    deleteSO={deleteSO}
                    onDownloadInternal={(so) => downloadInvoiceCopy(so, 'Internal Copy')}
                    onDownloadCustomer={(so) => downloadInvoiceCopy(so, 'Customer Copy')}
                  />
                )}
                {filteredSOs.length > 0 && <Pagination />}
              </>
            )}
            {(activeView === "create" || activeView === "edit") && (
              <SOForm
                formData={formData}
                setFormData={setFormData}
                customers={customers}
                stockItems={stockItems}
                addNotification={addNotification}
                selectedSO={selectedSO}
                setSelectedSO={setSelectedSO}
                setActiveView={setActiveView}
                setSalesOrders={setSalesOrders}
                resetForm={resetForm}
                calculateTotals={calculateTotals}
                onSOSuccess={handleSOSuccess}
                activeView={activeView}
                formErrors={formErrors}
                setFormErrors={setFormErrors}
              />
            )}
            {activeView === "invoice" && (
              <SaleInvoiceView
                selectedSO={selectedSO}
                customers={customers}
                calculateTotals={calculateTotals}
                setActiveView={setActiveView}
                createdSO={createdSO}
                setSelectedSO={setSelectedSO}
                setCreatedSO={setCreatedSO}
                addNotification={addNotification} // NEW
                 updateSalesOrderStatus={updateSalesOrderStatus} // NEW
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SalesOrderManagement;
