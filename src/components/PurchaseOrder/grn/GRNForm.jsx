import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  Package,
  Building,
  Calendar,
  Hash,
  Save,
  Truck,
  User,
  FileText,
  CheckCircle,
  AlertCircle,
  Plus,
  Minus,
} from "lucide-react";
import Select from "react-select";

const GRNForm = ({
  purchaseOrder,
  vendors,
  stockItems,
  onSubmit,
  onBack,
  addNotification,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    grnDate: new Date().toISOString().slice(0, 10),
    receivedDate: new Date().toISOString().slice(0, 10),
    deliveryNoteNo: "",
    deliveryChallanNo: "",
    vehicleNo: "",
    driverName: "",
    notes: "",
    internalNotes: "",
    receivedBy: "",
  });

  // Initialize items from PO with receive quantities
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (purchaseOrder?.items) {
      setItems(
        purchaseOrder.items.map((item) => {
          const poQty = item.poQty || item.qty || 0;
          const vatPercent = item.vatPercent || 0;
          
          // In Transaction model: lineTotal = (qty * price) + vatAmount (includes VAT)
          // We need to get the pre-VAT unit price
          // Best approach: Always calculate from lineTotal to ensure consistency
          
          let unitRate = 0;
          
          // Primary: Calculate from lineTotal (most reliable since lineTotal is always stored)
          if (item.lineTotal && poQty > 0) {
            // lineTotal = (qty * price) + (qty * price * vat/100) = qty * price * (1 + vat/100)
            // So: price = lineTotal / (qty * (1 + vat/100))
            const vatMultiplier = 1 + (vatPercent / 100);
            unitRate = item.lineTotal / (poQty * vatMultiplier);
          }
          
          // Fallback: Use price field if lineTotal not available
          if (!unitRate && item.price) {
            unitRate = item.price;
          }
          
          // Last fallback: Use rate field
          if (!unitRate) {
            unitRate = item.rate || 0;
          }
          
          return {
            itemId: item.itemId,
            itemCode: item.itemCode || "",
            description: item.description || "",
            poQty: poQty,
            previouslyReceivedQty: item.previouslyReceivedQty || item.totalReceived || 0,
            pendingQty: item.pendingQty || 0,
            receivedQty: item.pendingQty || 0, // Default to full pending
            rate: unitRate,
            price: unitRate,
            lineTotal: item.lineTotal || 0,
            vatPercent: vatPercent,
            vatAmount: item.vatAmount || 0,
            grandTotal: item.grandTotal || 0,
            brand: item.brand || "",
            origin: item.origin || "",
            condition: "Good",
            remarks: "",
            selected: item.pendingQty > 0,
          };
        })
      );
    }
  }, [purchaseOrder]);

  const vendor = useMemo(() => {
    return vendors.find((v) => v._id === (purchaseOrder?.partyId?._id || purchaseOrder?.partyId)) || {};
  }, [vendors, purchaseOrder]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleItemChange = useCallback((index, field, value) => {
    setItems((prev) => {
      const newItems = [...prev];
      const item = { ...newItems[index] };

      if (field === "receivedQty") {
        const numValue = parseFloat(value) || 0;
        // Cannot exceed pending quantity
        item.receivedQty = Math.min(Math.max(0, numValue), item.pendingQty);
        item.selected = item.receivedQty > 0;
      } else if (field === "selected") {
        item.selected = value;
        if (!value) {
          item.receivedQty = 0;
        } else if (item.receivedQty === 0) {
          item.receivedQty = item.pendingQty;
        }
      } else {
        item[field] = value;
      }

      newItems[index] = item;
      return newItems;
    });
  }, []);

  const handleSelectAll = useCallback((selected) => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: selected && item.pendingQty > 0,
        receivedQty: selected && item.pendingQty > 0 ? item.pendingQty : 0,
      }))
    );
  }, []);

  const handleReceiveAll = useCallback(() => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: item.pendingQty > 0,
        receivedQty: item.pendingQty,
      }))
    );
  }, []);

  // Calculate totals
  const totals = useMemo(() => {
    const selectedItems = items.filter((item) => item.selected && item.receivedQty > 0);
    const totalQty = selectedItems.reduce((sum, item) => sum + item.receivedQty, 0);
    const subtotal = selectedItems.reduce(
      (sum, item) => sum + item.receivedQty * (item.rate || item.price || 0),
      0
    );
    const totalVat = selectedItems.reduce((sum, item) => {
      const lineValue = item.receivedQty * (item.rate || item.price || 0);
      return sum + (lineValue * (item.vatPercent || 0)) / 100;
    }, 0);
    const grandTotal = subtotal + totalVat;

    return {
      itemCount: selectedItems.length,
      totalQty,
      subtotal,
      totalVat,
      grandTotal,
    };
  }, [items]);

  const validateForm = useCallback(() => {
    const errors = [];

    if (!formData.grnDate) errors.push("GRN Date is required");
    if (!formData.receivedDate) errors.push("Received Date is required");

    const selectedItems = items.filter((item) => item.selected && item.receivedQty > 0);
    if (selectedItems.length === 0) {
      errors.push("At least one item must be selected with quantity > 0");
    }

    for (const item of selectedItems) {
      if (item.receivedQty > item.pendingQty) {
        errors.push(`${item.description}: Received qty cannot exceed pending qty`);
      }
    }

    return errors;
  }, [formData, items]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();
    if (errors.length > 0) {
      errors.forEach((err) => addNotification(err, "error"));
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedItems = items
        .filter((item) => item.selected && item.receivedQty > 0)
        .map((item) => ({
          itemId: item.itemId,
          itemCode: item.itemCode,
          description: item.description,
          receivedQty: item.receivedQty,
          condition: item.condition,
          remarks: item.remarks,
        }));

      const grnData = {
        purchaseOrderId: purchaseOrder._id,
        ...formData,
        items: selectedItems,
      };

      await onSubmit(grnData);
    } catch (e) {
      console.error("Submit error:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Goods Received Note</h1>
          <p className="text-gray-500">
            PO: {purchaseOrder?.transactionNo || purchaseOrder?.orderNumber}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - PO & Vendor Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* PO Info Card */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Purchase Order Details
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500">PO Number</label>
                  <p className="font-medium text-blue-600">
                    {purchaseOrder?.transactionNo || purchaseOrder?.orderNumber}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">PO Date</label>
                  <p className="font-medium">
                    {new Date(purchaseOrder?.date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Expected Delivery</label>
                  <p className="font-medium">
                    {purchaseOrder?.deliveryDate
                      ? new Date(purchaseOrder?.deliveryDate).toLocaleDateString()
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">PO Amount</label>
                  <p className="font-medium text-lg">
                    AED {(purchaseOrder?.totalAmount || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Vendor Info Card */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                Vendor Details
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500">Vendor Name</label>
                  <p className="font-medium">
                    {vendor.vendorName || purchaseOrder?.vendorName || "Unknown"}
                  </p>
                </div>
                {vendor.trnNO && (
                  <div>
                    <label className="text-sm text-gray-500">TRN</label>
                    <p className="font-medium">{vendor.trnNO}</p>
                  </div>
                )}
                {purchaseOrder?.vendorReference && (
                  <div>
                    <label className="text-sm text-gray-500">Vendor Reference</label>
                    <p className="font-medium">{purchaseOrder.vendorReference}</p>
                  </div>
                )}
              </div>
            </div>

            {/* GRN Details Card */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                GRN Details
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GRN Date *
                  </label>
                  <input
                    type="date"
                    name="grnDate"
                    value={formData.grnDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Received Date *
                  </label>
                  <input
                    type="date"
                    name="receivedDate"
                    value={formData.receivedDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Note No.
                  </label>
                  <input
                    type="text"
                    name="deliveryNoteNo"
                    value={formData.deliveryNoteNo}
                    onChange={handleInputChange}
                    placeholder="Enter delivery note number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Challan No.
                  </label>
                  <input
                    type="text"
                    name="deliveryChallanNo"
                    value={formData.deliveryChallanNo}
                    onChange={handleInputChange}
                    placeholder="Enter challan number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Info Card */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                Delivery Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle No.
                  </label>
                  <input
                    type="text"
                    name="vehicleNo"
                    value={formData.vehicleNo}
                    onChange={handleInputChange}
                    placeholder="Enter vehicle number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver Name
                  </label>
                  <input
                    type="text"
                    name="driverName"
                    value={formData.driverName}
                    onChange={handleInputChange}
                    placeholder="Enter driver name"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Received By
                  </label>
                  <input
                    type="text"
                    name="receivedBy"
                    value={formData.receivedBy}
                    onChange={handleInputChange}
                    placeholder="Name of person receiving goods"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items Card */}
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Items to Receive
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleReceiveAll}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                  >
                    Receive All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        <input
                          type="checkbox"
                          checked={items.every((i) => !i.pendingQty || i.selected)}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Item
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        PO Qty
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Received
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Pending
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Receive Now
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Rate
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Condition
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item, index) => {
                      const lineAmount = item.receivedQty * (item.rate || item.price || 0);
                      const lineVat = (lineAmount * (item.vatPercent || 0)) / 100;
                      const lineTotal = lineAmount + lineVat;

                      return (
                        <tr
                          key={item.itemId || index}
                          className={`${
                            item.pendingQty === 0
                              ? "bg-gray-50 opacity-60"
                              : item.selected
                              ? "bg-blue-50"
                              : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={(e) =>
                                handleItemChange(index, "selected", e.target.checked)
                              }
                              disabled={item.pendingQty === 0}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">
                                {item.description}
                              </p>
                              <p className="text-xs text-gray-500">
                                {item.itemCode}
                                {item.brand && ` | ${item.brand}`}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-medium">
                            {item.poQty}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-green-600">
                              {item.previouslyReceivedQty}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-1 rounded-full text-sm ${
                                item.pendingQty > 0
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {item.pendingQty}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleItemChange(
                                    index,
                                    "receivedQty",
                                    Math.max(0, item.receivedQty - 1)
                                  )
                                }
                                disabled={item.pendingQty === 0 || item.receivedQty <= 0}
                                className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <input
                                type="number"
                                value={item.receivedQty}
                                onChange={(e) =>
                                  handleItemChange(index, "receivedQty", e.target.value)
                                }
                                disabled={item.pendingQty === 0}
                                min="0"
                                max={item.pendingQty}
                                step="any"
                                className="w-20 px-2 py-1 text-center border rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleItemChange(
                                    index,
                                    "receivedQty",
                                    item.receivedQty + 1
                                  )
                                }
                                disabled={item.pendingQty === 0 || item.receivedQty >= item.pendingQty}
                                className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            AED {(item.rate || item.price || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            AED {lineTotal.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={item.condition}
                              onChange={(e) =>
                                handleItemChange(index, "condition", e.target.value)
                              }
                              disabled={item.pendingQty === 0}
                              className="px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            >
                              <option value="Good">Good</option>
                              <option value="Damaged">Damaged</option>
                              <option value="Partial">Partial</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Items Selected:</span>
                      <span className="font-medium">{totals.itemCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Quantity:</span>
                      <span className="font-medium">{totals.totalQty}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal:</span>
                      <span className="font-medium">AED {totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">VAT:</span>
                      <span className="font-medium">AED {totals.totalVat.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Grand Total:</span>
                      <span className="text-blue-600">AED {totals.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Notes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (visible on document)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Notes to appear on GRN document..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Internal Notes (not printed)
                  </label>
                  <textarea
                    name="internalNotes"
                    value={formData.internalNotes}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Internal notes for reference..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || totals.itemCount === 0}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Create GRN
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default GRNForm;
