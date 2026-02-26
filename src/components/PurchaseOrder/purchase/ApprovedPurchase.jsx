import React, { useEffect, useMemo, useState } from "react";
import { List, Search, Grid, RefreshCw, FileDown } from "lucide-react";
import axiosInstance from "../../../axios/axios";
import TableView from "./TableView";
import GridView from "./GridView";
import InvoiceView from "./InvoiceView";
import Modal from "../../Modal";
import PaginationControl from "../../Pagination/PaginationControl";
import { exportPurchaseInvoicesToExcel } from "../../../utils/excelExport";
import { useVendorList } from "../../../hooks/useDataFetching";
import { PageListSkeleton, RefetchIndicator } from "../../ui/Skeletons";

const ApprovedPurchase = () => {
  const [viewMode, setViewMode] = useState("table");
  const [selectedPO, setSelectedPO] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [vendorFilter, setVendorFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  // ── Cached vendor data via React Query ──
  const { data: vendorData, isLoading: vendorsLoading, isFetching: vendorsFetching } = useVendorList();
  const vendors = useMemo(() => vendorData?.items || [], [vendorData]);

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

  useEffect(() => { fetchTransactions(); }, [debouncedSearchTerm, vendorFilter, dateFrom, dateTo]);

  // Vendors are now provided by React Query hook above

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
      status: (entry.status || "APPROVED").toUpperCase(),
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
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            limit: 1000,
          },
        }),
        // 2. Legacy approved POs (approved before GRN system - no sourceGrnId)
        axiosInstance.get("/transactions/transactions", {
          params: {
            type: "purchase_order",
            status: "APPROVED,PAID,PARTIAL",
            search: debouncedSearchTerm,
            partyId: vendorFilter !== "ALL" ? vendorFilter : undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
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
        status: entry.status, // Now reflects actual Transaction status from backend
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

      // Build a Set of PO numbers covered by GRN entries for deduplication
      const grnPoNumbers = new Set();
      for (const entry of grnResponse.data?.data || []) {
        const poKey = String(entry.poNumber || "").trim().toLowerCase();
        if (poKey) grnPoNumbers.add(poKey);
      }

      // Build GRN cross-reference map for legacy entries that somehow lack sourceGrnId
      const grnByPoNumber = new Map();
      for (const entry of grnResponse.data?.data || []) {
        const poKey = String(entry.poNumber || "").trim().toLowerCase();
        if (!poKey) continue;
        if (!grnByPoNumber.has(poKey)) {
          grnByPoNumber.set(poKey, {
            grnNumber: entry.grnNumber || null,
            sourceGrnId: entry.id || null,
          });
        }
      }

      // Legacy approved POs (approved directly - not via GRN conversion)
      // Exclude POs that already appear in GRN entries (by PO number) to avoid duplicates
      const legacyEntries = (legacyResponse.data?.data || [])
        .filter((t) => {
          // If this transaction has sourceGrnId AND its PO number is in GRN entries, skip it
          const poRef = String(t.orderNumber || t.transactionNo || t.poNumber || "").trim().toLowerCase();
          if (grnPoNumbers.has(poRef)) return false; // Already covered by GRN entry
          return true;
        })
        .map((t) => {
          const poRef = t.orderNumber || t.transactionNo || t.poNumber || "";
          const grnFallback = grnByPoNumber.get(
            String(poRef).trim().toLowerCase()
          );
          const resolvedGrnNumber =
            t.grnNumber || t.sourceGrnNumber || grnFallback?.grnNumber || null;

          return {
            id: t._id,
            transactionNo: t.transactionNo,
            orderNumber: t.orderNumber,
            grnNumber: resolvedGrnNumber,
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
            sourceGrnNumber: resolvedGrnNumber,
            sourceGrnId: t.sourceGrnId || grnFallback?.sourceGrnId || null,
            entryType: resolvedGrnNumber ? "GRN" : "LEGACY",
          };
        });

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
  }, [purchaseOrders, debouncedSearchTerm, vendorFilter, dateFrom, dateTo, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedPOs.length / itemsPerPage);
  const paginatedPOs = filteredAndSortedPOs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusColor = (status) => {
    const s = String(status || "").toLowerCase();
    switch (s) {
      case "paid":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "partial":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "approved":
      default:
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
    }
  };
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
              <div className="flex items-center space-x-2">
                <label className="text-sm text-slate-500 whitespace-nowrap">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <label className="text-sm text-slate-500 whitespace-nowrap">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
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
              <button onClick={() => setViewMode("table")} className={`p-3 rounded-xl ${viewMode === "table" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                <List className="w-5 h-5" />
              </button>
              <button onClick={() => setViewMode("grid")} className={`p-3 rounded-xl ${viewMode === "grid" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  if (dateFrom || dateTo) {
                    if (filteredAndSortedPOs.length === 0) {
                      setNotification({ message: "No data to export", type: "error" });
                      setTimeout(() => setNotification(null), 3000);
                      return;
                    }
                    exportPurchaseInvoicesToExcel(filteredAndSortedPOs, `Purchase_Entries_${dateFrom || "start"}_to_${dateTo || "end"}`);
                    setNotification({ message: "Filtered purchase entries exported to Excel", type: "success" });
                    setTimeout(() => setNotification(null), 3000);
                  } else {
                    handleExportAll();
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                title={(dateFrom || dateTo) ? "Export filtered purchase entries" : "Export all purchase entries from database"}
              >
                <FileDown className="w-4 h-4" />
                <span>{(dateFrom || dateTo) ? "Export Filtered" : "Export All"}</span>
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
        {vendorsFetching && <RefetchIndicator />}
        {(vendorsLoading || isLoading) ? (
          <PageListSkeleton rows={6} />
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
