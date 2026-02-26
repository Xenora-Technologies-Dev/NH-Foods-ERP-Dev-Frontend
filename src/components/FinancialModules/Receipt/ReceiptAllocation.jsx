import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  Search,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Link2,
  Loader2,
  Banknote,
  FileText,
  Save,
} from "lucide-react";
import axios from "../../../axios/axios";
import { formatCurrency } from "./utils";

/**
 * ReceiptAllocation – Enterprise Stage 2 Allocation Component
 * 
 * Allows allocating unallocated/partially-allocated receipt funds
 * to specific customer invoices. Follows SAP/Oracle/Tally model.
 * 
 * Props:
 *   receipt      – The receipt voucher object (with allocation fields)
 *   onBack       – Callback to navigate back to receipt list
 *   onSuccess    – Callback after successful allocation
 *   showToast    – Toast message handler
 */
const ReceiptAllocation = ({ receipt, onBack, onSuccess, showToast }) => {
  const [invoices, setInvoices] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [allocationHistory, setAllocationHistory] = useState([]);

  // Normalized receipt data
  const receiptData = useMemo(() => ({
    _id: receipt._id,
    voucherNo: receipt.voucherNo,
    totalAmount: receipt.totalAmount,
    allocatedAmount: receipt.allocatedAmount ?? 0,
    unallocatedAmount: receipt.unallocatedAmount ?? receipt.totalAmount,
    allocationStatus: receipt.allocationStatus || "UNALLOCATED",
    receiptType: receipt.receiptType || "STANDARD",
    partyId: (receipt.partyId && typeof receipt.partyId === "object") ? receipt.partyId._id : receipt.partyId,
    partyName: receipt.partyName || receipt.partyId?.customerName || "",
    isLegacy: receipt.isLegacy || receipt.receiptType === "LEGACY",
  }), [receipt]);

  // Fetch unpaid/approved invoices for the customer
  const fetchInvoices = useCallback(async () => {
    if (!receiptData.partyId) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("partyId", receiptData.partyId);
      params.append("partyType", "Customer");
      params.append("type", "sales_order");
      params.append("limit", "500");

      const response = await axios.get(`/transactions/transactions?${params.toString()}`);
      const data = response.data?.data || response.data || [];
      const items = Array.isArray(data) ? data : data.transactions || data.items || [];

      const outstanding = items
        .filter((inv) => {
          const balance = Number(inv.outstandingAmount || 0);
          const status = String(inv.status || "").toLowerCase();
          return balance > 0 && (status === "approved" || status === "partial" || status === "unpaid");
        })
        .map((inv) => ({
          _id: inv._id,
          transactionNo: inv.transactionNo || inv.docno || "N/A",
          date: inv.date,
          totalAmount: Number(inv.totalAmount || 0),
          paidAmount: Number(inv.paidAmount || 0),
          outstandingAmount: Number(inv.outstandingAmount || 0),
          status: inv.status,
        }));

      setInvoices(outstanding);
    } catch (err) {
      console.error("Error fetching invoices:", err);
      showToast?.("Failed to load outstanding invoices", "error");
    } finally {
      setIsLoading(false);
    }
  }, [receiptData.partyId, showToast]);

  // Fetch allocation history
  const fetchAllocationHistory = useCallback(async () => {
    try {
      const response = await axios.get(`/vouchers/receipt/${receiptData._id}/allocation-history`);
      setAllocationHistory(response.data?.data?.allocationHistory || []);
    } catch (err) {
      console.error("Error fetching allocation history:", err);
    }
  }, [receiptData._id]);

  useEffect(() => {
    fetchInvoices();
    fetchAllocationHistory();
  }, [fetchInvoices, fetchAllocationHistory]);

  // Current total allocation amount
  const totalAllocationAmount = useMemo(() => {
    return allocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  }, [allocations]);

  const remainingUnallocated = useMemo(() => {
    return Math.max(0, receiptData.unallocatedAmount - totalAllocationAmount);
  }, [receiptData.unallocatedAmount, totalAllocationAmount]);

  // Toggle invoice for allocation
  const toggleInvoice = useCallback((invoice) => {
    setAllocations((prev) => {
      const exists = prev.find((a) => a.invoiceId === invoice._id);
      if (exists) {
        return prev.filter((a) => a.invoiceId !== invoice._id);
      }
      // Auto-fill with min(outstanding, remaining unallocated)
      const maxAllocatable = Math.min(
        invoice.outstandingAmount,
        receiptData.unallocatedAmount - prev.reduce((s, a) => s + (Number(a.amount) || 0), 0)
      );
      return [
        ...prev,
        {
          invoiceId: invoice._id,
          transactionNo: invoice.transactionNo,
          outstandingAmount: invoice.outstandingAmount,
          amount: Math.max(0, maxAllocatable).toFixed(2),
        },
      ];
    });
  }, [receiptData.unallocatedAmount]);

  // Update allocation amount
  const updateAllocationAmount = useCallback((invoiceId, value) => {
    setAllocations((prev) =>
      prev.map((a) =>
        a.invoiceId === invoiceId ? { ...a, amount: value } : a
      )
    );
  }, []);

  // Submit allocations
  const handleSubmit = useCallback(async () => {
    if (allocations.length === 0) {
      showToast?.("Please select at least one invoice to allocate", "error");
      return;
    }

    // Validate amounts
    for (const alloc of allocations) {
      const amt = Number(alloc.amount);
      if (isNaN(amt) || amt <= 0) {
        showToast?.(`Invalid amount for invoice ${alloc.transactionNo}`, "error");
        return;
      }
      if (amt > alloc.outstandingAmount + 0.01) {
        showToast?.(`Amount exceeds outstanding for ${alloc.transactionNo}`, "error");
        return;
      }
    }

    if (totalAllocationAmount > receiptData.unallocatedAmount + 0.01) {
      showToast?.("Total allocation exceeds unallocated amount", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        allocations: allocations.map((a) => ({
          invoiceId: a.invoiceId,
          amount: Number(a.amount),
        })),
      };

      const response = await axios.post(
        `/vouchers/receipt/${receiptData._id}/allocate`,
        payload
      );

      showToast?.(
        response.data?.data?.message || "Allocation successful!",
        "success"
      );
      onSuccess?.();
    } catch (err) {
      showToast?.(
        err.response?.data?.message || "Allocation failed",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [allocations, receiptData, totalAllocationAmount, showToast, onSuccess]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    if (!searchTerm.trim()) return invoices;
    const term = searchTerm.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.transactionNo.toLowerCase().includes(term) ||
        String(inv.totalAmount).includes(term)
    );
  }, [invoices, searchTerm]);

  // Status badge
  const statusBadge = {
    UNALLOCATED: { color: "bg-red-100 text-red-700 border-red-300", icon: "🔴" },
    PARTIAL: { color: "bg-yellow-100 text-yellow-700 border-yellow-300", icon: "🟡" },
    ALLOCATED: { color: "bg-green-100 text-green-700 border-green-300", icon: "🟢" },
  }[receiptData.allocationStatus] || { color: "bg-gray-100 text-gray-600", icon: "⚪" };

  if (receiptData.isLegacy) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 mb-6 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} /> Back to Receipts
          </button>
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={40} className="text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Legacy Receipt</h2>
            <p className="text-gray-600 mb-4">
              This is a legacy receipt (<strong>{receiptData.voucherNo}</strong>) that was created before the allocation workflow was introduced.
            </p>
            <p className="text-gray-500">
              Legacy receipts are treated as fully allocated and cannot be modified.
              No re-allocation is needed.
            </p>
            <div className="mt-6 inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold border border-green-300">
              🟢 Fully Allocated (Legacy)
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-3 rounded-xl bg-white shadow-md hover:shadow-lg transition-all"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Allocate Receipt — {receiptData.voucherNo}
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                {receiptData.partyName} • Stage 2: Invoice Allocation
              </p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${statusBadge.color}`}>
            {statusBadge.icon} {receiptData.allocationStatus}
          </span>
        </div>

        {/* Receipt Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <p className="text-xs text-gray-500 uppercase font-medium">Total Amount</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(receiptData.totalAmount)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <p className="text-xs text-gray-500 uppercase font-medium">Already Allocated</p>
            <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(receiptData.allocatedAmount)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4 border-amber-200 bg-amber-50">
            <p className="text-xs text-amber-600 uppercase font-medium">Available to Allocate</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{formatCurrency(receiptData.unallocatedAmount)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <p className="text-xs text-gray-500 uppercase font-medium">This Session</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(totalAllocationAmount)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{formatCurrency(remainingUnallocated)} remaining</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Available Invoices */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border">
            <div className="p-5 border-b">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText size={18} /> Outstanding Invoices
              </h3>
              <div className="relative mt-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-purple-500 mr-2" />
                  Loading invoices...
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText size={32} className="mx-auto mb-2 opacity-40" />
                  <p>No outstanding invoices found</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Select</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Outstanding</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Allocate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInvoices.map((inv) => {
                      const alloc = allocations.find((a) => a.invoiceId === inv._id);
                      const isSelected = !!alloc;
                      return (
                        <tr
                          key={inv._id}
                          className={`transition-colors ${isSelected ? "bg-purple-50" : "hover:bg-gray-50"}`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleInvoice(inv)}
                              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Link2 size={12} className="text-blue-500" />
                              <span className="text-sm font-medium text-gray-900">{inv.transactionNo}</span>
                            </div>
                            <span className="text-xs text-gray-400">{new Date(inv.date).toLocaleDateString()}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            {formatCurrency(inv.totalAmount)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-red-600">
                            {formatCurrency(inv.outstandingAmount)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isSelected ? (
                              <input
                                type="number"
                                min="0"
                                max={inv.outstandingAmount}
                                step="0.01"
                                value={alloc.amount}
                                onChange={(e) => updateAllocationAmount(inv._id, e.target.value)}
                                className="w-28 px-2 py-1.5 border rounded-lg text-sm text-right focus:ring-2 focus:ring-purple-500"
                              />
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right: Allocation Summary & History */}
          <div className="space-y-6">
            {/* Current Allocation */}
            <div className="bg-white rounded-2xl shadow-xl border p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Banknote size={18} /> Allocation Summary
              </h3>
              {allocations.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  Select invoices from the left to allocate receipt funds
                </p>
              ) : (
                <div className="space-y-2 mb-4">
                  {allocations.map((alloc) => (
                    <div key={alloc.invoiceId} className="flex justify-between items-center p-2 bg-purple-50 rounded-lg">
                      <div>
                        <span className="text-xs font-medium text-purple-700">{alloc.transactionNo}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(Number(alloc.amount) || 0)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between">
                    <span className="text-sm font-semibold text-gray-700">Total</span>
                    <span className="text-sm font-bold text-purple-700">{formatCurrency(totalAllocationAmount)}</span>
                  </div>
                </div>
              )}

              {/* Validation warnings */}
              {totalAllocationAmount > receiptData.unallocatedAmount + 0.01 && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <XCircle size={16} className="text-red-500 flex-shrink-0" />
                  <span className="text-xs text-red-700">
                    Total allocation ({formatCurrency(totalAllocationAmount)}) exceeds unallocated amount ({formatCurrency(receiptData.unallocatedAmount)})
                  </span>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || allocations.length === 0 || totalAllocationAmount > receiptData.unallocatedAmount + 0.01}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Allocate {formatCurrency(totalAllocationAmount)}
                  </>
                )}
              </button>
            </div>

            {/* Allocation History */}
            {allocationHistory.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl border p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Previous Allocations</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {allocationHistory.map((h, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg text-xs">
                      <div>
                        <span className="font-medium text-gray-700">{h.invoiceNo || "—"}</span>
                        <span className="text-gray-400 ml-2">
                          {h.allocatedAt ? new Date(h.allocatedAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <span className="font-bold text-green-600">{formatCurrency(h.allocatedAmount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptAllocation;
