import React, { useEffect, useMemo, useState } from "react";
import { List, Search, Grid, RefreshCw, FileDown } from "lucide-react";
import axiosInstance from "../../../axios/axios";
import TableView from "./TableView";
import GridView from "./GridView";
import InvoiceView from "./InvoiceView";
import Modal from "../../Modal";
import PaginationControl from "../../Pagination/PaginationControl";
import { exportPurchaseInvoicesToExcel } from "../../../utils/excelExport";

const ApprovedPurchase = () => {
  const [viewMode, setViewMode] = useState("table");
  const [selectedPO, setSelectedPO] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [vendorFilter, setVendorFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [vendors, setVendors] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => { fetchVendors(); }, []);
  useEffect(() => { fetchTransactions(); }, [debouncedSearchTerm, vendorFilter, dateFilter]);

  const fetchVendors = async () => {
    try {
      const { data } = await axiosInstance.get("/vendors/vendors");
      setVendors(data.data || []);
    } catch (e) {}
  };

  const fetchAllForExport = async () => {
    try {
      // Fetch all Purchase Entries (converted GRNs) for export
      const { data } = await axiosInstance.get("/grn/purchase-entries", {
        params: {
          limit: 10000,
        },
      });
      return data?.data || [];
    } catch (error) {
      console.error("Error fetching data for export:", error);
      setNotification({ message: "Failed to export data", type: "error" });
      setTimeout(() => setNotification(null), 3000);
      return [];
    }
  };

  const handleExportAll = async () => {
    setNotification({ message: "Preparing export...", type: "info" });
    const allData = await fetchAllForExport();
    
    if (allData.length === 0) {
      setNotification({ message: "No data to export", type: "error" });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const formattedData = allData.map((entry) => ({
      id: entry.id,
      transactionNo: entry.grnNumber,
      orderNumber: entry.poNumber,
      vendorId: entry.vendorId,
      vendorName: entry.vendorName,
      vendorReference: entry.vendorTRN || "",
      date: entry.date,
      approvedAt: entry.convertedAt,
      deliveryDate: entry.receivedDate,
      status: "APPROVED",
      totalAmount: Number(entry.totalAmount || 0).toFixed(2),
      items: entry.items || [],
      terms: "",
      notes: entry.notes || "",
      createdBy: entry.convertedBy,
      createdAt: entry.convertedAt,
      invoiceGenerated: true,
      priority: "Medium",
      paidAmount: "0.00",
      outstandingAmount: Number(entry.totalAmount || 0).toFixed(2),
    }));

    exportPurchaseInvoicesToExcel(formattedData, "Purchase_Entries_All");
    setNotification({ message: "Purchase entries exported to Excel successfully", type: "success" });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      // Fetch both: GRN-based entries AND older approved POs (before GRN system)
      const [grnResponse, legacyResponse] = await Promise.all([
        // 1. GRN-based purchase entries (converted GRNs)
        axiosInstance.get("/grn/purchase-entries", {
          params: {
            search: debouncedSearchTerm,
            vendorId: vendorFilter !== "ALL" ? vendorFilter : undefined,
            dateFilter: dateFilter !== "ALL" ? dateFilter : undefined,
            limit: 1000,
          },
        }),
        // 2. Legacy approved POs (approved before GRN system - no sourceGrnId)
        axiosInstance.get("/transactions/transactions", {
          params: {
            type: "purchase_order",
            status: "APPROVED",
            search: debouncedSearchTerm,
            partyId: vendorFilter !== "ALL" ? vendorFilter : undefined,
            dateFilter: dateFilter !== "ALL" ? dateFilter : undefined,
            limit: 1000,
          },
        }),
      ]);

      const grnEntries = (grnResponse.data?.data || []).map((entry) => ({
        id: entry.id,
        transactionNo: entry.grnNumber,
        orderNumber: entry.poNumber,
        grnNumber: entry.grnNumber,
        poNumber: entry.poNumber,
        vendorId: entry.vendorId,
        vendorName: entry.vendorName,
        vendorReference: entry.vendorReference || "", // Invoice number from PO
        vendorTRN: entry.vendorTRN || "", // VAT/TRN number
        date: entry.date,
        approvedAt: entry.convertedAt,
        deliveryDate: entry.receivedDate,
        status: entry.status,
        totalAmount: Number(entry.totalAmount || 0).toFixed(2),
        items: entry.items || [],
        terms: "",
        notes: entry.notes || "",
        createdBy: entry.convertedBy,
        createdAt: entry.convertedAt,
        invoiceGenerated: true,
        priority: "Medium",
        sourceGrnNumber: entry.grnNumber,
        sourceGrnId: entry.id,
        entryType: "GRN", // Mark as GRN-based entry
      }));

      // Legacy approved POs (approved directly - not via GRN conversion)
      // IMPORTANT: Only exclude POs that have sourceGrnId (meaning they were converted via GRN)
      // We keep POs without sourceGrnId because:
      // 1. Old entries approved before GRN system - should display
      // 2. POs with grnGenerated=true but no sourceGrnId - partial GRN, but if APPROVED was set manually before GRN system
      const legacyEntries = (legacyResponse.data?.data || [])
        .filter((t) => !t.sourceGrnId) // Only exclude if it was converted via GRN (has sourceGrnId)
        .map((t) => ({
          id: t._id,
          transactionNo: t.transactionNo,
          orderNumber: t.orderNumber,
          grnNumber: null, // No GRN for legacy entries
          poNumber: t.transactionNo || t.orderNumber,
          vendorId: t.partyId,
          vendorName: t.party?.vendorName || t.partyName,
          vendorReference: t.vendorReference || "",
          date: t.date,
          approvedAt: t.approvedAt || t.updatedAt,
          deliveryDate: t.deliveryDate,
          status: t.status,
          totalAmount: Number(t.totalAmount || 0).toFixed(2),
          items: t.items || [],
          terms: t.terms || "",
          notes: t.notes || "",
          createdBy: t.createdBy,
          createdAt: t.createdAt,
          invoiceGenerated: t.invoiceGenerated,
          priority: t.priority || "Medium",
          sourceGrnNumber: null,
          sourceGrnId: null,
          entryType: "LEGACY", // Mark as legacy entry
        }));

      // Combine and sort by date (newest first)
      const allEntries = [...grnEntries, ...legacyEntries].sort(
        (a, b) => new Date(b.approvedAt || b.date) - new Date(a.approvedAt || a.date)
      );

      setPurchaseOrders(allEntries);
    } catch (e) {
      console.error("Error fetching purchase entries:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAndSortedPOs = useMemo(() => {
    let filtered = purchaseOrders.filter((po) => {
      // Client-side search (additional filtering if API returns more results)
      const matchesSearch =
        !debouncedSearchTerm ||
        po.transactionNo?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        po.grnNumber?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        po.poNumber?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        po.vendorName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        po.vendorReference?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesVendor = vendorFilter === "ALL" || po.vendorId === vendorFilter;
      let matchesDate = true;
      if (dateFilter !== "ALL") {
        const poDate = new Date(po.date);
        const today = new Date();
        switch (dateFilter) {
          case "TODAY": matchesDate = poDate.toDateString() === today.toDateString(); break;
          case "WEEK": matchesDate = poDate >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); break;
          case "MONTH": matchesDate = poDate >= new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()); break;
        }
      }
      return matchesSearch && matchesVendor && matchesDate;
    });
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "date": aVal = new Date(a.date); bVal = new Date(b.date); break;
        case "amount": aVal = parseFloat(a.totalAmount); bVal = parseFloat(b.totalAmount); break;
        case "vendor": aVal = a.vendorName; bVal = b.vendorName; break;
        default: aVal = a.transactionNo; bVal = b.transactionNo;
      }
      return sortOrder === "asc" ? (aVal < bVal ? -1 : 1) : aVal > bVal ? -1 : 1;
    });
    return filtered;
  }, [purchaseOrders, debouncedSearchTerm, vendorFilter, dateFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedPOs.length / itemsPerPage);
  const paginatedPOs = filteredAndSortedPOs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusColor = () => "bg-emerald-100 text-emerald-700 border-emerald-200";
  const getStatusIcon = () => null;
  const getPriorityColor = () => "bg-yellow-500";

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortOrder("asc"); }
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="relative bg-white/80 backdrop-blur-xl shadow-xl border-b border-gray-200/50">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Purchase Entry</h1>
            <p className="text-slate-600 mt-1">GRN confirmed entries with received quantities</p>
          </div>
          <button onClick={() => fetchTransactions()} className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
            <RefreshCw className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <div className="px-8 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by invoice number or vendor..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-80 pl-10 pr-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={vendorFilter}
                onChange={(e) => { setVendorFilter(e.target.value); setCurrentPage(1); }}
                className="px-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Vendors</option>
                {vendors.map((v) => (<option key={v._id} value={v._id}>{v.vendorName}</option>))}
              </select>
              <select
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                className="px-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Dates</option>
                <option value="TODAY">Today</option>
                <option value="WEEK">This Week</option>
                <option value="MONTH">This Month</option>
              </select>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={() => setViewMode("table")} className={`p-3 rounded-xl ${viewMode === "table" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                <List className="w-5 h-5" />
              </button>
              <button onClick={() => setViewMode("grid")} className={`p-3 rounded-xl ${viewMode === "grid" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={handleExportAll}
                className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                title="Export all purchase invoices from database"
              >
                <FileDown className="w-4 h-4" />
                <span>Export All</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white ${
          notification.type === "success" ? "bg-green-500" : "bg-red-500"
        }`}>
          {notification.message}
        </div>
      )}

      <div className="p-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {viewMode === "table" ? (
              <TableView
                paginatedPOs={paginatedPOs}
                selectedPOs={[]}
                setSelectedPOs={() => {}}
                getPriorityColor={getPriorityColor}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
                handleSort={handleSort}
                sortBy={sortBy}
                sortOrder={sortOrder}
                setSelectedPO={setSelectedPO}
                setActiveView={() => {}}
                editPO={() => {}}
                approvePO={() => {}}
                deletePO={() => {}}
                showApprovedAt={true}
                showSelection={false}
              />
            ) : (
              <GridView
                paginatedPOs={paginatedPOs}
                selectedPOs={[]}
                setSelectedPOs={() => {}}
                getPriorityColor={getPriorityColor}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
                setSelectedPO={setSelectedPO}
                setActiveView={() => {}}
                editPO={() => {}}
                approvePO={() => {}}
                rejectPO={() => {}}
                deletePO={() => {}}
              />
            )}
            {/* Professional Pagination */}
            {totalPages > 1 && (
              <PaginationControl
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredAndSortedPOs.length}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setCurrentPage(page)}
                onItemsPerPageChange={(newItemsPerPage) => {
                  setItemsPerPage(newItemsPerPage);
                  setCurrentPage(1);
                }}
                isLoading={isLoading}
              />
            )}
          </>
        )}
      </div>
      {/* Invoice modal */}
      <Modal open={!!selectedPO} onClose={() => setSelectedPO(null)} title={selectedPO ? `Purchase Entry: ${selectedPO.poNumber || selectedPO.orderNumber || selectedPO.transactionNo}` : ''} size="full">
        {selectedPO && (
          <InvoiceView
            selectedPO={selectedPO}
            vendors={vendors}
            calculateTotals={() => ({ subtotal: "0.00", tax: "0.00", total: selectedPO.totalAmount })}
            setActiveView={() => {}}
            createdPO={null}
            setSelectedPO={setSelectedPO}
            setCreatedPO={() => {}}
            addNotification={() => {}}
            updatePurchaseOrderStatus={() => {}}
          />
        )}
      </Modal>
    </div>
  );
};

export default ApprovedPurchase;
