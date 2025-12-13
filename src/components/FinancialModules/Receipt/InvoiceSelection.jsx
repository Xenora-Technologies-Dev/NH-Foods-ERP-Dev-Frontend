import { AlertCircle, Link as LinkIcon } from "lucide-react";
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
      </label>

      <div
        className={`border rounded-xl p-4 max-h-64 overflow-y-auto transition-all ${
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
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    isSelected
                      ? "border-purple-400 bg-purple-50 shadow-sm"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    {/* Left: Checkbox + Invoice Info */}
                    <div className="flex items-start space-x-3 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onInvoiceSelection(inv._id)}
                        className="mt-1 h-4 w-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {inv.transactionNo || inv.docno || "N/A"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {inv.date
                            ? new Date(inv.date).toLocaleDateString()
                            : "No date"}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-3 text-xs">
                          <span className="text-gray-600">
                            Total: <strong>{formatCurrency(inv.totalAmount)}</strong>
                          </span>
                          <span className="text-gray-600">
                            Paid: <strong>{formatCurrency(inv.paidAmount || 0)}</strong>
                          </span>
                          <span className="text-green-700 font-semibold">
                            Due: <strong>{formatCurrency(outstanding)}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount Input (only when selected) */}
                    {isSelected && (
                      <div className="ml-4 flex flex-col items-end space-y-2">
                        <input
                          type="number"
                          value={linkedItem?.amount || ""}
                          onChange={(e) =>
                            onInvoiceAmountChange(inv._id, e.target.value)
                          }
                          placeholder="0.00"
                          min="0"
                          max={outstanding}
                          step="0.01"
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                        />
                        <p className="text-xs text-gray-500">
                          Max: {formatCurrency(outstanding)}
                        </p>
                        {enteredAmount > outstanding && (
                          <p className="text-xs text-red-600">
                            Cannot exceed due amount
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