// src/components/AccountsModule/Purchase/PurchaseAccount.jsx
// Debit Accounts - Accounts Payable (Vendor Accounts)
// Accounting Principle: Liability accounts have a CREDIT normal balance
// When you purchase from a vendor, you CREDIT Accounts Payable (increase liability)
// When you pay a vendor, you DEBIT Accounts Payable (decrease liability)

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
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CreditCard,
  Receipt,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import Select from "react-select";

// Toast Component
const Toast = ({ show, message, type }) =>
  show && (
    <div
      className={`fixed top-4 right-4 p-4 rounded-xl shadow-2xl text-white z-50 animate-slide-in ${
        type === "success"
          ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
          : "bg-gradient-to-r from-red-500 to-red-600"
      }`}
    >
      <div className="flex items-center space-x-3">
        {type === "success" ? (
          <CheckCircle size={20} className="animate-bounce" />
        ) : (
          <XCircle size={20} className="animate-pulse" />
        )}
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );

// Currency formatter with debit/credit indication
const formatCurrency = (amount, type = "normal") => {
  const num = Number(amount) || 0;
  const abs = Math.abs(num).toFixed(2);
  const formattedAbs = parseFloat(abs).toLocaleString();
  
  if (type === "debit") {
    return (
      <span className="inline-flex items-center font-semibold text-amber-700">
        <ArrowUpRight size={14} className="mr-1" />
        <span className="text-xs mr-1 opacity-70">AED</span>
        {formattedAbs}
      </span>
    );
  }
  if (type === "credit") {
    return (
      <span className="inline-flex items-center font-semibold text-emerald-700">
        <ArrowDownRight size={14} className="mr-1" />
        <span className="text-xs mr-1 opacity-70">AED</span>
        {formattedAbs}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center font-semibold text-gray-900">
      <span className="text-xs mr-1 opacity-70">AED</span>
      {formattedAbs}
    </span>
  );
};

// Stat Card Component
const StatCard = ({
  title,
  count,
  icon,
  bgColor,
  textColor,
  borderColor,
  iconBg,
  iconColor,
  subText,
  accountingNote,
}) => (
  <div
    className={`${bgColor} ${borderColor} rounded-2xl p-6 border-2 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1 cursor-default`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 ${iconBg} rounded-xl shadow-md`}>
        <div className={iconColor}>{icon}</div>
      </div>
      {accountingNote && (
        <span className={`text-xs ${textColor} font-medium px-2 py-1 bg-white/50 rounded-lg`}>
          {accountingNote}
        </span>
      )}
    </div>
    <h3 className={`text-sm font-semibold ${textColor} mb-2 uppercase tracking-wide`}>
      {title}
    </h3>
    <p className="text-3xl font-bold text-gray-900 mb-1">{count}</p>
    <p className="text-xs text-gray-600 font-medium">{subText}</p>
  </div>
);

// Accounting Info Banner
const AccountingInfoBanner = () => (
  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 mb-6">
    <div className="flex items-start gap-3">
      <div className="p-2 bg-amber-100 rounded-xl">
        <BookOpen size={20} className="text-amber-600" />
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-bold text-amber-800 mb-1">
          Accounts Payable (Liability Account)
        </h4>
        <p className="text-xs text-amber-700 mb-2">
          Double-Entry Accounting Principle: Liability accounts have a <strong>Credit</strong> normal balance.
        </p>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2 bg-white/70 px-3 py-1.5 rounded-lg">
            <ArrowDownRight size={14} className="text-emerald-600" />
            <span className="text-gray-700">
              <strong>Credit</strong> = Purchase Invoice (Increase Payable)
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white/70 px-3 py-1.5 rounded-lg">
            <ArrowUpRight size={14} className="text-amber-600" />
            <span className="text-gray-700">
              <strong>Debit</strong> = Payment Made (Decrease Payable)
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white/70 px-3 py-1.5 rounded-lg">
            <DollarSign size={14} className="text-red-600" />
            <span className="text-gray-700">
              <strong>Balance</strong> = Credits - Debits (Amount Owed)
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Pagination Component
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
}) => {
  const pageNumbers = useMemo(() => {
    const pages = [];
    const max = 5;
    let start = Math.max(1, currentPage - Math.floor(max / 2));
    let end = Math.min(totalPages, start + max - 1);
    if (end - start + 1 < max) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  const options = [
    { value: 10, label: "10 per page" },
    { value: 25, label: "25 per page" },
    { value: 50, label: "50 per page" },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-gray-50 border-t border-gray-200">
      <div className="flex items-center space-x-2 mb-4 sm:mb-0">
        <span className="text-sm text-gray-600">Items per page:</span>
        <Select
          value={options.find((o) => o.value === itemsPerPage)}
          onChange={(opt) => onItemsPerPageChange(opt.value)}
          options={options}
          className="w-32"
          classNamePrefix="react-select"
        />
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={16} />
        </button>
        {pageNumbers.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              currentPage === p
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

// Main Component
const DebitAccountsManagement = () => {
  const navigate = useNavigate();

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAccountingInfo, setShowAccountingInfo] = useState(true);

  // Fetch vendors from backend
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/ledger/debit-accounts");
        setVendors(res.data.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load vendors");
      } finally {
        setLoading(false);
      }
    };
    fetchVendors();
  }, []);

  const filteredVendors = useMemo(() => {
    return vendors.filter(
      (v) =>
        v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.partyId?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vendors, searchTerm]);

  const paginated = filteredVendors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage) || 1;

  // Calculate accounting statistics
  const stats = useMemo(() => {
    const totalCredit = vendors.reduce((s, v) => s + (v.totalPayable || 0), 0); // Total invoiced (Credit entries)
    const totalDebit = vendors.reduce((s, v) => s + (v.totalPaid || 0), 0); // Total paid (Debit entries)
    const balance = totalCredit - totalDebit; // Net payable
    
    return {
      totalVendors: vendors.length,
      totalCredit, // Purchase invoices (Credit to A/P)
      totalDebit, // Payments made (Debit to A/P)
      totalBalance: balance, // Outstanding payable
      activeVendors: vendors.filter(v => (v.balance || 0) > 0).length,
    };
  }, [vendors]);

  const handleRefresh = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await axios.get("/ledger/debit-accounts");
      setVendors(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to refresh");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-amber-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">Loading vendor accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 p-4 sm:p-6">
      <style>{`
        @keyframes slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slide-in { animation: slide-in .3s ease-out; }
      `}</style>

      <Toast show={!!error} message={error} type="error" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-3 rounded-xl bg-white shadow-md hover:shadow-lg transition-all"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">
              Accounts Payable
            </h1>
            <p className="text-gray-600 mt-1 font-medium flex items-center gap-2">
              <CreditCard size={16} />
              {vendors.length} Vendor Accounts (Debit Ledger)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <button
            onClick={() => setShowAccountingInfo(!showAccountingInfo)}
            className={`p-3 rounded-xl transition-all ${
              showAccountingInfo ? "bg-amber-100 text-amber-700" : "bg-white text-gray-600"
            } shadow-md hover:shadow-lg`}
            title="Toggle accounting info"
          >
            <Info size={20} />
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-3 rounded-xl bg-white shadow-md hover:shadow-lg transition-all"
          >
            <RefreshCw size={20} className={loading ? "animate-spin text-amber-600" : "text-gray-600"} />
          </button>
        </div>
      </div>

      {/* Accounting Info Banner */}
      {showAccountingInfo && <AccountingInfoBanner />}

      {/* Stats - Accounting Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          title="Total Vendors"
          count={stats.totalVendors}
          icon={<Users size={24} />}
          bgColor="bg-slate-50"
          textColor="text-slate-700"
          borderColor="border-slate-200"
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
          subText="Registered suppliers"
        />
        <StatCard
          title="Total Credits"
          count={`AED ${stats.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<ArrowDownRight size={24} />}
          bgColor="bg-emerald-50"
          textColor="text-emerald-700"
          borderColor="border-emerald-200"
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
          subText="Purchase invoices"
          accountingNote="Cr"
        />
        <StatCard
          title="Total Debits"
          count={`AED ${stats.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<ArrowUpRight size={24} />}
          bgColor="bg-amber-50"
          textColor="text-amber-700"
          borderColor="border-amber-200"
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          subText="Payments made"
          accountingNote="Dr"
        />
        <StatCard
          title="Net Payable"
          count={`AED ${stats.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<DollarSign size={24} />}
          bgColor="bg-red-50"
          textColor="text-red-700"
          borderColor="border-red-200"
          iconBg="bg-red-100"
          iconColor="text-red-600"
          subText="Outstanding balance"
          accountingNote="Cr Balance"
        />
        <StatCard
          title="Active Accounts"
          count={stats.activeVendors}
          icon={<AlertCircle size={24} />}
          bgColor="bg-purple-50"
          textColor="text-purple-700"
          borderColor="border-purple-200"
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          subText="With outstanding"
        />
      </div>

      {/* Search */}
      <div className="max-w-md mb-6">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by vendor name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-300 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <BookOpen size={20} className="text-amber-600" />
                Vendor Ledger Summary
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Click any vendor to view detailed transaction ledger
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1 text-emerald-700">
                <ArrowDownRight size={14} /> Credit = Invoice
              </div>
              <div className="flex items-center gap-1 text-amber-700">
                <ArrowUpRight size={14} /> Debit = Payment
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Vendor ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Vendor Name
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Invoices
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <span className="flex items-center justify-end gap-1">
                    Credits <span className="text-emerald-600">(Cr)</span>
                  </span>
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <span className="flex items-center justify-end gap-1">
                    Debits <span className="text-amber-600">(Dr)</span>
                  </span>
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <Users size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="font-medium">No vendors found</p>
                    <p className="text-sm">Try adjusting your search criteria</p>
                  </td>
                </tr>
              ) : (
                paginated.map((v) => {
                  const balance = (v.totalPayable || 0) - (v.totalPaid || 0);
                  return (
                    <tr
                      key={v._id}
                      onClick={() => navigate(`/debit-accounts/vendor/${v._id}`)}
                      className="hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 cursor-pointer transition-all"
                    >
                      <td className="px-6 py-4 font-mono text-sm text-amber-700 font-bold">
                        {v.partyId}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {v.name}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium">
                          {v.totalInvoices || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {formatCurrency(v.totalPayable || 0, "credit")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {formatCurrency(v.totalPaid || 0, "debit")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-bold ${balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                          AED {balance.toFixed(2)}
                          <span className="text-xs ml-1 opacity-70">
                            {balance > 0 ? "Cr" : balance < 0 ? "Dr" : ""}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/debit-accounts/vendor/${v._id}`);
                          }}
                          className="text-amber-600 hover:text-amber-800 font-semibold flex items-center gap-1 mx-auto"
                        >
                          <Eye size={16} /> Ledger
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {paginated.length > 0 && (
              <tfoot className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <td colSpan={3} className="px-6 py-4 font-bold text-gray-900">
                    Page Totals
                  </td>
                  <td className="px-6 py-4 text-right">
                    {formatCurrency(
                      paginated.reduce((s, v) => s + (v.totalPayable || 0), 0),
                      "credit"
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {formatCurrency(
                      paginated.reduce((s, v) => s + (v.totalPaid || 0), 0),
                      "debit"
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-red-600">
                    AED {paginated.reduce((s, v) => s + ((v.totalPayable || 0) - (v.totalPaid || 0)), 0).toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
    </div>
  );
};

export default DebitAccountsManagement;
