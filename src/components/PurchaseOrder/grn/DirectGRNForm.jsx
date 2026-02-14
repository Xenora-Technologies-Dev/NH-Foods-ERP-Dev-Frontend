import React, { useState, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  Package,
  Building,
  Calendar,
  Save,
  Truck,
  User,
  FileText,
  CheckCircle,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  Search,
} from "lucide-react";
import Select from "react-select";

const DirectGRNForm = ({
  vendors = [],
  stockItems = [],
  onSubmit,
  onBack,
  addNotification,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const [formData, setFormData] = useState({
    grnDate: new Date().toISOString().slice(0, 10),
    receivedDate: new Date().toISOString().slice(0, 10),
    referenceNumber: "",
    vendorReference: "",
    deliveryNoteNo: "",
    deliveryChallanNo: "",
    vehicleNo: "",
    driverName: "",
    notes: "",
    internalNotes: "",
    receivedBy: "",
  });

  // Items list for direct entry
  const [items, setItems] = useState([]);

  // Vendor select options
  const vendorOptions = useMemo(
    () =>
      vendors.map((v) => ({
        value: v._id,
        label: v.vendorName,
        data: v,
      })),
    [vendors]
  );

  // Stock item select options
  const stockOptions = useMemo(
    () =>
      stockItems.map((s) => ({
        value: s._id,
        label: `${s.itemId || ""} - ${s.description || s.itemName || ""}`,
        data: s,
      })),
    [stockItems]
  );

  const handleVendorChange = useCallback((option) => {
    setSelectedVendor(option);
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Add a new blank item row
  const handleAddItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        itemId: "",
        itemCode: "",
        description: "",
        receivedQty: 1,
        price: 0,
        vatPercent: 5,
        brand: "",
        origin: "",
        condition: "Good",
        remarks: "",
      },
    ]);
  }, []);

  // Remove an item row
  const handleRemoveItem = useCallback((index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Handle stock item selection for a row
  const handleStockSelect = useCallback((index, option) => {
    if (!option) return;
    const stock = option.data;
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = {
        ...newItems[index],
        itemId: stock._id,
        itemCode: stock.itemId || "",
        description: stock.description || stock.itemName || "",
        price: stock.purchasePrice || stock.currentPurchasePrice || 0,
        brand: stock.brand || "",
        origin: stock.origin || "",
      };
      return newItems;
    });
  }, []);

  // Handle item field changes
  const handleItemChange = useCallback((index, field, value) => {
    setItems((prev) => {
      const newItems = [...prev];
      const item = { ...newItems[index] };

      if (field === "receivedQty") {
        item.receivedQty = Math.max(0, parseFloat(value) || 0);
      } else if (field === "price") {
        item.price = Math.max(0, parseFloat(value) || 0);
      } else if (field === "vatPercent") {
        item.vatPercent = Math.max(0, parseFloat(value) || 0);
      } else {
        item[field] = value;
      }

      newItems[index] = item;
      return newItems;
    });
  }, []);

  // Calculate totals
  const totals = useMemo(() => {
    const validItems = items.filter((item) => item.itemId && item.receivedQty > 0);
    const totalQty = validItems.reduce((sum, item) => sum + item.receivedQty, 0);
    const subtotal = validItems.reduce(
      (sum, item) => sum + item.receivedQty * item.price,
      0
    );
    const totalVat = validItems.reduce((sum, item) => {
      const lineValue = item.receivedQty * item.price;
      return sum + (lineValue * (item.vatPercent || 0)) / 100;
    }, 0);
    const grandTotal = subtotal + totalVat;

    return {
      itemCount: validItems.length,
      totalQty,
      subtotal,
      totalVat,
      grandTotal,
    };
  }, [items]);

  const validateForm = useCallback(() => {
    const errors = [];

    if (!selectedVendor) errors.push("Please select a vendor");
    if (!formData.grnDate) errors.push("GRN Date is required");
    if (!formData.receivedDate) errors.push("Received Date is required");

    const validItems = items.filter((item) => item.itemId && item.receivedQty > 0);
    if (validItems.length === 0) {
      errors.push("At least one item with quantity > 0 is required");
    }

    for (const item of items) {
      if (item.itemId && item.receivedQty <= 0) {
        errors.push(`${item.description || "Item"}: Quantity must be > 0`);
      }
      if (item.itemId && item.price <= 0) {
        errors.push(`${item.description || "Item"}: Price must be > 0`);
      }
    }

    return errors;
  }, [selectedVendor, formData, items]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();
    if (errors.length > 0) {
      errors.forEach((err) => addNotification(err, "error"));
      return;
    }

    setIsSubmitting(true);
    try {
      const validItems = items
        .filter((item) => item.itemId && item.receivedQty > 0)
        .map((item) => ({
          itemId: item.itemId,
          itemCode: item.itemCode,
          description: item.description,
          receivedQty: item.receivedQty,
          price: item.price,
          vatPercent: item.vatPercent,
          brand: item.brand,
          origin: item.origin,
          condition: item.condition,
          remarks: item.remarks,
        }));

      const grnData = {
        vendorId: selectedVendor.value,
        ...formData,
        items: validItems,
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
          <h1 className="text-2xl font-bold text-gray-900">
            Direct GRN Entry
          </h1>
          <p className="text-gray-500">
            Receive goods directly without Purchase Order
          </p>
        </div>
        <span className="ml-auto px-3 py-1 bg-orange-100 text-orange-700 text-sm font-medium rounded-full">
          Without PO
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Vendor & Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Vendor Selection Card */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-orange-600" />
                Vendor Selection *
              </h3>
              <Select
                value={selectedVendor}
                onChange={handleVendorChange}
                options={vendorOptions}
                placeholder="Search and select vendor..."
                isClearable
                isSearchable
                className="mb-3"
                styles={{
                  control: (base) => ({
                    ...base,
                    borderColor: "#d1d5db",
                    "&:hover": { borderColor: "#3b82f6" },
                  }),
                }}
              />
              {selectedVendor && (
                <div className="mt-3 p-3 bg-orange-50 rounded-lg space-y-2">
                  <p className="font-medium text-gray-900">
                    {selectedVendor.data.vendorName}
                  </p>
                  {selectedVendor.data.trnNO && (
                    <p className="text-sm text-gray-600">
                      TRN: {selectedVendor.data.trnNO}
                    </p>
                  )}
                  {selectedVendor.data.phone && (
                    <p className="text-sm text-gray-600">
                      Phone: {selectedVendor.data.phone}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Reference & Date Card */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                GRN Details
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    name="referenceNumber"
                    value={formData.referenceNumber}
                    onChange={handleInputChange}
                    placeholder="Supplier Invoice / DC No."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Reference
                  </label>
                  <input
                    type="text"
                    name="vendorReference"
                    value={formData.vendorReference}
                    onChange={handleInputChange}
                    placeholder="Vendor ref / Invoice no."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GRN Date *
                  </label>
                  <input
                    type="date"
                    name="grnDate"
                    value={formData.grnDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Info Card */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-600" />
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
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
                  <Package className="w-5 h-5 text-orange-600" />
                  Items to Receive
                </h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Package className="w-12 h-12 mb-3 opacity-50" />
                  <p className="font-medium">No items added yet</p>
                  <p className="text-sm mt-1">Click "Add Item" to start adding items to this GRN</p>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
                  >
                    <Plus className="w-4 h-4" />
                    Add First Item
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8">
                            #
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[250px]">
                            Item
                          </th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase w-24">
                            Qty
                          </th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase w-28">
                            Price
                          </th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">
                            VAT %
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase w-28">
                            Amount
                          </th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase w-28">
                            Condition
                          </th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase w-12">
                            
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {items.map((item, index) => {
                          const lineAmount = item.receivedQty * item.price;
                          const lineVat = (lineAmount * (item.vatPercent || 0)) / 100;
                          const lineTotal = lineAmount + lineVat;

                          return (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-3 py-3 text-gray-500 text-sm">
                                {index + 1}
                              </td>
                              <td className="px-3 py-3">
                                <Select
                                  value={
                                    item.itemId
                                      ? stockOptions.find((o) => o.value === item.itemId) || null
                                      : null
                                  }
                                  onChange={(option) => handleStockSelect(index, option)}
                                  options={stockOptions}
                                  placeholder="Search item..."
                                  isClearable
                                  isSearchable
                                  menuPortalTarget={document.body}
                                  styles={{
                                    control: (base) => ({
                                      ...base,
                                      minHeight: "36px",
                                      borderColor: "#d1d5db",
                                      "&:hover": { borderColor: "#f97316" },
                                    }),
                                    menuPortal: (base) => ({
                                      ...base,
                                      zIndex: 9999,
                                    }),
                                  }}
                                />
                                {item.itemCode && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    Code: {item.itemCode}
                                    {item.brand && ` | ${item.brand}`}
                                  </p>
                                )}
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleItemChange(index, "receivedQty", item.receivedQty - 1)
                                    }
                                    disabled={item.receivedQty <= 0}
                                    className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="number"
                                    value={item.receivedQty}
                                    onChange={(e) =>
                                      handleItemChange(index, "receivedQty", e.target.value)
                                    }
                                    min="0"
                                    step="any"
                                    className="w-16 px-2 py-1 text-center border rounded focus:ring-2 focus:ring-orange-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleItemChange(index, "receivedQty", item.receivedQty + 1)
                                    }
                                    className="p-1 hover:bg-gray-200 rounded"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <input
                                  type="number"
                                  value={item.price}
                                  onChange={(e) =>
                                    handleItemChange(index, "price", e.target.value)
                                  }
                                  min="0"
                                  step="any"
                                  className="w-24 px-2 py-1 text-center border rounded focus:ring-2 focus:ring-orange-500"
                                />
                              </td>
                              <td className="px-3 py-3">
                                <input
                                  type="number"
                                  value={item.vatPercent}
                                  onChange={(e) =>
                                    handleItemChange(index, "vatPercent", e.target.value)
                                  }
                                  min="0"
                                  max="100"
                                  step="any"
                                  className="w-16 px-2 py-1 text-center border rounded focus:ring-2 focus:ring-orange-500"
                                />
                              </td>
                              <td className="px-3 py-3 text-right font-medium text-sm">
                                AED {lineTotal.toFixed(2)}
                              </td>
                              <td className="px-3 py-3">
                                <select
                                  value={item.condition}
                                  onChange={(e) =>
                                    handleItemChange(index, "condition", e.target.value)
                                  }
                                  className="px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-orange-500"
                                >
                                  <option value="Good">Good</option>
                                  <option value="Damaged">Damaged</option>
                                  <option value="Partial">Partial</option>
                                </select>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(index)}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Add more items button */}
                  <div className="p-3 border-t">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition"
                    >
                      <Plus className="w-4 h-4" />
                      Add Another Item
                    </button>
                  </div>

                  {/* Totals */}
                  <div className="p-4 border-t bg-gray-50">
                    <div className="flex justify-end">
                      <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Items:</span>
                          <span className="font-medium">{totals.itemCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Total Quantity:</span>
                          <span className="font-medium">{totals.totalQty}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Subtotal:</span>
                          <span className="font-medium">
                            AED {totals.subtotal.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">VAT:</span>
                          <span className="font-medium">
                            AED {totals.totalVat.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                          <span>Grand Total:</span>
                          <span className="text-orange-600">
                            AED {totals.grandTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
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
                disabled={isSubmitting || totals.itemCount === 0 || !selectedVendor}
                className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Create Direct GRN
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

export default DirectGRNForm;
