// SUMMARY: Updated to use backend sequence preview for PO, implements auto/manual toggle, sends numberManual/yearMonth, handles 409 conflict, and updates UI badges/tooltips. Removed local number generation. See task details.
import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  Package,
  Plus,
  Trash2,
  Calendar,
  User,
  Save,
  ArrowLeft,
  Hash,
} from "lucide-react";
import Select from "react-select";
import axiosInstance from "../../../axios/axios";
import { getSequencePreview, saveOrder, updateOrder } from '../../../axios/sequence';

// FIX: Refined memoization to prevent unnecessary re-renders.
// By moving the comparator function outside, it's not recreated on every render.
const arePropsEqual = (prevProps, nextProps) => {
  return (
    prevProps.formData === nextProps.formData &&
    prevProps.vendors === nextProps.vendors &&
    prevProps.stockItems === nextProps.stockItems &&
    prevProps.selectedPO === nextProps.selectedPO &&
    prevProps.activeView === nextProps.activeView &&
    // Functions from parent are generally stable, but props like formData are what matter
    // We can assume functions like addNotification, resetForm etc. are stable.
    prevProps.calculateTotals === nextProps.calculateTotals
  );
};

const POForm = React.memo(
  ({
    formData,
    setFormData,
    vendors,
    stockItems,
    addNotification,
    selectedPO,
    setSelectedPO,
    setActiveView,
    setPurchaseOrders,
    activeView = "create",
    resetForm,
    calculateTotals,
    onPOSuccess,
  }) => {
    const isEditing = activeView === "edit";
    const [formErrors, setFormErrors] = useState({});

    // --- Sequence Preview/Auto/Manual Logic ---
    // Manual toggle supported; default AUTO
    const [numberManual, setNumberManual] = useState(false);
    const [preview, setPreview] = useState("");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [conflict, setConflict] = useState(false);
    // Compute yearMonth from formData.date (YYYY-MM-DD)
    const yearMonth = (formData.date || "").replace(/-/g, "").slice(0,6);

    // Fetch preview from backend
    const fetchPreview = useCallback(async (dateStr) => {
      setPreviewLoading(true);
      try {
        const ym = (dateStr || formData.date || "").replace(/-/g, "").slice(0,6);
        const resp = await getSequencePreview("PO", ym);
        const formatted = resp?.formatted || resp?.next || resp?.data?.formatted || resp?.data?.next || resp?.data?.data?.formatted || resp?.data?.data?.next || "";
        setPreview(formatted);
        setFormData(prev => ({ ...prev, transactionNo: formatted }));
      } catch (e) {
        setPreview("");
      } finally {
        setPreviewLoading(false);
      }
    }, [formData.date, setFormData]);

    // On mount or when switching to auto/manual or date changes
    useEffect(() => {
      if (!numberManual && !isEditing) {
        fetchPreview(formData.date);
      }
    }, [numberManual, formData.date, isEditing, fetchPreview]);


    // Toggle handlers


    // Calculate totals for display
    const totals = useMemo(() => {
      return calculateTotals(formData.items);
    }, [formData.items, calculateTotals]);

    const generatePONumber = useCallback(() => {
        const date = new Date();
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        // fallback format: POYYYYMM-NNNNN with random sequence if backend unavailable
        const seq = String(Math.floor(Math.random() * 90000) + 10000);
        return `PO${y}${m}-${seq}`;
    }, []);

    // Initialize or update PO number when Auto is enabled and creating new
    // Removed legacy fetchNextNumber (unused)

    // Mode handlers: switching to AUTO fetches a preview for display
    // Enable manual entry (create only)
    const enableManual = useCallback(() => {
      if (isEditing) return;
      setNumberManual(true);
      setFormData(prev => ({ ...prev, transactionNo: '' }));
    }, [isEditing, setFormData]);

    // Fetch preview number on mount in AUTO mode to display, and react to mode
    useEffect(() => {
      let mounted = true;
      if (!numberManual && !formData.transactionNo && !isEditing) {
        fetchPreview(formData.date);
      }
      return () => { mounted = false; };
    }, [numberManual, formData.transactionNo, isEditing, fetchPreview, formData.date]);

    const validateForm = useCallback(() => {
      const errors = {};
      if (!formData.partyId) errors.partyId = "Vendor is required";
      if (!formData.date) errors.date = "Date is required";
      if (!formData.deliveryDate) errors.deliveryDate = "Delivery date is required";
      if (!formData.items.some((item) => item.itemId && parseFloat(item.qty) > 0)) {
        errors.items = "At least one item with a quantity greater than 0 is required";
      }
      formData.items.forEach((item, index) => {
        // Only validate rows that have been started
        if (item.itemId || item.qty || item.currentPurchasePrice) {
          if (!item.itemId) errors[`itemId_${index}`] = "Item is required";
          if (!item.qty || parseFloat(item.qty) <= 0)
            errors[`qty_${index}`] = "Quantity must be > 0";
          if (!item.currentPurchasePrice || parseFloat(item.currentPurchasePrice) <= 0)
            errors[`currentPurchasePrice_${index}`] = "Price must be > 0";
        }
      });
      setFormErrors(errors);
      // Manual PO number validation: require a non-empty value only (allow free format)
      if (numberManual) {
        const v = (formData.transactionNo || "").trim();
        if (!v) {
          errors.transactionNo = "PO number is required in Manual mode";
        }
      }

      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    }, [formData]);

    const handleInputChange = useCallback(
      (e) => {
        const { name, value } = e.target;
        if (name === "transactionNo" && !numberManual) return; // Prevent edits in Auto mode
        setFormData((prev) => ({ ...prev, [name]: value }));
        setFormErrors((prev) => ({ ...prev, [name]: null }));
      },
      [setFormData, numberManual]
    );

    const handleVendorSelect = useCallback(
      (selected) => {
        const vendorId = selected ? selected.value : "";
        const name = selected ? (selected.label || "") : "";
        const vendorName = name.includes(" - ") ? name.split(" - ").slice(1).join(" - ").trim() : name;
        setFormData((prev) => ({ ...prev, partyId: vendorId, partyName: vendorName }));
        setFormErrors((prev) => ({ ...prev, partyId: null }));
      },
      [setFormData]
    );

    // FIX: Centralized and robust item calculation logic.
    const handleItemChange = useCallback(
      (index, field, value) => {
        const newItems = [...formData.items];
        const currentItem = { ...newItems[index] };
        
        // Update the field that was changed
        currentItem[field] = value;

        // If the item ID changes, populate details from stock
        if (field === "itemId") {
          const stockItem = stockItems.find((i) => i._id === value);
          if (stockItem) {
            currentItem.description = stockItem.itemName;
            currentItem.brand = stockItem.brand || "";
            currentItem.origin = stockItem.origin || "";
            currentItem.vatPercent = (stockItem.vatPercent !== undefined ? stockItem.vatPercent : 5).toString();
            // Only set purchase price if not already set, to avoid overwriting a manual entry
            if (!currentItem.currentPurchasePrice || parseFloat(currentItem.currentPurchasePrice) === 0) {
              currentItem.currentPurchasePrice = (stockItem.purchasePrice || 0).toString();
            }
            // Always update the system price for reference
            currentItem.purchasePrice = stockItem.purchasePrice || 0;
          } else {
            // Reset fields if item is cleared
            currentItem.description = "";
            currentItem.brand = "";
            currentItem.origin = "";
          }
        }
        
        // --- Single Source of Truth for Calculations ---
        const qty = parseFloat(currentItem.qty) || 0;
        const price = parseFloat(currentItem.currentPurchasePrice) || 0;
        const vatPercent = parseFloat(currentItem.vatPercent) || 0;

        const subtotal = qty * price;
        const vatAmount = subtotal * (vatPercent / 100);
        const grandTotal = subtotal + vatAmount;

        // Update the item object with calculated values (as strings for input fields)
        currentItem.total = subtotal.toFixed(2);
        currentItem.vatAmount = vatAmount.toFixed(2);
        currentItem.grandTotal = grandTotal.toFixed(2);

        newItems[index] = currentItem;

        setFormData((prev) => ({ ...prev, items: newItems }));
        setFormErrors((prev) => ({ ...prev, [`${field}_${index}`]: null }));
      },
      [formData.items, stockItems, setFormData]
    );
    const normalizeDateStr = useCallback((d) => {
      if (!d) return "";
      try {
        // Accept Date, ISO string, or already formatted string
        const s = typeof d === "string" ? d : new Date(d).toISOString();
        // Take first 10 chars of ISO (YYYY-MM-DD)
        return s.slice(0, 10);
      } catch {
        return "";
      }
    }, []);

    const addItem = useCallback(() => {
      setFormData((prev) => ({
        ...prev,
        items: [
          ...prev.items,
          {
            itemId: "", description: "", qty: "",
            purchasePrice: 0, currentPurchasePrice: "", vatPercent: "5",
            brand: "", origin: "", total: "0.00", vatAmount: "0.00", grandTotal: "0.00",
          },
        ],
      }));
    }, [setFormData]);

    const removeItem = useCallback(
      (index) => {
        if (formData.items.length <= 1) return;
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData((prev) => ({ ...prev, items: newItems }));
      },
      [formData.items, setFormData]
    );
    
    // FIX: CRITICAL FIX for data integrity during save and hydration.
    // --- Save PO with correct payload and 409 conflict handling ---
    const savePO = useCallback(async () => {
      if (!validateForm()) {
        addNotification("Please fix form errors before saving", "error");
        return;
      }
      setSaveLoading(true);
      setConflict(false);
      
      // If in AUTO mode and no preview yet, fetch it first
      let poNumber = formData.transactionNo;
      if (numberManual) {
        if (!poNumber) {
          addNotification('PO number is required in Manual mode', 'error');
          setSaveLoading(false);
          return;
        }
      } else if (!numberManual && !poNumber) {
        try {
          setPreviewLoading(true);
          const resp = await getSequencePreview("PO", yearMonth);
          const formatted = resp?.formatted || resp?.next || resp?.data?.formatted || resp?.data?.next || resp?.data?.data?.formatted || resp?.data?.data?.next || "";
          poNumber = formatted || "";
          if (!poNumber) {
            addNotification("Failed to get PO number preview", "error");
            setSaveLoading(false);
            return;
          }
        } catch (e) {
          addNotification("Failed to fetch PO number: " + e.message, "error");
          setSaveLoading(false);
          return;
        } finally {
          setPreviewLoading(false);
        }
      }
      
      if (!poNumber) {
        addNotification("PO number is required", "error");
        setSaveLoading(false);
        return;
      }

      // Persist the fetched/used PO number into form state so subsequent validation/backend sees it
      if (poNumber && poNumber !== formData.transactionNo) {
        setFormData(prev => ({ ...prev, transactionNo: poNumber }));
      }

      const finalTotals = calculateTotals(formData.items);
      const itemsPayload = formData.items
        .filter(item => item.itemId && parseFloat(item.qty) > 0)
        .map(item => {
          const qty = parseFloat(item.qty) || 0;
          const currentPurchasePrice = parseFloat(item.currentPurchasePrice) || 0;
          const vatPercent = parseFloat(item.vatPercent) || 0;
          const lineSubtotal = qty * currentPurchasePrice;
          const vatAmount = lineSubtotal * (vatPercent / 100);
          const grandTotal = lineSubtotal + vatAmount;
          const stock = stockItems.find(s => String(s._id) === String(item.itemId));
          const itemCode = item.itemCode || stock?.itemId || stock?.itemCode || item.itemCode || "";
          return {
            itemId: item.itemId,
            itemCode,
            description: item.description,
            qty: qty,
            price: currentPurchasePrice,
            currentPurchasePrice: currentPurchasePrice,
            rate: parseFloat(lineSubtotal.toFixed(2)),
            lineTotal: parseFloat(lineSubtotal.toFixed(2)),
            vatPercent: vatPercent,
            vatAmount: parseFloat(vatAmount.toFixed(2)),
            grandTotal: parseFloat(grandTotal.toFixed(2)),
            brand: item.brand,
            origin: item.origin,
          };
        });
      // Build transaction payload matching backend expectations
      const transactionPayload = {
        transactionNo: poNumber,
        type: "purchase_order",
        partyId: formData.partyId,
        partyType: "Vendor",
        date: formData.date,
        deliveryDate: formData.deliveryDate,
        status: formData.status,
        totalAmount: parseFloat(finalTotals.total),
        vendorReference: formData.vendorReference,
        notes: formData.notes,
        partyName: (vendors.find((v) => v._id === formData.partyId)?.vendorName) || formData.partyName || "",
        items: itemsPayload,
        numberManual,
        yearMonth,
      };
      try {
        let saved;
        if (isEditing) {
          const id = (selectedPO && (selectedPO.id || selectedPO._id)) || formData.id || formData._id;
          if (!id) {
            addNotification("Missing Purchase Order ID for update", "error");
            setSaveLoading(false);
            return;
          }
          const res = await updateOrder(id, transactionPayload);
          saved = res.data.data;
          addNotification("Purchase Order updated successfully!", "success");
        } else {
          const res = await saveOrder(transactionPayload);
          saved = res.data.data;
          addNotification("Purchase Order created successfully!", "success");
        }
        // Hydrate and update state as before
        const matchedVendor = vendors.find(v => v._id === saved.partyId);
        const vendorTRN = matchedVendor?.vatNumber || matchedVendor?.trnNO || matchedVendor?.trnNo || matchedVendor?.vat || "";
        const newPO = {
          ...saved,
          id: saved._id,
          vendorId: saved.partyId,
          vendorName: matchedVendor?.vendorName || "Unknown",
          vendorTRN,
          // Ensure orderNumber is set from backend response or fallback to transactionNo
          orderNumber: saved.orderNumber || saved.transactionNo,
          items: (saved.items || []).map((backendItem) => {
            const originalItem = itemsPayload.find((i) => i.itemId === backendItem.itemId) || {};
            return {
              ...originalItem,
              ...backendItem,
            };
          }),
        };
        if (isEditing) {
          setPurchaseOrders(prev => prev.map(po => (po.id === newPO.id || po._id === newPO.id) ? newPO : po));
        } else {
          setPurchaseOrders(prev => [newPO, ...prev]);
        }
        onPOSuccess(newPO);
      } catch (err) {
        if (err.response?.status === 409) {
          setConflict(true);
          addNotification("Number allocation conflict — fetching new preview...", "error");
          fetchPreview(formData.date);
        } else {
          addNotification(`Failed to save PO: ${err.response?.data?.message || err.message}`, "error");
        }
      } finally {
        setSaveLoading(false);
      }
    }, [formData, numberManual, yearMonth, vendors, calculateTotals, addNotification, onPOSuccess, setPurchaseOrders, validateForm, fetchPreview, getSequencePreview, setPreviewLoading, stockItems]);

    const stableVendors = useMemo(() => vendors || [], [vendors]);
    const stableStockItems = useMemo(() => stockItems || [], [stockItems]);

    const itemOptions = useMemo(
      () =>
        stableStockItems.map((stock) => ({
          value: stock._id,
          label: `${stock.itemId} - ${stock.itemName}`,
        })),
      [stableStockItems]
    );

    const vendorOptions = useMemo(
      () =>
        stableVendors.map((vendor) => ({
          value: vendor._id,
          label: `${vendor.vendorId} - ${vendor.vendorName}`,
        })),
      [stableVendors]
    );

    // Custom styles for react-select to match input styling
    const customSelectStyles = {
      control: (provided, state) => ({
        ...provided,
        width: "100%",
        padding: "0.75rem 1rem",
        backgroundColor: "#fff",
        borderRadius: "0.75rem",
        border: formErrors.partyId ? "1px solid #ef4444" : "1px solid #e2e8f0",
        outline: "none",
        boxShadow: state.isFocused ? "0 0 0 2px #3b82f6" : "none",
        "&:hover": {
          border: formErrors.partyId
            ? "1px solid #ef4444"
            : "1px solid #e2e8f0",
        },
        fontSize: "0.875rem",
      }),
      menu: (provided) => ({
        ...provided,
        backgroundColor: "#fff",
        borderRadius: "0.75rem",
        border: "1px solid #e2e8f0",
      }),
      option: (provided, state) => ({
        ...provided,
        backgroundColor: state.isSelected
          ? "#3b82f6"
          : state.isFocused
          ? "#f1f5f9"
          : "#fff",
        color: state.isSelected ? "#fff" : "#1e293b",
        "&:hover": {
          backgroundColor: "#f1f5f9",
        },
      }),
    };

    // Ensure dates have values on create (preserve on edit)
    useEffect(() => {
      if (!isEditing) {
        const today = new Date().toISOString().slice(0, 10);
        setFormData(prev => ({
          ...prev,
          date:normalizeDateStr(prev.date) || today,
          deliveryDate: normalizeDateStr(prev.deliveryDate) || normalizeDateStr(prev.date) || today,
        }));
      }
    }, [isEditing, setFormData]);

    // Hydrate dates and system purchase prices when editing an existing PO
    useEffect(() => {
      if (isEditing && selectedPO) {
        // Populate saved dates
        const savedDate = selectedPO.date ? normalizeDateStr(selectedPO.date).slice(0,10) : '';
        const savedDelivery = selectedPO.deliveryDate ? normalizeDateStr(selectedPO.deliveryDate).slice(0,10) : savedDate;
        console.log("Saved Dates:", savedDate, savedDelivery);
        setFormData(prev => ({
          ...prev,
          date: normalizeDateStr(prev.date) || savedDate,
          deliveryDate: normalizeDateStr(prev.deliveryDate) || savedDelivery,
        }));

        // Ensure each item shows the system purchase price from stock catalog
        const hydratedItems = (formData.items || []).map((it) => {
          const stock = stockItems.find(s => String(s._id) === String(it.itemId));
          const systemPrice = stock ? (stock.purchasePrice || 0) : (it.purchasePrice || 0);
          return {
            ...it,
            purchasePrice: systemPrice, // display-only field: System Purchase Price
          };
        });
        if (hydratedItems.length) {
          setFormData(prev => ({ ...prev, items: hydratedItems }));
        }
      }
    }, [isEditing, selectedPO, stockItems]);

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="relative bg-white/80 backdrop-blur-xl shadow-xl border-b border-gray-200/50">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    setActiveView("list");
                    resetForm();
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-slate-800">
                    {isEditing
                      ? "Edit Purchase Order"
                      : "Create Purchase Order"}
                  </h1>
                  <p className="text-slate-600 mt-1">
                    {isEditing
                      ? "Update purchase order details"
                      : "Create a new purchase order"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={savePO}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg"
                >
                  <Save className="w-5 h-5" />
                  <span>{isEditing ? "Update PO" : "Save PO"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-2xl p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    PO Number
                  </label>
                  <div className="relative flex items-center gap-2">
                    <div className="relative flex-1">
                      <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      {isEditing || !numberManual ? (
                        <input
                          type="text"
                          name="transactionNo"
                          value={formData.transactionNo || ''}
                          onChange={undefined}
                          readOnly={true}
                          placeholder={previewLoading ? "Loading preview..." : preview || "Preview will appear"}
                          className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 border-slate-200 cursor-not-allowed`}
                          aria-readonly={true}
                          aria-label={"Auto PO number preview"}
                        />
                      ) : (
                        <input
                          type="text"
                          name="transactionNo"
                          value={formData.transactionNo || ''}
                          onChange={handleInputChange}
                          readOnly={false}
                          placeholder={"Enter PO number"}
                          className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white border-slate-300`}
                          aria-readonly={false}
                          aria-label={"Manual PO number input"}
                        />
                      )}
                    </div>
                    {!isEditing && !numberManual && (
                      <button type="button" onClick={enableManual} className="px-3 py-2 text-sm rounded-lg border bg-white text-slate-700 border-slate-300" aria-label="Enable Manual">
                        Manual
                      </button>
                    )}
                    <div className="ml-2 flex items-center gap-1">
                      {!isEditing && !numberManual && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded" aria-label="Preview badge" tabIndex={0} title="Preview — not reserved until you Save.">
                          Preview
                        </span>
                      )}
                      {!isEditing && numberManual && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded" aria-label="Manual badge" tabIndex={0} title="Manual entry mode.">
                          Manual
                        </span>
                      )}
                      {conflict && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded" aria-label="Conflict badge" tabIndex={0} title="Number allocation conflict — fetching new preview...">
                          Conflict
                        </span>
                      )}
                    </div>
                  </div>
                  {!isEditing && !numberManual && (
                    <div className="text-xs text-slate-500 mt-1" id="preview-tooltip">
                      Preview — not reserved until you Save.
                    </div>
                  )}
                  {!isEditing && numberManual && (
                    <div className="text-xs text-yellow-600 mt-1" id="manual-tooltip">
                      Manual entry — any string allowed.
                    </div>
                  )}
                  {conflict && (
                    <div className="text-xs text-red-600 mt-1" id="conflict-tooltip">
                      Number allocation conflict — fetching new preview. Please try saving again.
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="date"
                        name="date"
                        value={formData.date || ""}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-3 bg-white rounded-xl border ${
                          formErrors.date
                            ? "border-red-500"
                            : "border-slate-200"
                        } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                      {formErrors.date && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors.date}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Delivery Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="date"
                        name="deliveryDate"
                        value={formData.deliveryDate || ""}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-3 bg-white rounded-xl border ${
                          formErrors.deliveryDate
                            ? "border-red-500"
                            : "border-slate-200"
                        } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                      {formErrors.deliveryDate && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors.deliveryDate}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Select Vendor
                  </label>
                  <Select
                    options={vendorOptions}
                    value={
                      vendorOptions.find(
                        (opt) => opt.value === formData.partyId
                      ) || null
                    }
                    onChange={isEditing ? undefined : handleVendorSelect}
                    placeholder="Select a vendor..."
                    isClearable={!isEditing}
                    isSearchable
                    classNamePrefix="select"
                    className={`text-sm  ${
                      formErrors.partyId ? "border-red-500 rounded-lg" : ""
                    }`}
                    styles={customSelectStyles}
                    isDisabled={isEditing}
                  />
                  {formErrors.partyId && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.partyId}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Reference
                  </label>
                  <input
                    type="text"
                    name="vendorReference"
                    value={formData.vendorReference || ""}
                    onChange={handleInputChange}
                    placeholder="Enter reference"
                    className={`w-full px-4 py-3 bg-white rounded-xl border ${
                      formErrors.vendorReference
                        ? "border-red-500"
                        : "border-slate-200"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`}
                  />
                  {formErrors.vendorReference && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.vendorReference}
                    </p>
                  )}
                </div>

                {/* Status field removed per requirement */}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    key="notes"
                    name="notes"
                    value={formData.notes || ""}
                    onChange={handleInputChange}
                    placeholder="Additional notes or special instructions"
                    className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24 resize-none"
                  />
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                  Vendor Preview
                </h3>
                {formData.partyId ? (
                  (() => {
                    const vendor = stableVendors.find(
                      (v) => v._id === formData.partyId
                    );
                    return vendor ? (
                      <div className="text-sm text-slate-700 space-y-2">
                        <p className="font-semibold text-blue-600">
                          {vendor.vendorId}
                        </p>
                        <p className="font-bold text-slate-800">
                          {vendor.vendorName}
                        </p>
                        <p>{vendor.address}</p>
                        <p className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{vendor.phone}</span>
                        </p>
                        <p>{vendor.email}</p>
                        <p>VAT: {vendor.vatNumber}</p>
                        <p>Terms: {vendor.paymentTerms}</p>
                        <p>Reference: {formData.vendorReference || "N/A"}</p>
                      </div>
                    ) : (
                      <p className="text-slate-500 italic">Vendor not found</p>
                    );
                  })()
                ) : (
                  <p className="text-slate-500 italic">
                    Select a vendor to see details
                  </p>
                )}

                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h4 className="font-semibold text-slate-800 mb-3">
                    Order Summary
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Items:</span>
                      <span>
                        {formData.items.filter((item) => item.itemId).length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>AED {parseFloat(totals.subtotal || 0).toFixed(2)}</span>  {/* FIX: Ensure display */}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>VAT:</span>
                      <span>AED {parseFloat(totals.tax || 0).toFixed(2)}</span>  {/* FIX: Use 'tax' from calculateTotals */}
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Total:</span>
                        <span className="text-emerald-600">
                          AED {parseFloat(totals.total || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-800 flex items-center">
                  <Package className="w-6 h-6 mr-2 text-blue-600" />
                  Purchase Items
                </h3>
                <button
                  onClick={addItem}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Item</span>
                </button>
              </div>

              {formErrors.items && (
                <p className="text-red-500 text-sm mb-4">{formErrors.items}</p>
              )}

              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div
                    key={`item-${index}`}
                    className="grid grid-cols-7 gap-4 items-center p-4 bg-slate-50 rounded-xl border border-slate-200 relative"
                  >
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Item
                      </label>
                      <Select
                        options={itemOptions}
                        value={
                          itemOptions.find(
                            (opt) => opt.value === item.itemId
                          ) || null
                        }
                        onChange={(selected) =>
                          handleItemChange(
                            index,
                            "itemId",
                            selected ? selected.value : ""
                          )
                        }
                        placeholder="Select Item..."
                        isClearable
                        isSearchable
                        classNamePrefix="select"
                        className={`text-sm ${
                          formErrors[`itemId_${index}`]
                            ? "border-red-500 rounded-lg"
                            : ""
                        }`}
                      />
                      {formErrors[`itemId_${index}`] && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors[`itemId_${index}`]}
                        </p>
                      )}
                    </div>

                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={item.description || ""}
                        onChange={(e) =>
                          handleItemChange(index, "description", e.target.value)
                        }
                        placeholder="Description"
                        className="w-full px-4 py-3 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Brand
                      </label>
                      <input
                        type="text"
                        value={item.brand || ""}
                        readOnly
                        className="w-full px-4 py-3 bg-slate-100 rounded-lg border border-slate-200 text-sm cursor-not-allowed"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Origin
                      </label>
                      <input
                        type="text"
                        value={item.origin || ""}
                        readOnly
                        className="w-full px-4 py-3 bg-slate-100 rounded-lg border border-slate-200 text-sm cursor-not-allowed"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Quantity
                      </label>
                      <input
                      type="text"  // FIX: Change to text for free typing
                      value={item.qty || ""}  // FIX: String for smooth typing (empty fallback)
                      onChange={(e) => handleItemChange(index, "qty", e.target.value)}  // Passes raw string
                      placeholder="Qty"
                      pattern="[0-9]*\.?[0-9]+"  // FIX: Allow decimals (0-9, optional dot, more 0-9)
                      className={`w-full px-4 py-3 bg-white rounded-lg border ${
                      formErrors[`qty_${index}`]
                      ? "border-red-500"
                      :"border-slate-200"
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`}
                      />                                                
                      {formErrors[`qty_${index}`] && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors[`qty_${index}`]}
                        </p>
                      )}
                    </div>

                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        System Purchase Price
                      </label>
                      <input
                        type="number"
                        value={item.purchasePrice || "0.00"}  /* FIX: Default display */
                        readOnly
                        className="w-full px-4 py-3 bg-slate-100 rounded-lg border border-slate-200 text-sm cursor-not-allowed"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        New Purchase Price
                      </label>
                      <input
                      type="text"  // FIX: Change to text
                      value={item.currentPurchasePrice || ""}  // FIX: String fallback
                      onChange={(e) => handleItemChange(index, "currentPurchasePrice", e.target.value)}
                      placeholder="New Price"
                      pattern="[0-9]*\.?[0-9]+"  // FIX: Decimal pattern
                      className={`w-full px-4 py-3 bg-white rounded-lg border ${
                      formErrors[`currentPurchasePrice_${index}`]
                      ? "border-red-500"
                      : "border-slate-200"
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`}
                      />
                      {formErrors[`currentPurchasePrice_${index}`] && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors[`currentPurchasePrice_${index}`]}
                        </p>
                      )}
                    </div>

                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Total
                      </label>
                      <input
                        type="number"
                        value={item.total || "0.00"}  /* FIX: Ensure display */
                        readOnly
                        className="w-full px-4 py-3 bg-slate-100 rounded-lg border border-slate-200 text-sm cursor-not-allowed"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        VAT %
                      </label>
                      <input
                        type="number"
                        value={item.vatPercent || "5.00"}  /* FIX: Default display */
                        onChange={(e) =>
                          handleItemChange(index, "vatPercent", e.target.value)
                        }
                        placeholder="VAT %"
                        min="0"
                        step="0.1"
                        className={`w-full px-4 py-3 bg-white rounded-lg border ${
                          formErrors[`vatPercent_${index}`]
                            ? "border-red-500"
                            : "border-slate-200"
                        } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`}
                      />
                      {formErrors[`vatPercent_${index}`] && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors[`vatPercent_${index}`]}
                        </p>
                      )}
                    </div>

                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        VAT Amount
                      </label>
                      <input
                        type="number"
                        value={item.vatAmount || "0.00"}  /* FIX: Ensure display */
                        readOnly
                        className="w-full px-4 py-3 bg-slate-100 rounded-lg border border-slate-200 text-sm cursor-not-allowed"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Grand Total
                      </label>
                      <input
                        type="number"
                        value={item.grandTotal || "0.00"}  /* FIX: Ensure display */
                        readOnly
                        className="w-full px-4 py-3 bg-slate-100 rounded-lg border border-slate-200 text-sm cursor-not-allowed"
                      />
                    </div>

                    <div className="col-span-1 flex justify-end">
                      {formData.items.length > 1 && (
                        <button
                          onClick={() => removeItem(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
  arePropsEqual
);

export default POForm;