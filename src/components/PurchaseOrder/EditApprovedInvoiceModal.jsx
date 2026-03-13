import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  X,
  Save,
  AlertTriangle,
  Search,
  ArrowRight,
  Package,
  Calendar,
  User,
  FileText,
  RefreshCw,
} from "lucide-react";
import axiosInstance from "../../axios/axios";

/* ───────────────────────────────────────────────────────────
   Inline Item Search Dropdown (overlay style)
   ─────────────────────────────────────────────────────────── */
const ItemSearchDropdown = ({ stockItems, currentItemId, currentName, type, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const filtered = useMemo(() => {
    const list = stockItems || [];
    if (!search) return list.slice(0, 50);
    const q = search.toLowerCase();
    return list.filter(
      (s) =>
        s.itemName?.toLowerCase().includes(q) ||
        s.itemId?.toLowerCase().includes(q) ||
        s.sku?.toLowerCase().includes(q)
    );
  }, [stockItems, search]);

  return (
    <div className="relative" ref={ref}>
      {/* Select-style trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-1 pl-2.5 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs text-left bg-white hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
      >
        <span className="truncate text-slate-800 font-medium group-hover:text-blue-700">
          {currentName || "Select item…"}
        </span>
        <RefreshCw className="w-3 h-3 text-slate-400 flex-shrink-0 group-hover:text-blue-500" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search header */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, code, or SKU…"
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white"
              />
            </div>
          </div>
          {/* Items list */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-xs text-slate-400 text-center">
                No items found
              </div>
            ) : (
              filtered.map((stock) => {
                const isCurrent = String(stock._id) === String(currentItemId);
                const displayPrice =
                  type === "sales"
                    ? stock.salesPrice || 0
                    : stock.purchasePrice || 0;
                return (
                  <button
                    key={stock._id}
                    type="button"
                    onClick={() => {
                      onSelect(stock);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-none ${
                      isCurrent ? "bg-blue-50/60" : ""
                    }`}
                  >
                    <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium truncate ${isCurrent ? "text-blue-700" : "text-slate-800"}`}>
                        {stock.itemName}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{stock.sku || stock.itemId}</span>
                        <span>·</span>
                        <span>AED {Number(displayPrice).toFixed(2)}</span>
                        <span>·</span>
                        <span>Stock: {stock.currentStock ?? "—"}</span>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">
                        CURRENT
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   Main Modal
   ═══════════════════════════════════════════════════════════ */
const EditApprovedInvoiceModal = ({ invoice, type, onClose, onSaved }) => {
  const [items, setItems] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Fetch stock items list for item change dropdown
  useEffect(() => {
    axiosInstance
      .get("/stock/stock", { params: { limit: 5000 } })
      .then((res) => {
        const stocks = res.data?.data?.stocks || res.data?.data || [];
        setStockItems(stocks);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (invoice?.items) {
      setItems(
        invoice.items.map((item) => {
          const qty = Number(item.qty || 0);
          const rateRaw = Number(item.rate || 0);
          const priceRaw = Number(item.price || item.unitPrice || 0);
          // Derive per-unit price: prefer explicit price, fallback rate/qty
          const unitPrice = priceRaw > 0 ? priceRaw : qty > 0 ? rateRaw / qty : 0;
          return {
            itemId: item.itemId,
            description: item.description || item.itemName || "",
            itemCode: item.itemCode || "",
            qty,
            unitPrice: +unitPrice.toFixed(4),
            vatPercent: Number(item.vatPercent || 0),
            _originalItemId: item.itemId,
            _originalDescription: item.description || item.itemName || "",
            _originalItemCode: item.itemCode || "",
            _originalQty: qty,
            _originalUnitPrice: +unitPrice.toFixed(4),
          };
        })
      );
    }
  }, [invoice]);

  const recalcItem = useCallback((item) => {
    const lineValue = item.qty * item.unitPrice;
    const vatAmount = +((lineValue * item.vatPercent) / 100).toFixed(2);
    const lineTotal = +(lineValue + vatAmount).toFixed(2);
    return { ...item, lineValue: +lineValue.toFixed(2), vatAmount, lineTotal };
  }, []);

  const recalculatedItems = items.map(recalcItem);
  const subtotal = recalculatedItems.reduce((s, i) => s + (i.lineValue || 0), 0);
  const totalVat = recalculatedItems.reduce((s, i) => s + (i.vatAmount || 0), 0);
  const grandTotal = +(subtotal + totalVat).toFixed(2);
  const oldTotal = Number(invoice?.totalAmount || 0);
  const delta = +(grandTotal - oldTotal).toFixed(2);

  const handleQtyChange = (index, value) => {
    const parsed = parseFloat(value);
    if (value !== "" && (isNaN(parsed) || parsed < 0)) return;
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, qty: value === "" ? "" : parsed } : item
      )
    );
  };

  const handleUnitPriceChange = (index, value) => {
    const parsed = parseFloat(value);
    if (value !== "" && (isNaN(parsed) || parsed < 0)) return;
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, unitPrice: value === "" ? "" : parsed }
          : item
      )
    );
  };

  const handleItemChange = (index, stock) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              itemId: stock._id,
              description: stock.itemName,
              itemCode: stock.sku || stock.itemId,
              unitPrice: Number(
                type === "sales"
                  ? stock.salesPrice || 0
                  : stock.purchasePrice || 0
              ),
            }
          : item
      )
    );
  };

  const hasChanges = items.some(
    (item) =>
      item.qty !== item._originalQty ||
      item.unitPrice !== item._originalUnitPrice ||
      String(item.itemId) !== String(item._originalItemId)
  );

  // Build change summary for preview
  const changeSummary = useMemo(() => {
    const changes = [];
    items.forEach((item, idx) => {
      const calc = recalcItem(item);
      const origCalc = recalcItem({
        ...item,
        itemId: item._originalItemId,
        description: item._originalDescription,
        qty: item._originalQty,
        unitPrice: item._originalUnitPrice,
      });
      const itemChanged = String(item.itemId) !== String(item._originalItemId);
      const qtyChanged = item.qty !== item._originalQty;
      const priceChanged = item.unitPrice !== item._originalUnitPrice;
      if (itemChanged || qtyChanged || priceChanged) {
        changes.push({
          position: idx + 1,
          itemChanged,
          oldItemCode: item._originalItemCode,
          oldDescription: item._originalDescription,
          newItemCode: item.itemCode,
          newDescription: item.description,
          qtyChanged,
          oldQty: item._originalQty,
          newQty: item.qty,
          priceChanged,
          oldUnitPrice: item._originalUnitPrice,
          newUnitPrice: item.unitPrice,
          oldLineTotal: origCalc.lineTotal,
          newLineTotal: calc.lineTotal,
        });
      }
    });
    return changes;
  }, [items, recalcItem]);

  const handleSave = async () => {
    setShowConfirm(false);
    setSaving(true);
    setError(null);
    try {
      const transactionId = invoice.transactionId || invoice.id;
      // Send unitPrice as `price` — backend calculateItems uses price as per-unit
      const payload = {
        items: items.map((item) => ({
          itemId: item.itemId,
          qty: Number(item.qty || 0),
          price: Number(item.unitPrice || 0),
          rate: Number(item.unitPrice || 0),
        })),
      };
      const response = await axiosInstance.patch(
        `/transactions/transactions/${transactionId}/edit-approved`,
        payload
      );
      if (response.data?.status === "success") {
        onSaved(response.data.data);
      } else {
        setError(response.data?.message || "Failed to save changes");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to save changes"
      );
    } finally {
      setSaving(false);
    }
  };

  const invoiceLabel =
    type === "sales"
      ? invoice?.invoiceNumber || invoice?.orderNumber || invoice?.transactionNo || ""
      : invoice?.poNumber || invoice?.orderNumber || invoice?.transactionNo || "";

  const partyName =
    type === "sales"
      ? invoice?.customerName || invoice?.partyName || ""
      : invoice?.vendorName || invoice?.partyName || "";

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const accentColor = type === "sales" ? "orange" : "blue";
  const accentClasses = {
    sales: {
      headerGradient: "from-orange-50 via-amber-50 to-white",
      badge: "bg-orange-100 text-orange-700",
      accent: "text-orange-600",
      border: "border-orange-200",
      btn: "bg-orange-600 hover:bg-orange-700",
    },
    purchase: {
      headerGradient: "from-blue-50 via-sky-50 to-white",
      badge: "bg-blue-100 text-blue-700",
      accent: "text-blue-600",
      border: "border-blue-200",
      btn: "bg-blue-600 hover:bg-blue-700",
    },
  }[type];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1080px] max-h-[92vh] overflow-hidden flex flex-col">
        {/* ── Header ─────────────────────────────────────── */}
        <div className={`px-6 py-5 border-b ${accentClasses.border} bg-gradient-to-r ${accentClasses.headerGradient}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl ${accentClasses.badge} flex items-center justify-center`}>
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 leading-tight">
                  Edit {type === "sales" ? "Sales" : "Purchase"} Invoice
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-sm font-semibold ${accentClasses.accent}`}>
                    {invoiceLabel}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${accentClasses.badge}`}>
                    {invoice?.status}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-lg transition-colors -mt-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500">
            {partyName && (
              <span className="flex items-center gap-1.5">
                <User className="w-3 h-3" />
                <span className="font-medium text-slate-700">{partyName}</span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              Invoice: {formatDate(invoice?.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              Approved: {formatDateTime(invoice?.approvedAt)}
            </span>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────── */}
        <div className="flex-1 overflow-auto px-6 py-5">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Items grid — card-based for each row */}
          <div className="space-y-3">
            {recalculatedItems.map((item, index) => {
              const itemChanged = String(item.itemId) !== String(item._originalItemId);
              const qtyChanged = item.qty !== item._originalQty;
              const priceChanged = item.unitPrice !== item._originalUnitPrice;
              const isModified = itemChanged || qtyChanged || priceChanged;

              return (
                <div
                  key={index}
                  className={`rounded-xl border p-4 transition-all ${
                    isModified
                      ? "border-amber-300 bg-amber-50/30 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Line # badge */}
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0 mt-0.5">
                      {index + 1}
                    </div>

                    {/* Item selector column */}
                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">
                        Item
                      </label>
                      {stockItems.length > 0 ? (
                        <ItemSearchDropdown
                          stockItems={stockItems}
                          currentItemId={item.itemId}
                          currentName={item.description}
                          type={type}
                          onSelect={(stock) => handleItemChange(index, stock)}
                        />
                      ) : (
                        <div className="text-xs text-slate-700 font-medium py-1.5">
                          {item.description}
                        </div>
                      )}
                      {itemChanged && (
                        <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                          <span className="text-red-400 line-through">
                            {item._originalDescription}
                          </span>
                          <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                          <span className="text-green-600 font-semibold">
                            {item.description}
                          </span>
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Code: {item.itemCode || "—"}
                      </div>
                    </div>

                    {/* Qty */}
                    <div className="w-24 flex-shrink-0">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">
                        Qty
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.qty}
                        onChange={(e) => handleQtyChange(index, e.target.value)}
                        className={`w-full px-2.5 py-1.5 text-center text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                          qtyChanged
                            ? "border-amber-400 bg-amber-50"
                            : "border-slate-200"
                        }`}
                      />
                      {qtyChanged && (
                        <div className="text-[10px] text-slate-400 mt-0.5 text-center">
                          was {item._originalQty}
                        </div>
                      )}
                    </div>

                    {/* Unit Price */}
                    <div className="w-28 flex-shrink-0">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">
                        Unit Price
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleUnitPriceChange(index, e.target.value)
                        }
                        className={`w-full px-2.5 py-1.5 text-center text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                          priceChanged
                            ? "border-amber-400 bg-amber-50"
                            : "border-slate-200"
                        }`}
                      />
                      {priceChanged && (
                        <div className="text-[10px] text-slate-400 mt-0.5 text-center">
                          was {Number(item._originalUnitPrice).toFixed(2)}
                        </div>
                      )}
                    </div>

                    {/* VAT % */}
                    <div className="w-16 flex-shrink-0 text-center">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">
                        VAT
                      </label>
                      <div className="text-sm text-slate-600 py-1.5">
                        {item.vatPercent}%
                      </div>
                    </div>

                    {/* Line Total */}
                    <div className="w-28 flex-shrink-0 text-right">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">
                        Line Total
                      </label>
                      <div className="text-sm font-semibold text-slate-800 py-1.5">
                        {(item.lineTotal || 0).toFixed(2)}
                      </div>
                      {item.vatAmount > 0 && (
                        <div className="text-[10px] text-slate-400">
                          incl. VAT {(item.vatAmount || 0).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Totals ────────────────────────────────────── */}
          <div className="mt-5 flex justify-end">
            <div className="w-72 bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>AED {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>VAT</span>
                <span>AED {totalVat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800 text-base pt-2 border-t border-slate-200">
                <span>Total</span>
                <span>AED {grandTotal.toFixed(2)}</span>
              </div>
              {delta !== 0 && (
                <div
                  className={`flex justify-between text-xs font-semibold pt-1 ${
                    delta > 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  <span>Change from original</span>
                  <span>
                    {delta > 0 ? "+" : ""}AED {delta.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-400 text-xs">
                <span>Previous Total</span>
                <span>AED {oldTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Changes will update accounting, stock, and reports.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={saving || !hasChanges}
              className={`px-5 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${accentClasses.btn}`}
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : "Review & Save"}
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
         Confirmation Dialog with Change Preview
         ════════════════════════════════════════════════════ */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Preview Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Review Changes
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {invoiceLabel}
                    {partyName ? ` — ${partyName}` : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Preview Body */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                {changeSummary.length} Change{changeSummary.length !== 1 ? "s" : ""} Detected
              </div>

              <div className="space-y-3">
                {changeSummary.map((ch, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden"
                  >
                    {/* Card title */}
                    <div className="px-4 py-2.5 bg-slate-100/60 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        Line {ch.position}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {ch.itemChanged ? ch.newDescription : ch.oldDescription}
                      </span>
                    </div>

                    <div className="px-4 py-3 space-y-2 text-xs">
                      {/* Item change */}
                      {ch.itemChanged && (
                        <div className="flex items-start gap-2">
                          <span className="text-slate-400 w-16 flex-shrink-0 pt-0.5">Item:</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 px-2 py-0.5 rounded-md">
                                <span className="line-through">{ch.oldDescription}</span>
                                <span className="text-[9px] text-red-400">({ch.oldItemCode})</span>
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-md font-medium">
                                {ch.newDescription}
                                <span className="text-[9px] text-green-500">({ch.newItemCode})</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Qty change */}
                      {ch.qtyChanged && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 w-16 flex-shrink-0">Qty:</span>
                          <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-md">
                            {ch.oldQty}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-md font-medium">
                            {ch.newQty}
                          </span>
                        </div>
                      )}

                      {/* Unit price change */}
                      {ch.priceChanged && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 w-16 flex-shrink-0">Price:</span>
                          <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-md">
                            {Number(ch.oldUnitPrice).toFixed(2)}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-md font-medium">
                            {Number(ch.newUnitPrice).toFixed(2)}
                          </span>
                        </div>
                      )}

                      {/* Line total change */}
                      <div className="flex items-center gap-2 pt-1.5 border-t border-slate-200 mt-1">
                        <span className="text-slate-400 w-16 flex-shrink-0">Total:</span>
                        <span className="text-slate-600">
                          AED {Number(ch.oldLineTotal).toFixed(2)}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="font-bold text-slate-800">
                          AED {Number(ch.newLineTotal).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Impact Summary ──────────────────────────── */}
              <div className="mt-4 bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2.5">
                  Impact Summary
                </div>
                <div className="space-y-1.5 text-xs text-amber-800">
                  <div className="flex justify-between">
                    <span>Previous Total</span>
                    <span className="font-medium">AED {oldTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New Total</span>
                    <span className="font-medium">AED {grandTotal.toFixed(2)}</span>
                  </div>
                  {delta !== 0 && (
                    <div className="flex justify-between pt-1.5 border-t border-amber-200">
                      <span>
                        {type === "sales" ? "Customer" : "Vendor"} Balance Adjustment
                      </span>
                      <span
                        className={`font-bold ${
                          delta > 0 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {delta > 0 ? "+" : ""}AED {delta.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {changeSummary.some((ch) => ch.itemChanged) && (
                    <div className="pt-1.5 border-t border-amber-200 text-amber-700">
                      Stock will be reversed for old items and re-applied for new items
                    </div>
                  )}
                  {!changeSummary.some((ch) => ch.itemChanged) &&
                    changeSummary.some((ch) => ch.qtyChanged) && (
                      <div className="pt-1.5 border-t border-amber-200 text-amber-700">
                        Stock movements will be adjusted for quantity changes
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Preview Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
              >
                Go Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-5 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${accentClasses.btn}`}
              >
                {saving ? "Saving…" : "Confirm & Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditApprovedInvoiceModal;
