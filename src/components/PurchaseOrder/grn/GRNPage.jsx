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
} from "lucide-react";
import axiosInstance from "../../../axios/axios";
import GRNForm from "./GRNForm";
import TableView from "./TableView";
import GridView from "./GridView";
import GRNView from "./GRNView";
import PaginationControl from "../../Pagination/PaginationControl";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [notifications, setNotifications] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [grns, setGRNs] = useState([]);
  const [pendingPOs, setPendingPOs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [createdGRN, setCreatedGRN] = useState(null);
  const [poSearchTerm, setPoSearchTerm] = useState("");
  const [poVendorFilter, setPoVendorFilter] = useState("ALL");
  const [poDateFilter, setPoDateFilter] = useState("ALL");
  const [stats, setStats] = useState({
    draft: 0,
    received: 0,
    converted: 0,
    cancelled: 0,
    totalAmount: 0,
  });

  // Initial load - fetch base data in parallel
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        const [vendorsRes, stockRes, statsRes] = await Promise.all([
          axiosInstance.get("/vendors/vendors"),
          axiosInstance.get("/stock/stock"),
          axiosInstance.get("/grn/stats"),
        ]);
        
        setVendors(vendorsRes.data?.data || []);
        setStockItems(stockRes.data?.data?.stocks || stockRes.data?.data || []);
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
  }, [debouncedSearchTerm, statusFilter, vendorFilter, dateFilter]);

  const fetchVendors = async () => {
    try {
      const { data } = await axiosInstance.get("/vendors/vendors");
      setVendors(data.data || []);
    } catch (e) {
      addNotification(`Vendors load error: ${e.response?.data?.message || e.message}`, "error");
    }
  };

  const fetchStockItems = async () => {
    try {
      const { data } = await axiosInstance.get("/stock/stock");
      const stocks = data.data?.stocks || data.data || [];
      setStockItems(stocks);
    } catch (e) {
      addNotification(`Stock load error: ${e.response?.data?.message || e.message}`, "error");
    }
  };

  const fetchGRNs = async () => {
    setIsLoading(true);
    try {
      const params = {
        search: debouncedSearchTerm || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        vendorId: vendorFilter !== "ALL" ? vendorFilter : undefined,
        dateFilter: dateFilter !== "ALL" ? dateFilter : undefined,
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

  const fetchPendingPOs = async () => {
    setIsLoading(true);
    try {
      const { data } = await axiosInstance.get("/grn/pending-pos");
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

  // Filter and paginate GRNs
  const filteredGRNs = useMemo(() => {
    return grns;
  }, [grns]);

  // Filter pending POs for selection
  const filteredPendingPOs = useMemo(() => {
    return pendingPOs.filter((po) => {
      // Search filter - search by PO number
      const matchesSearch = !poSearchTerm || 
        (po.transactionNo || po.orderNumber || "").toLowerCase().includes(poSearchTerm.toLowerCase()) ||
        (po.vendorName || po.partyId?.vendorName || "").toLowerCase().includes(poSearchTerm.toLowerCase());

      // Vendor filter
      const matchesVendor = poVendorFilter === "ALL" || 
        (po.partyId?._id || po.partyId) === poVendorFilter;

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

      return matchesSearch && matchesVendor && matchesDate;
    });
  }, [pendingPOs, poSearchTerm, poVendorFilter, poDateFilter]);

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
            Manage goods received against purchase orders
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              fetchPendingPOs();
              setActiveView("select-po");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Create GRN
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Status</option>
            <option value="RECEIVED">Received</option>
            <option value="CONVERTED">Converted</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
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
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredGRNs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Package className="w-12 h-12 mb-3 opacity-50" />
            <p>No GRNs found</p>
            <button
              onClick={() => {
                fetchPendingPOs();
                setActiveView("select-po");
              }}
              className="mt-3 text-blue-600 hover:underline"
            >
              Create your first GRN
            </button>
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

  // Render PO selection for GRN
  const renderPOSelection = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setActiveView("dashboard")}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Select Purchase Order</h1>
          <p className="text-gray-500">Select a PO to create GRN ({filteredPendingPOs.length} pending)</p>
        </div>
      </div>

      {/* Filters for PO selection */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by PO number or vendor..."
              value={poSearchTerm}
              onChange={(e) => setPoSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={poVendorFilter}
            onChange={(e) => setPoVendorFilter(e.target.value)}
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
              setPoVendorFilter("ALL");
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
            {/* Skeleton loader for better UX */}
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
            <p>No pending Purchase Orders found</p>
            <p className="text-sm mt-1">{pendingPOs.length > 0 ? "Try adjusting your filters" : "All POs have been fully received"}</p>
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
                    Vendor
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
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        {po.vendorName || po.partyId?.vendorName || "Unknown"}
                      </div>
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
    </div>
  );

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
