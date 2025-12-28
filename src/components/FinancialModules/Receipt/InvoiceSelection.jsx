import { AlertCircle, Link as LinkIcon, DollarSign } from "lucide-react";
import { formatCurrency } from "./utils";

const InvoiceSelection = ({
  availableInvoices,
  linkedInvoices,
  onInvoiceSelection,
  onInvoiceAmountChange,
  customerId,
  error,
}) => {
  return (
    <div className="md:col-span-2">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        <LinkIcon size={16} className="inline mr-2" /> Linked Invoice(s) *
        <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
          {availableInvoices.length} Available
        </span>
      </label>

      <div
        className={`border rounded-xl p-4 max-h-screen overflow-y-auto transition-all ${
          error ? "border-red-300 bg-red-50" : "border-gray-300 bg-white"
        }`}
      >
        {availableInvoices.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p className="text-sm">
              {customerId
                ? "No outstanding invoices found for this customer"
                : "Please select a customer to view outstanding invoices"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableInvoices.map((inv) => {
              const isSelected = linkedInvoices.some(
                (item) => item.invoiceId === inv._id
              );
              const linkedItem = linkedInvoices.find(
                (item) => item.invoiceId === inv._id
              );
              const enteredAmount = Number(linkedItem?.amount || 0);
              const outstanding = inv.outstandingAmount || inv.totalAmount - (inv.paidAmount || 0);

              return (
                <div
                  key={inv._id}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? "border-purple-400 bg-purple-50/50 shadow-md"
                      : "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onInvoiceSelection(inv._id)}
                        className="h-5 w-5 text-purple-600 rounded focus:ring-purple-500 border-gray-300 cursor-pointer"
                      />
                    </div>

                    {/* Invoice Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900 text-base">
                          {inv.transactionNo || inv.docno || "N/A"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          inv.status === "approved" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {inv.status || "Pending"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        {inv.date ? new Date(inv.date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        }) : "No date"}
                      </p>

                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="bg-gray-100 rounded-lg px-3 py-2">
                          <span className="text-gray-500 text-xs block">Total</span>
                          <span className="font-semibold text-gray-800">{formatCurrency(inv.totalAmount)}</span>
                        </div>
                        <div className="bg-blue-50 rounded-lg px-3 py-2">
                          <span className="text-blue-500 text-xs block">Paid</span>
                          <span className="font-semibold text-blue-700">{formatCurrency(inv.paidAmount || 0)}</span>
                        </div>
                        <div className="bg-emerald-50 rounded-lg px-3 py-2">
                          <span className="text-emerald-500 text-xs block">Due</span>
                          <span className="font-bold text-emerald-700">{formatCurrency(outstanding)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Amount Input (only when selected) */}
                    {isSelected && (
                      <div className="flex flex-col items-end min-w-[160px]">
                        <label className="text-xs text-gray-500 mb-1 font-medium">Amount to Receive</label>
                        <div className="relative w-full">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                            AED
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={linkedItem?.amount || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              // Allow empty, numbers, and one decimal point
                              if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                onInvoiceAmountChange(inv._id, val);
                              }
                            }}
                            onBlur={(e) => {
                              // Format on blur
                              const num = parseFloat(e.target.value) || 0;
                              const clamped = Math.min(Math.max(0, num), outstanding);
                              onInvoiceAmountChange(inv._id, clamped.toFixed(2));
                            }}
                            placeholder="0.00"
                            className="w-full pl-12 pr-3 py-3 border-2 border-purple-300 rounded-xl text-right text-lg font-semibold focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
                          />
                        </div>
                        <div className="flex items-center justify-between w-full mt-2">
                          <button
                            type="button"
                            onClick={() => onInvoiceAmountChange(inv._id, outstanding.toFixed(2))}
                            className="text-xs text-purple-600 hover:text-purple-800 font-medium hover:underline"
                          >
                            Pay Full Amount
                          </button>
                          <span className="text-xs text-gray-400">
                            Max: {formatCurrency(outstanding)}
                          </span>
                        </div>
                        {enteredAmount > outstanding && (
                          <p className="text-xs text-red-600 mt-1 flex items-center">
                            <AlertCircle size={12} className="mr-1" />
                            Exceeds due amount
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center">
          <AlertCircle size={14} className="mr-1" />
          {error}
        </p>
      )}
    </div>
  );
};

export default InvoiceSelection;