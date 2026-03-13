import React, { useEffect, useMemo, useState } from "react";
import { List, Search, Grid, BarChart3, RefreshCw, FileDown } from "lucide-react";
import axiosInstance from "../../../axios/axios";
import TableView from "./TableView";
import GridView from "./GridView";
import SaleInvoiceView from "./InvoiceView";
import Modal from "../../Modal";
import PaginationControl from "../../Pagination/PaginationControl";
import { exportSalesInvoicesToExcel } from "../../../utils/excelExport";
import { useCustomerList } from "../../../hooks/useDataFetching";
import { PageListSkeleton, RefetchIndicator } from "../../ui/Skeletons";
import EditApprovedInvoiceModal from "../EditApprovedInvoiceModal";

const ApprovedSales = () => {
  const [viewMode, setViewMode] = useState("table");
  const [selectedSO, setSelectedSO] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customerFilter, setCustomerFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  // ── Cached customer data via React Query ──
  const { data: customerData, isLoading: customersLoading, isFetching: customersFetching } = useCustomerList();
  const customers = useMemo(() => customerData?.items || [], [customerData]);

  const [salesOrders, setSalesOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);

  useEffect(() => {
    fetchTransactions();
  }, [searchTerm, customerFilter, dateFrom, dateTo]);

  // Customers are now provided by React Query hook above

  const fetchAllForExport = async () => {
    try {
      // Fetch all approved/paid/partial sales invoices from database (no pagination limit)
      const response = await axiosInstance.get("/transactions/transactions", {
        params: {
          type: "sales_order",
          status: "APPROVED,PAID,PARTIAL",
          limit: 10000, // Fetch up to 10000 records
        },
      });
      return response.data?.data || [];
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

    // Format data same way as display
    const getInvoiceNumberRaw = (t) => t?.transactionNumber || t?.invoiceNumber || t?.transactionNo || "";
    const formatDisplayTransactionNo = (t) => {
      try {
        const raw = getInvoiceNumberRaw(t);
        if (["APPROVED", "PAID", "PARTIAL"].includes(t.status) && raw) {
          const digits = String(raw).replace(/^SO/i, "").replace(/\D/g, "");
          return digits ? digits.padStart(4, "0") : raw;
        }
      } catch {}
      return getInvoiceNumberRaw(t);
    };
    
    const formattedData = allData.map((t) => ({
      id: t._id,
      transactionNo: getInvoiceNumberRaw(t),
      orderNumber: t.orderNumber,
      displayTransactionNo: formatDisplayTransactionNo(t),
      customerId: t.partyId,
      customerName: t.party?.customerName || t.partyName,
      date: t.date,
      approvedAt: t.approvedAt || t.approvedDate || t.updatedAt || null,
      deliveryDate: t.deliveryDate,
      status: t.status,
      totalAmount: Number(t.totalAmount || 0).toFixed(2),
      items: t.items || [],
      terms: t.terms || "",
      paidAmount: Number(t.paidAmount || 0).toFixed(2),
      outstandingAmount: Number(t.outstandingAmount || 0).toFixed(2),
      createdBy: t.createdBy,
    }));

    exportSalesInvoicesToExcel(formattedData, "Sales_Invoices_All");
    setNotification({ message: "Sales invoices exported to Excel successfully", type: "success" });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get("/transactions/transactions", {
        params: {
          type: "sales_order",
          search: searchTerm,
          // Fetch approved invoices — also include PAID/PARTIAL for backward compat with legacy data
          status: "APPROVED,PAID,PARTIAL",
          partyId: customerFilter !== "ALL" ? customerFilter : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          limit: 1000, // Fetch up to 1000 records for display
        },
      });
      console.log("API Response");
      console.log(response);
      const txs = response.data?.data || [];
      const getInvoiceNumberRaw = (t) => t?.transactionNumber || t?.invoiceNumber || t?.transactionNo || "";
      const formatDisplayTransactionNo = (t) => {
        try {
          const raw = getInvoiceNumberRaw(t);
          if (["APPROVED", "PAID", "PARTIAL"].includes(t.status) && raw) {
            const digits = String(raw).replace(/^SO/i, "").replace(/\D/g, "");
            return digits ? digits.padStart(4, "0") : raw;
          }
        } catch {}
        return getInvoiceNumberRaw(t);
      };
      setSalesOrders(
        txs.map((t) => ({
          id: t._id,
          transactionNo: getInvoiceNumberRaw(t),
          orderNumber: t.orderNumber,
          invoiceNumber: t.invoiceNumber || null,
          displayTransactionNo: formatDisplayTransactionNo(t),
          customerId: t.partyId,
          customerName: t.party?.customerName || t.partyName,
          date: t.date,
          approvedAt: t.approvedAt || t.approvedDate || t.updatedAt || null,
          deliveryDate: t.deliveryDate,
          // Status is unified: APPROVED=unpaid, PAID=fully paid, PARTIAL=partially paid
          status: t.status,
          totalAmount: Number(t.totalAmount || 0).toFixed(2),
          items: t.items || [],
          terms: t.terms || "",
          notes: t.notes || "",
          paidAmount: Number(t.paidAmount || 0).toFixed(2),
          outstandingAmount: Number(t.outstandingAmount || 0).toFixed(2),
          createdBy: t.createdBy,
          createdAt: t.createdAt,
          invoiceGenerated: t.invoiceGenerated,
          priority: t.priority || "Medium",
          refNo: t.lpono ?? t.refNo ?? "",
          docNo: t.docno ?? t.docNo ?? "",
          discount: typeof t.discount === "number" ? t.discount : 0,
        }))
      );
    } catch (e) {
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAndSortedSOs = useMemo(
    () => () => {
      let filtered = salesOrders.filter((so) => {
        const matchesSearch =
          so.transactionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          so.customerName?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCustomer =
          customerFilter === "ALL" || so.customerId === customerFilter;

        let matchesDate = true;
        if (dateFrom || dateTo) {
          const soDate = new Date(so.date);
          soDate.setHours(0, 0, 0, 0);
          if (dateFrom) {
            const from = new Date(dateFrom);
            from.setHours(0, 0, 0, 0);
            if (soDate < from) matchesDate = false;
          }
          if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            if (soDate > to) matchesDate = false;
          }
        }
        return matchesSearch && matchesCustomer && matchesDate;
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
          default:
            aVal = a.transactionNo;
            bVal = b.transactionNo;
        }
        return sortOrder === "asc" ? (aVal < bVal ? -1 : 1) : aVal > bVal ? -1 : 1;
      });

      return filtered;
    },
    [salesOrders, searchTerm, customerFilter, dateFrom, dateTo, sortBy, sortOrder]
  );

  const filteredSOs = filteredAndSortedSOs();
  const totalPages = Math.ceil(filteredSOs.length / itemsPerPage);
  const paginatedSOs = filteredSOs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusColor = (status) => {
    const normalizedStatus = String(status || "").toLowerCase();
    switch (normalizedStatus) {
      case "approved":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "paid":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "partial":
        return "bg-orange-100 text-orange-700 border-orange-200";
      default:
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };
  const getStatusIcon = () => null;
  const getPriorityColor = () => "bg-yellow-500";

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="relative bg-white/80 backdrop-blur-xl shadow-xl border-b border-gray-200/50">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Sales Invoice</h1>
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
                  placeholder="Search by invoice number or customer..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-80 pl-10 pr-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
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
                  <option key={c._id} value={c._id}>{c.customerName}</option>
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
              <button onClick={() => setViewMode("table")} className={`p-3 rounded-xl ${viewMode === "table" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                <List className="w-5 h-5" />
              </button>
              <button onClick={() => setViewMode("grid")} className={`p-3 rounded-xl ${viewMode === "grid" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  if (dateFrom || dateTo) {
                    const filtered = filteredAndSortedSOs();
                    if (filtered.length === 0) {
                      setNotification({ message: "No data to export", type: "error" });
                      setTimeout(() => setNotification(null), 3000);
                      return;
                    }
                    exportSalesInvoicesToExcel(filtered, `Sales_Invoices_${dateFrom || "start"}_to_${dateTo || "end"}`);
                    setNotification({ message: "Filtered sales invoices exported to Excel", type: "success" });
                    setTimeout(() => setNotification(null), 3000);
                  } else {
                    handleExportAll();
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                title={(dateFrom || dateTo) ? "Export filtered sales invoices" : "Export all sales invoices from database"}
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
        {customersFetching && <RefetchIndicator />}
        {(customersLoading || isLoading) ? (
          <PageListSkeleton rows={6} />
        ) : (
          <>
            {viewMode === "table" ? (
              <TableView
                paginatedSOs={paginatedSOs}
                selectedSOs={[]}
                setSelectedSOs={() => {}}
                getPriorityColor={getPriorityColor}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
                handleSort={handleSort}
                sortBy={sortBy}
                sortOrder={sortOrder}
                setSelectedSO={setSelectedSO}
                setActiveView={() => {}}
                editSO={() => {}}
                confirmSO={() => {}}
                deleteSO={() => {}}
                onDownloadInternal={() => {}}
                onDownloadCustomer={() => {}}
                onEditApproved={(so) => setEditingInvoice(so)}
                showApprovedAt={true}
                showSelection={false}
              />
            ) : (
              <GridView
                paginatedSOs={paginatedSOs}
                selectedSOs={[]}
                setSelectedSOs={() => {}}
                getPriorityColor={getPriorityColor}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
                setSelectedSO={setSelectedSO}
                setActiveView={() => {}}
                editSO={() => {}}
                confirmSO={() => {}}
                deleteSO={() => {}}
                onDownloadInternal={() => {}}
                onDownloadCustomer={() => {}}
                onEditApproved={(so) => setEditingInvoice(so)}
              />
            )}
            {/* Professional Pagination */}
            {totalPages > 1 && (
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
            )}
          </>
        )}
      </div>

      <Modal open={!!selectedSO} onClose={() => setSelectedSO(null)} title={selectedSO ? `Invoice: ${selectedSO.transactionNo}` : ''} size="full">
        {selectedSO && (
          <SaleInvoiceView
            selectedSO={selectedSO}
            customers={customers}
            calculateTotals={() => ({ subtotal: "0.00", tax: "0.00", total: selectedSO.totalAmount })}
            setActiveView={() => {}}
            createdSO={null}
            setSelectedSO={setSelectedSO}
            setCreatedSO={() => {}}
            addNotification={() => {}}
            updateSalesOrderStatus={() => {}}
          />
        )}
      </Modal>

      {editingInvoice && (
        <EditApprovedInvoiceModal
          invoice={editingInvoice}
          type="sales"
          onClose={() => setEditingInvoice(null)}
          onSaved={() => {
            setEditingInvoice(null);
            setNotification({ message: "Invoice updated successfully", type: "success" });
            setTimeout(() => setNotification(null), 3000);
            fetchTransactions();
          }}
        />
      )}
    </div>
  );
};

export default ApprovedSales;
