// SUMMARY: Updated to use backend sequence preview for SO, implements auto/manual toggle, sends numberManual/yearMonth, handles 409 conflict, and updates UI badges/tooltips. Removed local number generation. See task details.
import React, { useCallback, useMemo, useEffect, useState } from "react";
import {
  Package,
  Plus,
  Trash2,
  Calendar,
  User,
  Save,
  ArrowLeft,
  Hash,
  AlertCircle,
} from "lucide-react";
import Select from "react-select";
import { getSequencePreview, saveOrder, updateOrder } from '../../../axios/sequence';

const SOForm = React.memo(
  ({
    formData,
    setFormData,
    customers,
    stockItems,
    addNotification,
    selectedSO,
    setSelectedSO,
    setActiveView,
    setSalesOrders,
    activeView = "create",
    resetForm,
    calculateTotals,
    onSOSuccess,
    formErrors,
    setFormErrors,
  }) => {
    const isEditing = activeView === "edit";
    // Updated: lock customer always in edit; number is always read-only in edit; dates remain editable
    const lockCustomerField = isEditing; // vendor/customer should be readonly on update

    // FIX: Use useMemo for derived state. This is the correct way to calculate totals for display
    // without causing unnecessary re-renders or side-effects.
    const totals = useMemo(() => {
      return calculateTotals(formData.items);
    }, [formData.items, calculateTotals]);

    const effectiveDiscount = useMemo(() => {
      const d = parseFloat(formData.discount || 0) || 0;
      return Math.max(0, d);
    }, [formData.discount]);

    const totalsAfterDiscount = useMemo(() => {
      const totalNum = parseFloat(totals.total) || 0;
      const discounted = Math.max(0, totalNum - effectiveDiscount);
      return discounted.toFixed(2);
    }, [totals.total, effectiveDiscount]);

      // --- Sequence Preview with optional Manual toggle ---
      const [numberManual, setNumberManual] = useState(false);
      const [preview, setPreview] = useState("");
      const [previewLoading, setPreviewLoading] = useState(false);
      const [saveLoading, setSaveLoading] = useState(false);
      const [conflict, setConflict] = useState(false);
      // Compute yearMonth from formData.date (YYYY-MM-DD)
      const yearMonth = (formData.date || "").replace(/-/g, "").slice(0,6);

      // Fetch preview from backend (robust extraction of possible response shapes)
      const fetchPreview = useCallback(async (dateStr) => {
        setPreviewLoading(true);
        try {
          const ym = (dateStr || formData.date || "").replace(/-/g, "").slice(0,6);
          const resp = await getSequencePreview("SO", ym);
          const formatted = resp?.formatted || resp?.next || resp?.data?.formatted || resp?.data?.next || resp?.data?.data?.formatted || resp?.data?.data?.next || "";
          setPreview(formatted);
          setFormData(prev => ({ ...prev, transactionNo: formatted }));
        } catch (e) {
          setPreview("");
        } finally {
          setPreviewLoading(false);
        }
      }, [formData.date, setFormData]);

      // On mount or date changes
      useEffect(() => {
        // fetch preview only in create + auto mode
        if (!numberManual && !isEditing) {
          fetchPreview(formData.date);
        }
      }, [numberManual, formData.transactionNoMode, formData.date, isEditing, fetchPreview]);

      // Populate transaction number on edit if missing
      useEffect(() => {
        if (isEditing && !formData.transactionNo) {
          const existingNo = selectedSO?.transactionNo || selectedSO?.orderNumber || selectedSO?.displayTransactionNo;
          if (existingNo) {
            setFormData(prev => ({ ...prev, transactionNo: existingNo }));
          }
        }
      }, [isEditing, formData.transactionNo, selectedSO, setFormData]);

      // Populate LPO (refNo) and DocNo on edit if missing
      useEffect(() => {
        if (isEditing && selectedSO) {
          setFormData(prev => {
            const updates = {};
            if (!prev.refNo) {
              const lpo = selectedSO.refNo || selectedSO.lpoNo || selectedSO.lpo || selectedSO.reference;
              if (lpo) updates.refNo = lpo;
            }
            if (!prev.docNo) {
              const doc = selectedSO.docNo || selectedSO.documentNo || selectedSO.docNumber;
              if (doc) updates.docNo = doc;
            }
            return Object.keys(updates).length ? { ...prev, ...updates } : prev;
          });
        }
      }, [isEditing, selectedSO, setFormData]);

      // Enable manual entry (create only)
      const enableManual = useCallback(() => {
        if (isEditing) return; // preserve number on edit
        setNumberManual(true);
        setConflict(false);
        setFormErrors(prev => ({ ...prev, transactionNo: null }));
        setFormData(prev => ({ ...prev, transactionNo: '' }));
      }, [isEditing, setFormData, setFormErrors]);

      // NOTE: Preview is fetched by the earlier effect on date/mode; avoid duplicate calls here


    const validateForm = useCallback(() => {
      const errors = {};
      if (!formData.partyId) errors.partyId = "Customer is required";
      if (!formData.date) errors.date = "Date is required";
      if (!formData.deliveryDate)
        errors.deliveryDate = "Delivery date is required";

      let hasValidItem = false;
      formData.items.forEach((item, i) => {
        const hasInput = item.itemId || item.qty || item.rate;
        if (hasInput) {
          if (!item.itemId) errors[`itemId_${i}`] = "Item required";
          if (!item.qty || parseFloat(item.qty) <= 0)
            errors[`qty_${i}`] = "Qty > 0";
          if (!item.rate || parseFloat(item.rate) <= 0)
            errors[`rate_${i}`] = "Rate > 0";
        }
        if (item.itemId && parseFloat(item.qty) > 0 && parseFloat(item.rate) > 0) {
            hasValidItem = true;
        }
      });

      if (!hasValidItem) errors.items = "At least one valid item is required";
      // Manual SO number validation: require a non-empty value only (allow free format)
      if (numberManual) {
        const v = (formData.transactionNo || '').trim();
        if (!v) {
          errors.transactionNo = 'SO number is required in Manual mode';
        }
      }

      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    }, [formData, setFormErrors]);

    const handleInputChange = useCallback(
      (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setFormErrors((prev) => ({ ...prev, [name]: null }));
      },
      [setFormData, setFormErrors]
    );

    const handleCustomerSelect = useCallback(
      (selected) => {
        const id = selected ? selected.value : "";
        const name = selected ? (selected.label || "") : "";
        // label is like 'CUST2025001 - Customer Name' so extract after dash if present
        const customerName = name.includes(" - ") ? name.split(" - ").slice(1).join(" - ").trim() : name;
        setFormData((prev) => ({ ...prev, partyId: id, partyName: customerName }));
        setFormErrors((prev) => ({ ...prev, partyId: null }));
      },
      [setFormData, setFormErrors]
    );
    
    // FIX: Centralized and robust item calculation logic. This is the new single source of truth.
    const handleItemChange = useCallback(
      (index, field, value) => {
        const items = [...formData.items];
        const currentItem = { ...items[index], [field]: value };

        // If item ID changes, populate details from stock
        if (field === "itemId") {
          const stock = stockItems.find((s) => s._id === value);
          if (stock) {
            currentItem.description = stock.itemName;
            currentItem.rate = (stock.salesPrice || 0).toString(); // 'rate' in form is per-unit price
            currentItem.purchasePrice = (stock.purchasePrice || 0).toString();
            currentItem.vatPercent = (stock.taxPercent || 5).toString();
            // capture current stock for display
            currentItem.currentStock = typeof stock.currentStock === 'number' ? stock.currentStock : 0;
            // currentItem.package = "1";
            if (stock.currentStock <= stock.reorderLevel) {
              addNotification(`Low stock warning: ${stock.itemName}`, "warning");
            }
          } else {
            // Reset if item is cleared
            currentItem.description = "";
            currentItem.rate = "0.00";
            currentItem.purchasePrice = "0.00";
            currentItem.vatPercent = "5";
            currentItem.currentStock = 0;
            // currentItem.package = "1";
          }
        }

        // --- All calculations happen here, immediately ---
        const qty = parseFloat(currentItem.qty) || 0;
        const perUnitPrice = parseFloat(currentItem.rate) || 0;
        const vatPercent = parseFloat(currentItem.vatPercent) || 0;

        const subtotal = qty * perUnitPrice;
        const vatAmount = subtotal * (vatPercent / 100);
        const lineTotal = subtotal + vatAmount;

        // Update the item object with all calculated values (as strings for inputs)
        currentItem.subtotal = subtotal.toFixed(2);
        currentItem.vatAmount = vatAmount.toFixed(2);
        currentItem.lineTotal = lineTotal.toFixed(2);
        
        items[index] = currentItem;
        setFormData((prev) => ({ ...prev, items }));
        setFormErrors((prev) => ({ ...prev, [`${field}_${index}`]: null }));
      },
      [formData.items, stockItems, setFormData, addNotification, setFormErrors]
    );

    const addItem = useCallback(() => {
      setFormData((prev) => ({
        ...prev,
        items: [
          ...prev.items,
          {
            itemId: "", description: "", purchasePrice: "0.00",
            rate: "", qty: "", vatPercent: "5",
            subtotal: "0.00", vatAmount: "0.00", lineTotal: "0.00",
          },
        ],
      }));
    }, [setFormData]);

    const removeItem = useCallback((index) => {
        if (formData.items.length <= 1) return;
        const items = formData.items.filter((_, i) => i !== index);
        setFormData((prev) => ({ ...prev, items }));
      }, [formData.items, setFormData]
    );

    // FIX: Robust save function with clear payload and full data hydration.
    // --- Save SO with correct payload and 409 conflict handling ---
    const saveSO = useCallback(async () => {
      if (!validateForm()) {
        addNotification("Please fix form errors before saving", "error");
        return;
      }
      setSaveLoading(true);
      setConflict(false);
      
      // If in AUTO mode and no preview yet, fetch it first
      let soNumber = formData.transactionNo;
      // In edit mode, never change the SO number; use existing
      if (isEditing) {
        // preserve existing number in edit
        if (!soNumber) {
          addNotification("SO number is required", "error");
          setSaveLoading(false);
          return;
        }
      } else if (numberManual) {
        if (!soNumber) {
          addNotification('SO number is required in Manual mode', 'error');
          setSaveLoading(false);
          return;
        }
      } else if (!numberManual && !soNumber) {
        // Do not call preview API here; wait briefly for in-flight preview
        if (preview) {
          soNumber = preview;
        } else if (previewLoading) {
          let retries = 8; // up to ~480ms
          while (retries-- > 0 && !soNumber) {
            await new Promise(r => setTimeout(r, 60));
            if (preview) soNumber = preview;
          }
          if (!soNumber) {
            addNotification("SO number is not ready yet. Please wait a moment and try again.", "error");
            setSaveLoading(false);
            return;
          }
        } else {
          addNotification("SO number is not ready yet. Please wait a moment and try again.", "error");
          setSaveLoading(false);
          return;
        }
      }
      // Persist the fetched/used SO number into form state so subsequent validation/backend sees it
      if (soNumber && soNumber !== formData.transactionNo) {
        setFormData(prev => ({ ...prev, transactionNo: soNumber }));
      }
      
      if (!soNumber) {
        addNotification("SO number is required", "error");
        setSaveLoading(false);
        return;
      }

      const finalTotals = calculateTotals(formData.items);
      const itemsPayload = formData.items
        .filter(i => i.itemId && parseFloat(i.qty) > 0 && parseFloat(i.rate) > 0)
        .map((i) => {
          const qty = parseFloat(i.qty) || 0;
          const perUnitPrice = parseFloat(i.rate) || 0;
          const vatPct = parseFloat(i.vatPercent) || 0;
          const subtotal = qty * perUnitPrice;
          const vat = subtotal * (vatPct / 100);
          const grandTotal = subtotal + vat;
          const stock = stockItems.find(s => String(s._id) === String(i.itemId));
          const itemCode = i.itemCode || stock?.itemId || stock?.itemCode || i.itemCode || "";
          return {
            itemId: i.itemId,
            itemCode,
            description: i.description,
            qty: qty,
            price: perUnitPrice,
            salesPrice: perUnitPrice,
            rate: parseFloat(subtotal.toFixed(2)),
            vatPercent: vatPct,
            vatAmount: parseFloat(vat.toFixed(2)),
            grandTotal: parseFloat(grandTotal.toFixed(2)),
          };
        });
      // Build transaction payload matching backend expectations
      // Normalize optional references: save '-' if empty
      const refNoSanitized = (formData.refNo || '').trim() || '-';
      const docNoSanitized = (formData.docNo || '').trim() || '-';
      if (refNoSanitized !== formData.refNo || docNoSanitized !== formData.docNo) {
        setFormData(prev => ({ ...prev, refNo: refNoSanitized, docNo: docNoSanitized }));
      }

      // Infer manual if toggle is on OR existing number doesn't match auto pattern in edit
      const autoPattern = /^SO\d{6}-\d{5}$/i;
      const inferredManual = numberManual || (isEditing && soNumber && !autoPattern.test(String(soNumber)));
      console.log("Doc No sanitized:", docNoSanitized, "RefNo sanitized:", refNoSanitized, "Inferred manual:", inferredManual);
      const transactionPayload = {
        type: "sales_order",
        partyId: formData.partyId,
        partyType: "Customer",
        date: formData.date,
        deliveryDate: formData.deliveryDate,
        status: formData.status,
        discount: parseFloat(formData.discount) || 0,
        totalAmount: Math.max(0, (parseFloat(finalTotals.total) || 0) - (parseFloat(formData.discount || 0) || 0)),
        notes: formData.notes,
        refNo: refNoSanitized,
        docNo: docNoSanitized,
        partyName: (customers.find((c) => c._id === formData.partyId)?.customerName) || formData.partyName || "",
        items: itemsPayload,
        numberManual: !!inferredManual,
        yearMonth,
      };
      if (inferredManual) {
        // Manual entries: only send orderNumber; omit transactionNo to avoid backend format validation
        transactionPayload.orderNumber = soNumber;
      } else {
        transactionPayload.transactionNo = soNumber;
        transactionPayload.orderNumber = soNumber;
      }
      try {
        let saved;
        if (isEditing) {
          const id = (selectedSO && (selectedSO.id || selectedSO._id)) || formData.id || formData._id;
          if (!id) {
            addNotification("Missing Sales Order ID for update", "error");
            setSaveLoading(false);
            return;
          }
          const res = await updateOrder(id, transactionPayload);
          saved = res.data.data;
          addNotification("Sales Order updated successfully!", "success");
        } else {
          const res = await saveOrder(transactionPayload);
          saved = res.data.data;
          addNotification("Sales Order created successfully!", "success");
        }
        // Hydrate and update state as before
        const newSO = {
          ...saved,
          id: saved._id,
          customerId: saved.partyId,
          customerName: customers.find((c) => c._id === saved.partyId)?.customerName || "Unknown",
          totalAmount: parseFloat(saved.totalAmount).toFixed(2),
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
          setSalesOrders((prev) => prev.map((so) => (so.id === newSO.id || so._id === newSO.id ? newSO : so)));
        } else {
          setSalesOrders((prev) => [newSO, ...prev]);
        }
        onSOSuccess(newSO);
      } catch (err) {
        if (err.response?.status === 409) {
          setConflict(true);
          addNotification("Number allocation conflict — fetching new preview...", "error");
          fetchPreview(formData.date);
        } else {
          addNotification("Save failed: " + (err.response?.data?.message || err.message), "error");
        }
      } finally {
        setSaveLoading(false);
      }
    }, [formData, numberManual, yearMonth, customers, calculateTotals, addNotification, onSOSuccess, setSalesOrders, validateForm, fetchPreview, getSequencePreview, setPreviewLoading, stockItems]);

    const customerOptions = useMemo(() => (customers || []).map((c) => ({ value: c._id, label: `${c.customerId} - ${c.customerName}` })), [customers]);
    const itemOptions = useMemo(() => (stockItems || []).map((s) => ({ value: s._id, label: `${s.itemId} - ${s.itemName}` })), [stockItems]);
    const selectedCustomer = customers.find((c) => c._id === formData.partyId);

    const selectStyles = { control: (base, state) => ({ ...base, borderRadius: "0.5rem", border: formErrors.partyId ? "2px solid #ef4444" : "1px solid #e2e8f0", padding: "0.25rem", fontSize: "0.875rem", boxShadow: state.isFocused ? "0 0 0 3px rgba(59,130,246,0.1)" : "none", }) };

    // Ensure dates have values on create (preserve on edit)
    useEffect(() => {
      if (!isEditing) {
        const today = new Date().toISOString().slice(0, 10);
        setFormData(prev => ({
          ...prev,
          date: prev.date || today,
          deliveryDate: prev.deliveryDate || prev.date || today,
        }));
      }
    }, [isEditing, setFormData]);

    // --- UI with badges/tooltips for preview/manual ---
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white/80 backdrop-blur-xl shadow-xl border-b border-gray-200/50">
          <div className="px-8 py-6 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button onClick={() => { setActiveView("list"); resetForm(); }} className="flex items-center space-x-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
                <ArrowLeft className="w-4 h-4" /> <span>Back</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">
                  {isEditing ? "Edit Sales Order" : "Create Sales Order"}
                </h1>
                <p className="text-slate-600">Fill in all required fields</p>
                  
            </div>
            <button onClick={saveSO} className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 shadow-lg disabled:opacity-60" disabled={saveLoading} aria-busy={saveLoading} aria-label="Save Sales Order">
              {saveLoading ? <span className="loader mr-2" aria-label="Saving..." /> : <Save className="w-5 h-5" />}
              <span>{isEditing ? "Update SO" : "Save SO"}</span>
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-2xl p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="space-y-6">
                {/* SO Number with optional Manual toggle (create mode) */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">SO Number</label>
                  <div className="relative flex items-center gap-2">
                    <div className="relative flex-1">
                      <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      {isEditing || !numberManual ? (
                        <input
                          type="text"
                          name="transactionNo"
                          value={isEditing ? (formData.transactionNo || selectedSO?.transactionNo || selectedSO?.orderNumber || selectedSO?.displayTransactionNo || "") : (formData.transactionNo || "")}
                          onChange={undefined}
                          readOnly={true}
                          placeholder={isEditing ? (formData.transactionNo || selectedSO?.transactionNo || selectedSO?.orderNumber || selectedSO?.displayTransactionNo || "") : (previewLoading ? "Loading preview..." : preview || "Preview will appear")}
                          className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 border-slate-200 cursor-not-allowed`}
                          aria-readonly={true}
                          aria-label={"Auto SO number preview"}
                        />
                      ) : (
                        <input
                          type="text"
                          name="transactionNo"
                          value={formData.transactionNo || ''}
                          onChange={handleInputChange}
                          readOnly={false}
                          placeholder="Enter SO number"
                          className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white border-slate-300`}
                          aria-readonly={false}
                          aria-label={"Manual SO number input"}
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
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded" aria-label="Preview badge" tabIndex={0} title="Preview — not reserved until you Save.">Preview</span>
                      )}
                      {!isEditing && numberManual && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded" aria-label="Manual badge" tabIndex={0} title="Manual entry mode.">Manual</span>
                      )}
                      {conflict && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded" aria-label="Conflict badge" tabIndex={0} title="Number allocation conflict — fetching new preview...">Conflict</span>
                      )}
                    </div>
                  </div>
                  {!isEditing && !numberManual && (
                    <div className="text-xs text-slate-500 mt-1" id="preview-tooltip">Preview — not reserved until you Save.</div>
                  )}
                  {!isEditing && numberManual && (
                    <div className="text-xs text-yellow-600 mt-1" id="manual-tooltip">Manual entry — any string allowed.</div>
                  )}
                  {conflict && (
                    <div className="text-xs text-red-600 mt-1" id="conflict-tooltip">Number allocation conflict — fetching new preview. Please try saving again.</div>
                  )}
                </div>
                {/* Order Date and Delivery Date fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />Order Date
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date || ""}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.date ? "border-red-500" : "border-slate-200"}`}
                      disabled={false}
                      required
                      aria-label="Order date"
                    />
                    {formErrors.date && <p className="text-red-500 text-xs mt-1">{formErrors.date}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />Delivery Date
                    </label>
                    <input
                      type="date"
                      name="deliveryDate"
                      value={formData.deliveryDate || ""}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.deliveryDate ? "border-red-500" : "border-slate-200"}`}
                      disabled={false}
                      required
                      aria-label="Delivery date"
                    />
                    {formErrors.deliveryDate && <p className="text-red-500 text-xs mt-1">{formErrors.deliveryDate}</p>}
                  </div>
                </div>
                {/* Customer Select */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />Customer
                  </label>
                  <Select
                    options={customerOptions}
                    value={formData.partyId ? { value: formData.partyId, label: customerOptions.find(o => o.value === formData.partyId)?.label } : null}
                    onChange={lockCustomerField ? undefined : handleCustomerSelect}
                    placeholder="Select customer..."
                    styles={selectStyles}
                    isSearchable
                    isClearable={!lockCustomerField}
                    isDisabled={lockCustomerField}
                  />
                  {formErrors.partyId && <p className="text-red-500 text-xs mt-1">{formErrors.partyId}</p>}
                </div>
                {/* Status field removed per requirement */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">LPO No</label>
                    <input
                      type="text"
                      name="refNo"
                      value={formData.refNo || selectedSO?.refNo || selectedSO?.lpono || selectedSO?.lpoNo || selectedSO?.lpo || selectedSO?.reference || ''}
                      onChange={handleInputChange}
                      placeholder="Enter LPO/Reference No"
                      className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Doc No</label>
                    <input
                      type="text"
                      name="docNo"
                      value={formData.docNo || selectedSO?.docNo || selectedSO?.docno || selectedSO?.documentNo || selectedSO?.docNumber || ''}
                      onChange={handleInputChange}
                      placeholder="Enter Document No"
                      className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
                  <textarea name="notes" value={formData.notes || ''} onChange={handleInputChange} placeholder="Special instructions..." className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Discount (AED)</label>
                  <input type="number" name="discount" min="0" step="0.01" value={formData.discount || ''} onChange={handleInputChange} placeholder="0.00" className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Customer Summary</h3>
                {selectedCustomer ? (
                  <div className="text-sm space-y-2 text-slate-700">
                    <p className="font-semibold text-blue-600">{selectedCustomer.customerId}</p>
                    <p className="font-bold text-slate-800">{selectedCustomer.customerName}</p>
                    <p>{selectedCustomer.address}</p>
                    <p className="flex items-center"><User className="w-3 h-3 mr-1" />{selectedCustomer.phone}</p>
                    <p>{selectedCustomer.email}</p>
                    <p>VAT: {selectedCustomer.vatNumber}</p>
                  </div>
                ) : (
                  <p className="text-slate-500 italic">Select a customer</p>
                )}
                <div className="mt-6 pt-6 border-t border-slate-300">
                  <h4 className="font-semibold text-slate-800 mb-3">Order Totals</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Items:</span><span>{formData.items.filter((i) => i.itemId).length}</span></div>
                    <div className="flex justify-between"><span>Subtotal:</span><span>AED {totals.subtotal}</span></div>
                    <div className="flex justify-between"><span>VAT:</span><span>AED {totals.tax}</span></div>
                    <div className="flex justify-between"><span>Discount:</span><span className="text-rose-600">- AED {Number(effectiveDiscount).toFixed(2)}</span></div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-bold text-lg"><span>Total:</span><span className="text-emerald-600">AED {totalsAfterDiscount}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-800 flex items-center"><Package className="w-6 h-6 mr-2 text-blue-600" /> Items</h3>
                <button onClick={addItem} className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 shadow"><Plus className="w-4 h-4" /> <span>Add Item</span></button>
              </div>
              {formErrors.items && <p className="text-red-500 text-sm mb-4 flex items-center"><AlertCircle className="w-4 h-4 mr-1" />{formErrors.items}</p>}

              <div className="space-y-4">
                {formData.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-6 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-slate-600">Item</label>
                      <Select options={itemOptions} value={itemOptions.find(o => o.value === item.itemId) || null} onChange={(opt) => handleItemChange(idx, "itemId", opt ? opt.value : "")} placeholder="Select Item..." isSearchable styles={{control: b => ({...b, fontSize: "0.875rem", minHeight: "38px", borderRadius: "0.5rem", border: formErrors[`itemId_${idx}`] ? "2px solid #ef4444" : "1px solid #e2e8f0"})}}/>
                      {formErrors[`itemId_${idx}`] && <p className="text-red-500 text-xs mt-1">{formErrors[`itemId_${idx}`]}</p>}
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-slate-600">Description</label>
                      <input type="text" value={item.description || ''} onChange={(e) => handleItemChange(idx, "description", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
                    </div>
                    <div className="col-span-1">
                      <label className="text-xs font-medium text-slate-600">Purchase Price</label>
                      <input type="text" value={item.purchasePrice || '0.00'} readOnly className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-300 rounded-lg cursor-not-allowed"/>
                    </div>
                    <div className="col-span-1">
                      <label className="text-xs font-medium text-slate-600">Sales Price</label>
                      <input type="number" value={item.rate || ''} onChange={(e) => handleItemChange(idx, "rate", e.target.value)} min="0" step="0.01" className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors[`rate_${idx}`] ? "border-red-500" : "border-slate-300"}`}/>
                      {formErrors[`rate_${idx}`] && <p className="text-red-500 text-xs mt-1">{formErrors[`rate_${idx}`]}</p>}
                    </div>
                    <div className="col-span-1">
                      <label className="text-xs font-medium text-slate-600">Quantity</label>
                      <input type="number" value={item.qty || ''} onChange={(e) => handleItemChange(idx, "qty", e.target.value)} min="0" step="0.01" className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors[`qty_${idx}`] ? "border-red-500" : "border-slate-300"}`}/>
                      {formErrors[`qty_${idx}`] && <p className="text-red-500 text-xs mt-1">{formErrors[`qty_${idx}`]}</p>}
                    </div>
                    <div className="col-span-1">
                      <label className="text-xs font-medium text-slate-600">Current stock</label>
                      <input type="text" value={(item.currentStock ?? 0).toString()} readOnly className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-300 rounded-lg cursor-not-allowed"/>
                    </div>
                    
                    {/* FIX: Bind these inputs to the state fields calculated in handleItemChange */}
                    <div className="col-span-1">
                      <label className="text-xs font-medium text-slate-600">Total</label>
                      <input type="text" value={item.subtotal || '0.00'} readOnly className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-300 rounded-lg cursor-not-allowed"/>
                    </div>
                    <div className="col-span-1">
                      <label className="text-xs font-medium text-slate-600">VAT %</label>
                      <input type="number" value={item.vatPercent || '5'} onChange={(e) => handleItemChange(idx, "vatPercent", e.target.value)} min="0" step="0.1" className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors[`vatPercent_${idx}`] ? "border-red-500" : "border-slate-300"}`}/>
                    </div>
                    <div className="col-span-1">
                      <label className="text-xs font-medium text-slate-600">VAT Amount</label>
                      <input type="text" value={item.vatAmount || '0.00'} readOnly className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-300 rounded-lg cursor-not-allowed"/>
                    </div>
                    <div className="col-span-1">
                      <label className="text-xs font-medium text-slate-600">Grand Total</label>
                      <input type="text" value={item.lineTotal || '0.00'} readOnly className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-300 rounded-lg cursor-not-allowed"/>
                    </div>

                    <div className="col-span-1 flex items-end">
                      {formData.items.length > 1 && <button onClick={() => removeItem(idx)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-5 h-5" /></button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    );
  },
  (prev, next) =>
    prev.formData === next.formData &&
    prev.customers === next.customers &&
    prev.stockItems === next.stockItems &&
    prev.formErrors === next.formErrors &&
    prev.selectedSO === next.selectedSO &&
    prev.activeView === next.activeView
);

export default SOForm;