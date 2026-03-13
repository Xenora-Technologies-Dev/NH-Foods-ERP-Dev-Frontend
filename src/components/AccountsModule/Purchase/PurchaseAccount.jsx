// src/components/AccountsModule/Purchase/PurchaseAccount.jsx
// Accounts Payable — Level 1: Vendor Summary
// Shows all vendors with financial totals (Total Purchases, Total Paid, Outstanding)
// Click Eye icon to drill down into per-vendor invoice register

import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../../axios/axios";
import {
  Search,
  RefreshCw,
  Eye,
  Users,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  Download,
  Banknote,
  ClipboardList,
  Filter,
  X,
  FileText,
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
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${currentPage === p ? "bg-amber-600 text-white border-amber-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"}`}>
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

const DebitAccountsManagement = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [outstandingMin, setOutstandingMin] = useState("");
  const [outstandingMax, setOutstandingMax] = useState("");

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get("/ledger/debit-accounts");
      setVendors(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load vendor accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = vendors;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(v =>
        v.name?.toLowerCase().includes(term) ||
        v.partyId?.toLowerCase().includes(term)
      );
    }
    if (outstandingMin) {
      result = result.filter(v => (v.balance || 0) >= Number(outstandingMin));
    }
    if (outstandingMax) {
      result = result.filter(v => (v.balance || 0) <= Number(outstandingMax));
    }
    return result;
  }, [vendors, searchTerm, outstandingMin, outstandingMax]);

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

  // Summary from all vendors (not filtered)
  const summaryTotals = useMemo(() => ({
    totalVendors: vendors.length,
    totalPurchases: vendors.reduce((s, v) => s + (v.totalInvoiced || 0), 0),
    totalPaid: vendors.reduce((s, v) => s + (v.totalPaid || 0), 0),
    totalOutstanding: vendors.reduce((s, v) => s + Math.max(0, v.balance || 0), 0),
  }), [vendors]);

  const clearFilters = () => {
    setSearchTerm("");
    setOutstandingMin("");
    setOutstandingMax("");
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (filtered.length === 0) return;
    const wb = XLSX.utils.book_new();
    const data = [
      ["ACCOUNTS PAYABLE - VENDOR SUMMARY"],
      [`Generated: ${new Date().toLocaleString("en-GB")}`],
      [""],
      ["Vendor", "Total Purchases (AED)", "Total Paid (AED)", "Outstanding Amount (AED)"],
    ];
    filtered.forEach(v => {
      data.push([
        v.name,
        (v.totalInvoiced || 0).toFixed(2),
        (v.totalPaid || 0).toFixed(2),
        Math.max(0, v.balance || 0).toFixed(2),
      ]);
    });
    data.push([""]);
    data.push(["TOTALS",
      filtered.reduce((s, v) => s + (v.totalInvoiced || 0), 0).toFixed(2),
      filtered.reduce((s, v) => s + (v.totalPaid || 0), 0).toFixed(2),
      filtered.reduce((s, v) => s + Math.max(0, v.balance || 0), 0).toFixed(2),
    ]);
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 30 }, { wch: 22 }, { wch: 18 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws, "Vendor Summary");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `AP_Vendor_Summary_${stamp}.xlsx`);
  };

  if (loading && vendors.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-amber-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading accounts payable...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100 p-4 sm:p-6">
      <style>{`
        @keyframes slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slide-in { animation: slide-in .3s ease-out; }
      `}</style>
      <Toast show={!!error} message={error} type="error" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Accounts Payable</h1>
          <p className="text-gray-500 mt-1 text-sm">Vendor Summary &middot; Outstanding Balances</p>
        </div>
        <button onClick={fetchVendors} disabled={loading} className="mt-3 sm:mt-0 p-3 rounded-xl bg-white shadow-md hover:shadow-lg transition-all">
          <RefreshCw size={20} className={loading ? "animate-spin text-amber-600" : "text-gray-600"} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-slate-100 rounded-xl"><Users size={20} className="text-slate-600" /></div>
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Total Vendors</p>
          <p className="text-2xl font-bold text-gray-900">{summaryTotals.totalVendors}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-amber-50 rounded-xl"><ClipboardList size={20} className="text-amber-600" /></div>
            <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md">PURCHASES</span>
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Total Purchases</p>
          <p className="text-2xl font-bold text-amber-700">{fmtAED(summaryTotals.totalPurchases)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl"><Banknote size={20} className="text-emerald-600" /></div>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md">PAID</span>
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-emerald-700">{fmtAED(summaryTotals.totalPaid)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-red-50 rounded-xl"><DollarSign size={20} className="text-red-600" /></div>
            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md">OUTSTANDING</span>
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Outstanding Payables</p>
          <p className="text-2xl font-bold text-red-700">{fmtAED(summaryTotals.totalOutstanding)}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search vendor name or code..." value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-300 transition-all" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${showFilters ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Min Outstanding</label>
                <input type="number" value={outstandingMin} onChange={(e) => { setOutstandingMin(e.target.value); setCurrentPage(1); }} placeholder="0"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Max Outstanding</label>
                <input type="number" value={outstandingMax} onChange={(e) => { setOutstandingMax(e.target.value); setCurrentPage(1); }} placeholder="Any"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-300" />
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

      {/* Vendor Summary Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-amber-50/80 to-orange-50/80">
          <h2 className="text-lg font-bold text-gray-900">Vendor Accounts</h2>
          <p className="text-gray-500 text-sm mt-0.5">{filtered.length} vendors</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Purchases</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Paid</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding Amount</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="font-medium">No vendors found</p>
                    <p className="text-sm text-gray-400 mt-1">Adjust filters or add vendor transactions</p>
                  </td>
                </tr>
              ) : (
                paginated.map((v) => (
                  <tr key={v._id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-900 text-sm">{v.name}</div>
                      <div className="text-xs text-gray-400">{v.partyId}</div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-semibold text-gray-800">{fmtAED(v.totalInvoiced)}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-semibold text-emerald-600">{fmtAED(v.totalPaid)}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={`font-bold ${v.balance > 0 ? "text-red-600" : "text-gray-400"}`}>
                        {fmtAED(Math.max(0, v.balance || 0))}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => navigate(`/debit-accounts/vendor/${v._id}`, { state: { vendorName: v.name } })}
                          className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="View Invoices"
                        >
                          <Eye size={16} />
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
                  <td className="px-5 py-4 font-bold text-gray-700">Page Totals</td>
                  <td className="px-5 py-4 text-right font-bold text-gray-800">
                    {fmtAED(paginated.reduce((s, v) => s + (v.totalInvoiced || 0), 0))}
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-emerald-600">
                    {fmtAED(paginated.reduce((s, v) => s + (v.totalPaid || 0), 0))}
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-red-600">
                    {fmtAED(paginated.reduce((s, v) => s + Math.max(0, v.balance || 0), 0))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} />
      </div>
    </div>
  );
};

export default DebitAccountsManagement;
