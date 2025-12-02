import React, { useEffect, useMemo, useState } from "react";
import { List, Search, Grid, RefreshCw } from "lucide-react";
import axiosInstance from "../../../axios/axios";
import TableView from "./TableView";
import GridView from "./GridView";
import InvoiceView from "./InvoiceView";
import Modal from "../../Modal";

const ApprovedPurchase = () => {
  const [viewMode, setViewMode] = useState("table");
  const [selectedPO, setSelectedPO] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [vendorFilter, setVendorFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [vendors, setVendors] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { fetchVendors(); }, []);
  useEffect(() => { fetchTransactions(); }, [searchTerm, vendorFilter, dateFilter]);

  const fetchVendors = async () => {
    try {
      const { data } = await axiosInstance.get("/vendors/vendors");
      setVendors(data.data || []);
    } catch (e) {}
  };

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const { data } = await axiosInstance.get("/transactions/transactions", {
        params: {
          type: "purchase_order",
          search: searchTerm,
          status: "APPROVED",
          partyId: vendorFilter !== "ALL" ? vendorFilter : undefined,
          dateFilter: dateFilter !== "ALL" ? dateFilter : undefined,
        },
      });
      const txs = data?.data || [];
      setPurchaseOrders(
        txs.map((t) => ({
          id: t._id,
          transactionNo: t.transactionNo,
          orderNumber: t.orderNumber, // <-- Added this
          vendorId: t.partyId,
          vendorName: t.party?.vendorName || t.partyName,
          date: t.date,
          approvedAt: t.approvedAt || t.updatedAt || t.approvedDate || null,
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
        }))
      );
    } catch (e) { } finally { setIsLoading(false); }
  };

  const filteredAndSortedPOs = useMemo(
    () => () => {
      let filtered = purchaseOrders.filter((po) => {
        const matchesSearch =
          po.transactionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          po.vendorName?.toLowerCase().includes(searchTerm.toLowerCase());
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
    },
    [purchaseOrders, searchTerm, vendorFilter, dateFilter, sortBy, sortOrder]
  );

  const filteredPOs = filteredAndSortedPOs();
  const totalPages = Math.ceil(filteredPOs.length / itemsPerPage);
  const paginatedPOs = filteredPOs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
            <h1 className="text-3xl font-bold text-slate-800">Approved Purchases</h1>
            <p className="text-slate-600 mt-1">Only approved invoices are listed here</p>
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
            </div>
          </div>
        </div>
      </div>

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
            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-slate-600">Page {currentPage} of {totalPages}</div>
                <div className="flex items-center space-x-2">
                  <button disabled={currentPage<=1} onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">Prev</button>
                  <button disabled={currentPage>=totalPages} onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">Next</button>
                  <select value={itemsPerPage} onChange={(e)=>{setItemsPerPage(Number(e.target.value)); setCurrentPage(1);}} className="px-2 py-1 bg-white border rounded">
                    {[10,20,50,100].map(n=> (<option key={n} value={n}>{n}/page</option>))}
                  </select>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {/* Invoice modal */}
      <Modal open={!!selectedPO} onClose={() => setSelectedPO(null)} title={selectedPO ? `Invoice: ${selectedPO.transactionNo}` : ''}>
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
