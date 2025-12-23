// src/pages/debit-accounts/VendorDetailsPage.jsx
// Accounts Payable Ledger - Liability Account (Credit Normal Balance)
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../../../axios/axios";
import { ArrowLeft, Users, DollarSign, RefreshCw, BookOpen, ArrowUpRight, ArrowDownRight, Info } from "lucide-react";

// Accounting Info Component
const AccountingLegend = () => (
  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-6">
    <div className="flex items-center gap-2 mb-2">
      <BookOpen size={16} className="text-amber-600" />
      <span className="text-sm font-bold text-amber-800">Accounts Payable - Liability Account</span>
    </div>
    <div className="flex flex-wrap gap-4 text-xs">
      <div className="flex items-center gap-1">
        <ArrowDownRight size={12} className="text-emerald-600" />
        <span className="text-gray-700"><strong>Credit</strong> = Purchase/Invoice (Increase Payable)</span>
      </div>
      <div className="flex items-center gap-1">
        <ArrowUpRight size={12} className="text-amber-600" />
        <span className="text-gray-700"><strong>Debit</strong> = Payment/Return (Decrease Payable)</span>
      </div>
    </div>
  </div>
);

const VendorDetailsPage = () => {
  const { vendorId } = useParams();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Fetch ledger with filters
  const fetchLedger = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter !== "all") params.append("type", typeFilter);

      const res = await axios.get(
        `/ledger/ledger/vendor/${vendorId}?${params.toString()}`
      );

      setVendor(res.data.data.party);
      setLedger(res.data.data.ledger || []);
    } catch (err) {
      console.error("Failed to fetch ledger:", err);
      setLedger([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    if (vendorId) {
      fetchLedger();
    }
  }, [vendorId, fromDate, toDate, statusFilter, typeFilter]);

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-GB"); // DD/MM/YYYY
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-2xl font-semibold text-purple-700">Loading ledger...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4 sm:p-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-3 text-purple-700 hover:text-purple-900 font-semibold transition-all hover:scale-105"
      >
        <ArrowLeft size={24} /> Back to Debit Accounts
      </button>

      {/* Header Card */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-3xl shadow-2xl p-8 mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-4 mb-3">
              <Users size={28} /> {vendor?.name || "Vendor Ledger"}
            </h1>
            <p className="text-amber-100 text-lg">Vendor ID: <span className="font-mono">{vendor?.partyId}</span></p>
            <p className="text-amber-200 text-sm mt-1">Account Type: Accounts Payable (Liability)</p>
          </div>
          <div className="text-right">
            <p className="text-amber-100 text-sm uppercase tracking-wider">Outstanding Balance</p>
            <p className="text-4xl font-bold text-white mt-2">
              AED {vendor?.currentBalance?.toFixed(2) || "0.00"}
            </p>
            <p className="text-amber-200 text-sm mt-1">{vendor?.currentBalance > 0 ? "Credit Balance (Payable)" : "Settled"}</p>
          </div>
        </div>
      </div>

      {/* Accounting Legend */}
      <AccountingLegend />

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8 mb-8 border border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800">Filters</h3>
          <div className="flex gap-3 mt-4 sm:mt-0">
            <button
              onClick={fetchLedger}
              className="px-5 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition flex items-center gap-2"
            >
              <RefreshCw size={18} /> Refresh
            </button>
            <button
              onClick={clearFilters}
              className="px-5 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 outline-none transition"
            >
              <option value="all">All Status</option>
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partially Paid</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Transaction Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 outline-none transition"
            >
              <option value="all">All Types</option>
              <option value="purchase_order">Purchase Invoice</option>
              <option value="purchase_return">Purchase Return</option>
              <option value="payment_received">Payment Received</option>
            </select>
          </div>
        </div>
      </div>


      <div className="bg-white rounded-3xl shadow-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800">
            Transaction Ledger
          </h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1 text-amber-700 bg-amber-50 px-3 py-1 rounded-lg">
              <ArrowUpRight size={12} /> Debit (Dr)
            </div>
            <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg">
              <ArrowDownRight size={12} /> Credit (Cr)
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-amber-50 to-orange-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Type</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Inv No</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-amber-700 uppercase">Debit (Dr)</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-emerald-700 uppercase">Credit (Cr)</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Balance</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Ref</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ledger.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                ledger.map((log, i) => {
                  // For A/P: Credit increases (invoice), Debit decreases (payment/return)
                  const isDebit = log.drCr === "Dr" || log.type.includes("Return") || log.type.includes("Payment");
                  return (
                    <tr key={i} className="hover:bg-amber-50 transition">
                      <td className="px-6 py-4">
                        {new Date(log.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            log.type.includes("Return") || log.type.includes("Payment")
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {log.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-gray-700">{log.invNo}</td>
                      <td className="px-6 py-4 text-right">
                        {isDebit ? (
                          <span className="text-amber-700 font-semibold flex items-center justify-end gap-1">
                            <ArrowUpRight size={14} />
                            AED {log.amount?.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isDebit ? (
                          <span className="text-emerald-700 font-semibold flex items-center justify-end gap-1">
                            <ArrowDownRight size={14} />
                            AED {log.amount?.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-red-600">
                        AED {log.balance?.toFixed(2)} <span className="text-xs opacity-70">Cr</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{log.ref}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
                            log.status === "PAID" ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VendorDetailsPage;
