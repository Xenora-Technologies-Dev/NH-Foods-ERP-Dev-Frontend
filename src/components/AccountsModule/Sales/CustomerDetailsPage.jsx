// src/components/AccountsModule/Sales/CustomerDetailsPage.jsx
// Accounts Receivable — Level 2: Per-Customer Invoice Register
// Shows sales invoices for a single customer with payment status tracking
// Payments are created via Receipt Voucher module, not from this page

import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "../../../axios/axios";
import {
  Search,
  RefreshCw,
  ArrowLeft,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  Download,
  Banknote,
  FileText,
  History,
  Filter,
  X,
} from "lucide-react";
import Select from "react-select";
import * as XLSX from "xlsx";

const Toast = ({ show, message, type }) =>
  show && (
    <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-2xl text-white z-50 animate-slide-in ${type === "success" ? "bg-emerald-500" : "bg-red-500"}`}>
      <div className="flex items-center space-x-3">
        {type === "success" ? <CheckCircle size={20} /> : <XCircle size={20} />}
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );

const fmtAED = (n) => {
  const v = Math.abs(Number(n) || 0);
  return `AED ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const StatusBadge = ({ status }) => {
  const styles = {
    PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
    PARTIAL: "bg-amber-100 text-amber-700 border-amber-200",
    UNPAID: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
};

// Invoice History Modal
const InvoiceHistoryModal = ({ isOpen, onClose, documentNo, partyType }) => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && documentNo) {
      (async () => {
        setLoading(true);
        try {
          const res = await axios.get(`/ledger/invoice-history/${partyType}/${documentNo}`);
          setTimeline(res.data?.data || []);
        } catch { setTimeline([]); }
        finally { setLoading(false); }
      })();
    }
  }, [isOpen, documentNo, partyType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Invoice History</h3>
            <p className="text-sm text-gray-500">{documentNo}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="text-blue-600 animate-spin" />
            </div>
          ) : timeline.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No history available</p>
          ) : (
            <div className="relative pl-8">
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200"></div>
              {timeline.map((event, i) => (
                <div key={i} className="relative mb-6 last:mb-0">
                  <div className="absolute -left-5 top-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm"></div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="font-semibold text-gray-900 text-sm">{event.step}</p>
                    {event.detail && <p className="text-xs text-gray-500 mt-0.5 font-mono">{event.detail}</p>}
                    {event.date && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(event.date).toLocaleDateString("en-GB")} {new Date(event.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Pagination = ({ currentPage, totalPages, onPageChange, itemsPerPage, onItemsPerPageChange }) => {
  const pages = useMemo(() => {
    const arr = [];
    const max = 5;
    let start = Math.max(1, currentPage - Math.floor(max / 2));
    let end = Math.min(totalPages, start + max - 1);
    if (end - start + 1 < max) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [currentPage, totalPages]);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-gray-50 border-t border-gray-200">
      <div className="flex items-center space-x-2 mb-4 sm:mb-0">
        <span className="text-sm text-gray-600">Per page:</span>
        <Select
          value={[10,25,50].map(v=>({value:v,label:`${v}`})).find(o=>o.value===itemsPerPage)}
          onChange={(opt) => onItemsPerPageChange(opt.value)}
          options={[10,25,50].map(v=>({value:v,label:`${v} per page`}))}
          className="w-32" classNamePrefix="react-select"
        />
      </div>
      <div className="flex items-center space-x-2">
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
          className="p-2 rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
          <ChevronLeft size={16} />
        </button>
        {pages.map((p) => (
          <button key={p} onClick={() => onPageChange(p)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${currentPage === p ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"}`}>
            {p}
          </button>
        ))}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
          className="p-2 rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

const CustomerDetailsPage = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({});
  const [customerName, setCustomerName] = useState(location.state?.customerName || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // History modal
  const [historyModal, setHistoryModal] = useState({ open: false, documentNo: null });

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append("customerId", customerId);
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchTerm) params.append("docNumber", searchTerm);

      const res = await axios.get(`/ledger/receivable-invoices?${params.toString()}`);
      const data = res.data?.data;
      setInvoices(data?.invoices || []);
      setSummary(data?.summary || {});
      // Extract customer name from first invoice if not passed via state
      if (!customerName && data?.invoices?.length > 0) {
        setCustomerName(data.invoices[0].customerName);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load invoices");
    } finally { setLoading(false); }
  }, [customerId, fromDate, toDate, statusFilter, searchTerm]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // Client-side doc number search
  const filtered = useMemo(() => {
    if (!searchTerm) return invoices;
    const term = searchTerm.toLowerCase();
    return invoices.filter(inv =>
      inv.documentNo?.toLowerCase().includes(term) ||
      inv.invoiceNumber?.toLowerCase().includes(term)
    );
  }, [invoices, searchTerm]);

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (filtered.length === 0) return;
    const wb = XLSX.utils.book_new();
    const data = [
      ["ACCOUNTS RECEIVABLE - INVOICE REGISTER"],
      [`Customer: ${customerName}`],
      [`Generated: ${new Date().toLocaleString("en-GB")}`],
      [""],
      ["Sales Invoice No", "Invoice Date", "Invoice Amount (AED)", "Received Amount (AED)", "Outstanding Amount (AED)", "Status"],
    ];
    filtered.forEach(inv => {
      data.push([
        inv.documentNo,
        inv.documentDate ? new Date(inv.documentDate).toLocaleDateString("en-GB") : "-",
        (inv.invoiceAmount || 0).toFixed(2),
        (inv.paidAmount || 0).toFixed(2),
        (inv.outstandingAmount || 0).toFixed(2),
        inv.status,
      ]);
    });
    data.push([""]);
    data.push(["TOTALS", "",
      filtered.reduce((s, inv) => s + (inv.invoiceAmount || 0), 0).toFixed(2),
      filtered.reduce((s, inv) => s + (inv.paidAmount || 0), 0).toFixed(2),
      filtered.reduce((s, inv) => s + (inv.outstandingAmount || 0), 0).toFixed(2),
      ""
    ]);
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, "Customer Invoices");
    const safeName = (customerName || "Customer").replace(/[^a-zA-Z0-9]/g, "_");
    XLSX.writeFile(wb, `AR_${safeName}_Invoices_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading && invoices.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading invoice register...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 p-4 sm:p-6">
      <style>{`
        @keyframes slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slide-in { animation: slide-in .3s ease-out; }
      `}</style>
      <Toast show={!!error} message={error} type="error" />

      {/* Back Button */}
      <button onClick={() => navigate("/credit-accounts")}
        className="flex items-center gap-2 text-blue-700 hover:text-blue-900 font-semibold mb-4 transition-colors">
        <ArrowLeft size={20} /> Back to Accounts Receivable
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {customerName ? `Accounts Receivable — ${customerName}` : "Accounts Receivable"}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Invoice Register &middot; Payment Status Tracking</p>
        </div>
        <button onClick={fetchInvoices} disabled={loading} className="mt-3 sm:mt-0 p-3 rounded-xl bg-white shadow-md hover:shadow-lg transition-all">
          <RefreshCw size={20} className={loading ? "animate-spin text-blue-600" : "text-gray-600"} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-blue-50 rounded-xl"><FileText size={20} className="text-blue-600" /></div>
            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md">INVOICED</span>
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Total Invoiced</p>
          <p className="text-2xl font-bold text-blue-700">{fmtAED(summary.totalInvoiced)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl"><Banknote size={20} className="text-emerald-600" /></div>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md">RECEIVED</span>
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Total Received</p>
          <p className="text-2xl font-bold text-emerald-700">{fmtAED(summary.totalReceived)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-amber-50 rounded-xl"><DollarSign size={20} className="text-amber-600" /></div>
            <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md">OUTSTANDING</span>
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Outstanding</p>
          <p className="text-2xl font-bold text-amber-700">{fmtAED(summary.totalOutstanding)}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search invoice number..." value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${showFilters ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <Filter size={18} /> Filters
          </button>
          <button onClick={handleExport} disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50">
            <Download size={18} /> Export
          </button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-300">
                  <option value="all">All Status</option>
                  <option value="PAID">Paid</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="UNPAID">Unpaid</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">From Date</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">To Date</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-300" />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <X size={14} /> Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Register Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/80">
          <h2 className="text-lg font-bold text-gray-900">Sales Invoice Register</h2>
          <p className="text-gray-500 text-sm mt-0.5">{filtered.length} sales invoices</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sales Invoice No</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice Date</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice Amount</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Received Amount</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="font-medium">No sales invoices found</p>
                    <p className="text-sm text-gray-400 mt-1">Adjust filters or create new sales invoices</p>
                  </td>
                </tr>
              ) : (
                paginated.map((inv) => (
                  <tr key={inv._id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono font-semibold text-gray-800 text-sm">{inv.documentNo}</span>
                      {inv.invoiceNumber && inv.invoiceNumber !== inv.documentNo && (
                        <span className="block text-xs text-gray-400 mt-0.5">Inv# {inv.invoiceNumber}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {inv.documentDate ? new Date(inv.documentDate).toLocaleDateString("en-GB") : "-"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-semibold text-gray-800">{fmtAED(inv.invoiceAmount)}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-semibold text-emerald-600">{fmtAED(inv.paidAmount)}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={`font-bold ${inv.outstandingAmount > 0 ? "text-amber-600" : "text-gray-400"}`}>
                        {fmtAED(inv.outstandingAmount)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center">
                        <button onClick={() => setHistoryModal({ open: true, documentNo: inv.documentNo })}
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View History">
                          <History size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {paginated.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={2} className="px-5 py-4 font-bold text-gray-700">Page Totals</td>
                  <td className="px-5 py-4 text-right font-bold text-gray-800">
                    {fmtAED(paginated.reduce((s, inv) => s + (inv.invoiceAmount || 0), 0))}
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-emerald-600">
                    {fmtAED(paginated.reduce((s, inv) => s + (inv.paidAmount || 0), 0))}
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-amber-600">
                    {fmtAED(paginated.reduce((s, inv) => s + (inv.outstandingAmount || 0), 0))}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} />
      </div>

      {/* Invoice History Modal */}
      <InvoiceHistoryModal
        isOpen={historyModal.open}
        onClose={() => setHistoryModal({ open: false, documentNo: null })}
        documentNo={historyModal.documentNo}
        partyType="Customer"
      />
    </div>
  );
};

export default CustomerDetailsPage;
