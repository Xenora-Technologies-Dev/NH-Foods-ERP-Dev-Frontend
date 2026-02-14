import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  Package,
  Building,
  Calendar,
  Hash,
  Plus,
  Eye,
  CheckCircle,
  ArrowLeft,
  Truck,
  AlertCircle,
  Search,
  Filter,
  FileText,
  X,
  Clock,
  CheckSquare,
  XCircle,
  Download,
  Grid,
  List,
  RefreshCw,
  TrendingUp,
  Archive,
  FileDown,
  ClipboardCheck,
  ArrowRightCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import Select from "react-select";
import axiosInstance from "../../../axios/axios";
import GRNForm from "./GRNForm";
import DirectGRNForm from "./DirectGRNForm";
import TableView from "./TableView";
import GridView from "./GridView";
import GRNView from "./GRNView";
import PaginationControl from "../../Pagination/PaginationControl";
import { useVendorList, useStockList } from "../../../hooks/useDataFetching";
import { PageListSkeleton, RefetchIndicator } from "../../ui/Skeletons";

const GRNManagement = () => {
  const [activeView, setActiveView] = useState("dashboard");
  const [viewMode, setViewMode] = useState("table");
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [vendorFilter, setVendorFilter] = useState("ALL");
  const [entryModeFilter, setEntryModeFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [notifications, setNotifications] = useState([]);
  // Toggle for direct GRN mode (without PO)
  const [directMode, setDirectMode] = useState(false);
  // Active tab for dashboard: "to_convert" | "converted" | "cancelled"
  const [activeTab, setActiveTab] = useState("to_convert");
  // Vendor-first PO selection flow
  const [selectedVendorForPO, setSelectedVendorForPO] = useState(null);
  // ── Cached data via React Query (shared across all pages) ──
  const { data: vendorData, isLoading: vendorsLoading, isFetching: vendorsFetching } = useVendorList();
  const { data: stockData, isLoading: stockLoading, isFetching: stockFetching } = useStockList();
  const vendors = useMemo(() => vendorData?.items || [], [vendorData]);
  const stockItems = useMemo(() => stockData?.items || [], [stockData]);

  const [grns, setGRNs] = useState([]);
  const [pendingPOs, setPendingPOs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [createdGRN, setCreatedGRN] = useState(null);
  const [poSearchTerm, setPoSearchTerm] = useState("");
  const [poDateFilter, setPoDateFilter] = useState("ALL");
  const [stats, setStats] = useState({
    draft: 0,
    received: 0,
    converted: 0,
    cancelled: 0,
    totalAmount: 0,
  });

  // Initial load - fetch stats and GRNs (vendors & stock from React Query cache)
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        const statsRes = await axiosInstance.get("/grn/stats");
        setStats(statsRes.data?.data || {});
      } catch (e) {
        addNotification(`Data load error: ${e.response?.data?.message || e.message}`, "error");
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeData();
    fetchGRNs();
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Refresh list when filters change
  useEffect(() => {
    fetchGRNs();
  }, [debouncedSearchTerm, statusFilter, vendorFilter, dateFilter, entryModeFilter]);

  // Vendors and stock items are now provided by React Query hooks above

  const fetchGRNs = async () => {
    setIsLoading(true);
    try {
      const params = {
        search: debouncedSearchTerm || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        vendorId: vendorFilter !== "ALL" ? vendorFilter : undefined,
        dateFilter: dateFilter !== "ALL" ? dateFilter : undefined,
        entryMode: entryModeFilter !== "ALL" ? entryModeFilter : undefined,
        limit: 1000,
      };
      const { data } = await axiosInstance.get("/grn", { params });
      setGRNs(data.data || []);
    } catch (e) {
      addNotification(`GRN load error: ${e.response?.data?.message || e.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await axiosInstance.get("/grn/stats");
      setStats(data.data || {});
    } catch (e) {
      console.error("Stats load error:", e);
    }
  };

  const fetchPendingPOs = async (vendorId) => {
    setIsLoading(true);
    try {
      const params = {};
      if (vendorId) params.vendorId = vendorId;
      const { data } = await axiosInstance.get("/grn/pending-pos", { params });
      setPendingPOs(data.data || []);
    } catch (e) {
      addNotification(`Pending POs load error: ${e.response?.data?.message || e.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPOForGRN = async (poId) => {
    setIsLoading(true);
    try {
      const { data } = await axiosInstance.get(`/grn/po/${poId}`);
      setSelectedPO(data.data);
      setActiveView("create");
    } catch (e) {
      addNotification(`PO load error: ${e.response?.data?.message || e.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const addNotification = useCallback((message, type = "info") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  const handleCreateGRN = async (grnData) => {
    setIsLoading(true);
    try {
      const { data } = await axiosInstance.post("/grn", grnData);
      addNotification("GRN created successfully!", "success");
      setCreatedGRN(data.data);
      setActiveView("view");
      fetchGRNs();
      fetchStats();
      return data.data;
    } catch (e) {
      addNotification(`Create GRN error: ${e.response?.data?.message || e.message}`, "error");
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertToPurchase = async (grnId) => {
    if (isLoading) return; // Prevent double-click
    setIsLoading(true);
    try {
      const { data } = await axiosInstance.patch(`/grn/${grnId}/convert`);
      addNotification("GRN converted to Purchase Entry successfully!", "success");
      setSelectedGRN(data.data);
      setCreatedGRN(data.data);
      fetchGRNs();
      fetchStats();
    } catch (e) {
      addNotification(`Convert error: ${e.response?.data?.message || e.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDirectGRN = async (grnData) => {
    setIsLoading(true);
    try {
      const { data } = await axiosInstance.post("/grn/direct", grnData);
      addNotification("Direct GRN created successfully!", "success");
      setCreatedGRN(data.data);
      setActiveView("view");
      fetchGRNs();
      fetchStats();
      return data.data;
    } catch (e) {
      addNotification(`Create Direct GRN error: ${e.response?.data?.message || e.message}`, "error");
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertGRNToPO = async (grnId) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const { data } = await axiosInstance.patch(`/grn/${grnId}/convert-to-po`);
      addNotification(
        `Direct GRN converted to PO ${data.data?.purchaseOrder?.transactionNo || ""} successfully!`,
        "success"
      );
      setSelectedGRN(data.data?.grn || data.data);
      setCreatedGRN(data.data?.grn || data.data);
      fetchGRNs();
      fetchStats();
    } catch (e) {
      addNotification(`Convert to PO error: ${e.response?.data?.message || e.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelGRN = async (grnId) => {
    if (!window.confirm("Are you sure you want to cancel this GRN?")) return;
    
    setIsLoading(true);
    try {
      await axiosInstance.patch(`/grn/${grnId}/cancel`);
      addNotification("GRN cancelled successfully!", "success");
      fetchGRNs();
      fetchStats();
      setActiveView("list");
    } catch (e) {
      addNotification(`Cancel error: ${e.response?.data?.message || e.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGRN = async (grnId) => {
    if (!window.confirm("Are you sure you want to delete this GRN?")) return;
    
    setIsLoading(true);
    try {
      await axiosInstance.delete(`/grn/${grnId}`);
      addNotification("GRN deleted successfully!", "success");
      fetchGRNs();
      fetchStats();
    } catch (e) {
      addNotification(`Delete error: ${e.response?.data?.message || e.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and paginate GRNs based on active tab
  const filteredGRNs = useMemo(() => {
    const tabStatusMap = {
      to_convert: "RECEIVED",
      converted: "CONVERTED",
      cancelled: "CANCELLED",
    };
    const tabStatus = tabStatusMap[activeTab];
    return grns.filter((grn) => grn.status === tabStatus);
  }, [grns, activeTab]);

  // Filter pending POs for selection (vendor already filtered via API call)
  const filteredPendingPOs = useMemo(() => {
    return pendingPOs.filter((po) => {
      // Search filter - search by PO number
      const matchesSearch = !poSearchTerm || 
        (po.transactionNo || po.orderNumber || "").toLowerCase().includes(poSearchTerm.toLowerCase());

      // Date filter
      let matchesDate = true;
      if (poDateFilter !== "ALL" && po.date) {
        const poDate = new Date(po.date);
        const today = new Date();
        switch (poDateFilter) {
          case "TODAY":
            matchesDate = poDate.toDateString() === today.toDateString();
            break;
          case "WEEK":
            matchesDate = poDate >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "MONTH":
            matchesDate = poDate >= new Date(today.getFullYear(), today.getMonth(), 1);
            break;
        }
      }

      return matchesSearch && matchesDate;
    });
  }, [pendingPOs, poSearchTerm, poDateFilter]);

  const paginatedGRNs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGRNs.slice(start, start + itemsPerPage);
  }, [filteredGRNs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredGRNs.length / itemsPerPage);

  // Stats cards
  const statsCards = [
    {
      title: "Received",
      count: stats.received || 0,
      icon: <ClipboardCheck className="w-6 h-6 text-blue-600" />,
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
    },
    {
      title: "Pending Conversion",
      count: stats.received || 0,
      icon: <Clock className="w-6 h-6 text-yellow-600" />,
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-600",
    },
    {
      title: "Converted",
      count: stats.converted || 0,
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      bgColor: "bg-green-50",
      textColor: "text-green-600",
    },
    {
      title: "Cancelled",
      count: stats.cancelled || 0,
      icon: <XCircle className="w-6 h-6 text-red-600" />,
      bgColor: "bg-red-50",
      textColor: "text-red-600",
    },
  ];

  // Render notifications
  const renderNotifications = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in ${
            n.type === "success"
              ? "bg-green-500 text-white"
              : n.type === "error"
              ? "bg-red-500 text-white"
              : "bg-blue-500 text-white"
          }`}
        >
          {n.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : n.type === "error" ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{n.message}</span>
          <button
            onClick={() => setNotifications((prev) => prev.filter((x) => x.id !== n.id))}
            className="ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );

  // Render dashboard
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goods Received Notes</h1>
          <p className="text-gray-500 mt-1">
            Manage goods received against purchase orders or directly from vendors
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setDirectMode(false);
              setSelectedVendorForPO(null);
              setPendingPOs([]);
              setActiveView("select-po");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            GRN from PO
          </button>
          <button
            onClick={() => {
              setDirectMode(true);
              setActiveView("create-direct");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            <Package className="w-5 h-5" />
            Direct GRN
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <div
            key={index}
            className={`${stat.bgColor} rounded-xl p-5 border transition-all duration-300 hover:shadow-md`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-white/60 rounded-lg">{stat.icon}</div>
            </div>
            <h3 className={`text-sm font-medium ${stat.textColor}`}>{stat.title}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="flex border-b">
          <button
            onClick={() => { setActiveTab("to_convert"); setCurrentPage(1); }}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "to_convert"
                ? "border-blue-600 text-blue-600 bg-blue-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            To Be Converted
            <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
              activeTab === "to_convert" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
            }`}>
              {stats.received || 0}
            </span>
          </button>
          <button
            onClick={() => { setActiveTab("converted"); setCurrentPage(1); }}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "converted"
                ? "border-green-600 text-green-600 bg-green-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Converted
            <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
              activeTab === "converted" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
            }`}>
              {stats.converted || 0}
            </span>
          </button>
          <button
            onClick={() => { setActiveTab("cancelled"); setCurrentPage(1); }}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "cancelled"
                ? "border-red-600 text-red-600 bg-red-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <XCircle className="w-4 h-4" />
            Cancelled
            <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
              activeTab === "cancelled" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
            }`}>
              {stats.cancelled || 0}
            </span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search GRN number, PO number, vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Vendors</option>
            {vendors.map((v) => (
              <option key={v._id} value={v._id}>
                {v.vendorName}
              </option>
            ))}
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="WEEK">This Week</option>
            <option value="MONTH">This Month</option>
          </select>
          <select
            value={entryModeFilter}
            onChange={(e) => setEntryModeFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Modes</option>
            <option value="with_po">With PO</option>
            <option value="direct">Direct (No PO)</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg ${
                viewMode === "table" ? "bg-blue-100 text-blue-600" : "bg-gray-100"
              }`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg ${
                viewMode === "grid" ? "bg-blue-100 text-blue-600" : "bg-gray-100"
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                fetchGRNs();
                fetchStats();
              }}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* GRN List */}
      <div className="bg-white rounded-xl shadow-sm border">
        {(vendorsFetching || stockFetching) && <RefetchIndicator />}
        {(vendorsLoading || stockLoading || isLoading) ? (
          <PageListSkeleton rows={5} />
        ) : filteredGRNs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Package className="w-12 h-12 mb-3 opacity-50" />
            <p>No GRNs found in this tab</p>
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => {
                  setDirectMode(false);
                  setSelectedVendorForPO(null);
                  setPendingPOs([]);
                  setActiveView("select-po");
                }}
                className="text-blue-600 hover:underline"
              >
                Create GRN from PO
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => {
                  setDirectMode(true);
                  setActiveView("create-direct");
                }}
                className="text-orange-600 hover:underline"
              >
                Create Direct GRN
              </button>
            </div>
          </div>
        ) : viewMode === "table" ? (
          <TableView
            grns={paginatedGRNs}
            onView={(grn) => {
              setSelectedGRN(grn);
              setActiveView("view");
            }}
            onConvert={handleConvertToPurchase}
            onCancel={handleCancelGRN}
            onDelete={handleDeleteGRN}
          />
        ) : (
          <GridView
            grns={paginatedGRNs}
            onView={(grn) => {
              setSelectedGRN(grn);
              setActiveView("view");
            }}
            onConvert={handleConvertToPurchase}
            onCancel={handleCancelGRN}
          />
        )}

        {/* Pagination */}
        {filteredGRNs.length > 0 && (
          <div className="p-4 border-t">
            <PaginationControl
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredGRNs.length}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </div>
        )}
      </div>
    </div>
  );

  // Render PO selection for GRN — Vendor-first flow
  const renderPOSelection = () => {
    const vendorOptions = vendors.map((v) => ({
      value: v._id,
      label: v.vendorName,
    }));

    const handleVendorSelect = (option) => {
      setSelectedVendorForPO(option);
      setPoSearchTerm("");
      setPoDateFilter("ALL");
      if (option) {
        fetchPendingPOs(option.value);
      } else {
        setPendingPOs([]);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setSelectedVendorForPO(null);
              setPendingPOs([]);
              setActiveView("dashboard");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">GRN from Purchase Order</h1>
            <p className="text-gray-500">
              {selectedVendorForPO
                ? `Showing POs for ${selectedVendorForPO.label}`
                : "Select a vendor to view their pending Purchase Orders"}
            </p>
          </div>
          {/* Direct GRN Toggle Switch */}
          <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm border px-4 py-3">
            <span className={`text-sm font-medium ${!directMode ? "text-blue-600" : "text-gray-400"}`}>
              With PO
            </span>
            <button
              onClick={() => {
                setDirectMode(true);
                setSelectedVendorForPO(null);
                setPendingPOs([]);
                setActiveView("create-direct");
              }}
              className="relative inline-flex h-7 w-14 items-center rounded-full transition-colors bg-gray-300 hover:bg-orange-300"
              title="Switch to Direct GRN (without PO)"
            >
              <span className="inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform translate-x-1" />
            </button>
            <span className="text-sm font-medium text-gray-400">
              Direct
            </span>
          </div>
        </div>

        {/* Step 1: Vendor Selection */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">1</div>
            <h2 className="text-lg font-semibold text-gray-900">Choose Vendor</h2>
          </div>
          <Select
            value={selectedVendorForPO}
            onChange={handleVendorSelect}
            options={vendorOptions}
            placeholder="Search and select a vendor..."
            isClearable
            isSearchable
            className="max-w-lg"
            styles={{
              control: (base) => ({
                ...base,
                borderColor: "#d1d5db",
                "&:hover": { borderColor: "#3b82f6" },
                boxShadow: "none",
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isSelected ? "#3b82f6" : state.isFocused ? "#eff6ff" : "white",
              }),
            }}
          />
        </div>

        {/* Step 2: PO List (shown only after vendor selection) */}
        {selectedVendorForPO && (
          <>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">2</div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Select Purchase Order
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({filteredPendingPOs.length} pending)
                  </span>
                </h2>
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by PO number..."
                    value={poSearchTerm}
                    onChange={(e) => setPoSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={poDateFilter}
                  onChange={(e) => setPoDateFilter(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="WEEK">This Week</option>
                  <option value="MONTH">This Month</option>
                </select>
                <button
                  onClick={() => {
                    setPoSearchTerm("");
                    setPoDateFilter("ALL");
                  }}
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="h-4 w-24 bg-gray-200 rounded"></div>
                      <div className="h-4 w-32 bg-gray-200 rounded"></div>
                      <div className="h-4 w-20 bg-gray-200 rounded"></div>
                      <div className="h-4 w-16 bg-gray-200 rounded"></div>
                      <div className="h-4 w-20 bg-gray-200 rounded"></div>
                      <div className="h-4 w-24 bg-gray-200 rounded"></div>
                      <div className="h-8 w-24 bg-gray-200 rounded-lg ml-auto"></div>
                    </div>
                  ))}
                </div>
              ) : filteredPendingPOs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mb-3 opacity-50" />
                  <p>No pending Purchase Orders for this vendor</p>
                  <p className="text-sm mt-1">
                    {pendingPOs.length > 0
                      ? "Try adjusting your search filters"
                      : "All POs for this vendor have been fully received"}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedVendorForPO(null);
                      setPendingPOs([]);
                    }}
                    className="mt-4 text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Choose a different vendor
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          PO Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Total Items
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Pending Qty
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPendingPOs.map((po) => (
                        <tr key={po._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-medium text-blue-600">
                              {po.transactionNo || po.orderNumber}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(po.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {po.items?.length || 0} items
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                              {po.totalPending || po.items?.reduce((sum, i) => sum + (i.pendingQty || 0), 0)} pending
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium">
                            AED {(po.totalAmount || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => fetchPOForGRN(po._id)}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
                            >
                              <ArrowRightCircle className="w-4 h-4" />
                              Create GRN
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // Main render
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {renderNotifications()}

      {activeView === "dashboard" && renderDashboard()}
      {activeView === "list" && renderDashboard()}
      {activeView === "select-po" && renderPOSelection()}
      {activeView === "create" && selectedPO && (
        <GRNForm
          purchaseOrder={selectedPO}
          vendors={vendors}
          stockItems={stockItems}
          onSubmit={handleCreateGRN}
          onBack={() => {
            setSelectedPO(null);
            setActiveView("select-po");
          }}
          addNotification={addNotification}
        />
      )}
      {activeView === "create-direct" && (
        <DirectGRNForm
          vendors={vendors}
          stockItems={stockItems}
          onSubmit={handleCreateDirectGRN}
          onBack={() => {
            setDirectMode(false);
            setActiveView("dashboard");
          }}
          addNotification={addNotification}
        />
      )}
      {activeView === "view" && (selectedGRN || createdGRN) && (
        <GRNView
          grn={selectedGRN || createdGRN}
          vendors={vendors}
          onBack={() => {
            setSelectedGRN(null);
            setCreatedGRN(null);
            setActiveView("dashboard");
          }}
          onConvert={handleConvertToPurchase}
          onCancel={handleCancelGRN}
          addNotification={addNotification}
        />
      )}
    </div>
  );
};

export default GRNManagement;
