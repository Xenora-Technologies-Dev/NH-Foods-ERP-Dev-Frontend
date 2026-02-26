// src/components/AccountsModule/Purchase/PurchaseAccount.jsx
// Vendor Accounts — Accounts Payable
// Flow: Purchase Entry → Payment Voucher → Balance
// Purchase Entry creates liability (we owe vendor)
// Payment Voucher reduces liability (we pay vendor)
// Balance = Total Invoiced - Total Paid = What we still owe

import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../../axios/axios";
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Eye,
  Users,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  Download,
  Banknote,
  Scale,
  ClipboardList,
} from "lucide-react";
import Select from "react-select";
import { exportAccountVouchersExcel } from "../../../utils/excelExport";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get("/ledger/debit-accounts");
        setVendors(res.data?.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load vendors");
      } finally { setLoading(false); }
    })();
  }, []);

  const filteredVendors = useMemo(() =>
    vendors.filter(v =>
      v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.partyId?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [vendors, searchTerm]);

  const paginated = filteredVendors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage) || 1;

  const stats = useMemo(() => {
    const totalInvoiced = vendors.reduce((s, v) => s + (v.totalPayable || 0), 0);
    const totalPaid = vendors.reduce((s, v) => s + (v.totalPaid || 0), 0);
    const outstanding = totalInvoiced - totalPaid;
    return {
      count: vendors.length,
      totalInvoiced,
      totalPaid,
      outstanding,
      active: vendors.filter(v => (v.balance || 0) > 0).length,
    };
  }, [vendors]);

  const handleRefresh = async () => {
    setError(null); setLoading(true);
    try { const res = await axios.get("/ledger/debit-accounts"); setVendors(res.data?.data || []); }
    catch (err) { setError(err.response?.data?.message || "Failed to refresh"); }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-amber-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading vendor accounts...</p>
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
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate(-1)} className="p-3 rounded-xl bg-white shadow-md hover:shadow-lg transition-all">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vendor Accounts</h1>
            <p className="text-gray-500 mt-1 text-sm">{vendors.length} vendors &middot; Accounts Payable</p>
          </div>
        </div>
        <button onClick={handleRefresh} disabled={loading} className="mt-3 sm:mt-0 p-3 rounded-xl bg-white shadow-md hover:shadow-lg transition-all">
          <RefreshCw size={20} className={loading ? "animate-spin text-amber-600" : "text-gray-600"} />
        </button>
      </div>

      {/* Flow Explanation Banner */}
      <div className="bg-white border border-amber-100 rounded-2xl p-5 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl">
            <ClipboardList size={18} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">Purchase Entry</span>
            <span className="text-xs text-amber-600">(We owe vendor)</span>
          </div>
          <div className="text-gray-400 text-xl font-light hidden sm:block">&rarr;</div>
          <div className="text-gray-400 text-xl font-light sm:hidden">&darr;</div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl">
            <Banknote size={18} className="text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-800">Payment Voucher</span>
            <span className="text-xs text-emerald-600">(We pay vendor)</span>
          </div>
          <div className="text-gray-400 text-xl font-light hidden sm:block">=</div>
          <div className="text-gray-400 text-xl font-light sm:hidden">&darr;</div>
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-xl">
            <Scale size={18} className="text-red-600" />
            <span className="text-sm font-semibold text-red-800">Outstanding Balance</span>
            <span className="text-xs text-red-600">(We still owe)</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-slate-100 rounded-xl"><Users size={20} className="text-slate-600" /></div>
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Total Vendors</p>
          <p className="text-2xl font-bold text-gray-900">{stats.count}</p>
          <p className="text-xs text-gray-400 mt-1">{stats.active} with outstanding</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-amber-50 rounded-xl"><ClipboardList size={20} className="text-amber-600" /></div>
            <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md">INVOICED</span>
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Total Invoiced</p>
          <p className="text-2xl font-bold text-amber-700">{fmtAED(stats.totalInvoiced)}</p>
          <p className="text-xs text-gray-400 mt-1">Purchase entries raised</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl"><Banknote size={20} className="text-emerald-600" /></div>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md">PAID</span>
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-emerald-700">{fmtAED(stats.totalPaid)}</p>
          <p className="text-xs text-gray-400 mt-1">Payment vouchers issued</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-red-50 rounded-xl"><DollarSign size={20} className="text-red-600" /></div>
            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md">OUTSTANDING</span>
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Outstanding</p>
          <p className="text-2xl font-bold text-red-700">{fmtAED(stats.outstanding)}</p>
          <p className="text-xs text-gray-400 mt-1">Amount yet to pay</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search vendor name or ID..." value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-300 transition-all" />
        </div>
        <button
          onClick={() => exportAccountVouchersExcel(filteredVendors, 'purchase', { partyName: searchTerm })}
          disabled={filteredVendors.length === 0}
          className="flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50">
          <Download size={18} /> Export
        </button>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-amber-50/80 to-orange-50/80">
          <h2 className="text-lg font-bold text-gray-900">Vendor Ledger Summary</h2>
          <p className="text-gray-500 text-sm mt-0.5">Click any row to view full transaction ledger</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Entries</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <span className="flex items-center justify-end gap-1">
                    <ClipboardList size={12} className="text-amber-500" /> Total Invoiced
                  </span>
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <span className="flex items-center justify-end gap-1">
                    <Banknote size={12} className="text-emerald-500" /> Total Paid
                  </span>
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Users size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="font-medium">No vendors found</p>
                  </td>
                </tr>
              ) : (
                paginated.map((v) => {
                  const invoiced = v.totalPayable || 0;
                  const paid = v.totalPaid || 0;
                  const outstanding = invoiced - paid;
                  return (
                    <tr key={v._id}
                      onClick={() => navigate(`/debit-accounts/vendor/${v._id}`)}
                      className="hover:bg-amber-50/50 cursor-pointer transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">{v.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{v.partyId}</div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="px-2.5 py-0.5 bg-gray-100 rounded-full text-sm font-medium text-gray-700">{v.totalInvoices || 0}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-semibold text-amber-700">{fmtAED(invoiced)}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-semibold text-emerald-600">{fmtAED(paid)}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={`font-bold text-lg ${outstanding > 0 ? "text-red-600" : outstanding < 0 ? "text-emerald-500" : "text-gray-400"}`}>
                          {fmtAED(outstanding)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/debit-accounts/vendor/${v._id}`); }}
                          className="text-amber-600 hover:text-amber-800 font-semibold flex items-center gap-1 mx-auto text-sm">
                          <Eye size={15} /> View Ledger
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {paginated.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={2} className="px-5 py-4 font-bold text-gray-700">Page Totals</td>
                  <td className="px-5 py-4 text-right font-bold text-amber-700">
                    {fmtAED(paginated.reduce((s, v) => s + (v.totalPayable || 0), 0))}
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-emerald-600">
                    {fmtAED(paginated.reduce((s, v) => s + (v.totalPaid || 0), 0))}
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-red-600">
                    {fmtAED(paginated.reduce((s, v) => s + ((v.totalPayable || 0) - (v.totalPaid || 0)), 0))}
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
