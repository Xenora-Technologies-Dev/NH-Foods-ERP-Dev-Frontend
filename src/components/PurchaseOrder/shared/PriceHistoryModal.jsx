import React, { useState, useEffect } from "react";
import { X, TrendingUp, TrendingDown, Loader2, Package } from "lucide-react";
import axiosInstance from "../../../axios/axios";

/**
 * PriceHistoryModal - Shows last 3 sales and purchase history for an item.
 * Props:
 *   - isOpen: boolean
 *   - onClose: () => void
 *   - itemId: string (stock _id)
 *   - itemName: string
 *   - contextType: "sales" | "purchase" — determines which section shows first
 */
const PriceHistoryModal = ({ isOpen, onClose, itemId, itemName, contextType = "sales" }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ sales: [], purchases: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && itemId) {
      setLoading(true);
      setError("");
      axiosInstance
        .get(`/stock/stock/${itemId}/price-history`)
        .then((res) => {
          const d = res.data?.data || {};
          setData({
            sales: d.sales || [],
            purchases: d.purchases || [],
          });
        })
        .catch((err) => {
          setError(err.response?.data?.message || "Failed to load price history");
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, itemId]);

  if (!isOpen) return null;

  const formatDate = (d) => {
    if (!d) return "N/A";
    try {
      return new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  // Render a section (sales or purchases)
  const renderSalesSection = () => (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <h4 className="font-semibold text-sm text-slate-800">Recent Sales</h4>
        <span className="text-xs text-slate-400 ml-auto">{data.sales.length} record{data.sales.length !== 1 ? 's' : ''}</span>
      </div>
      {data.sales.length === 0 ? (
        <div className="text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <p className="text-xs text-slate-400 italic">No sales history found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.sales.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 hover:bg-emerald-100/60 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-slate-700">{s.partyName}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(s.date)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-700">AED {Number(s.price).toFixed(2)}</p>
                <p className="text-xs text-slate-400 mt-0.5">Qty: {s.qty}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderPurchaseSection = () => (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
          <TrendingDown className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <h4 className="font-semibold text-sm text-slate-800">Recent Purchases</h4>
        <span className="text-xs text-slate-400 ml-auto">{data.purchases.length} record{data.purchases.length !== 1 ? 's' : ''}</span>
      </div>
      {data.purchases.length === 0 ? (
        <div className="text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <p className="text-xs text-slate-400 italic">No purchase history found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.purchases.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 hover:bg-blue-100/60 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-slate-700">{p.partyName}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(p.date)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-blue-700">AED {Number(p.price).toFixed(2)}</p>
                <p className="text-xs text-slate-400 mt-0.5">Qty: {p.qty}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Price History</h3>
              <p className="text-xs text-blue-100 truncate max-w-[260px]">{itemName || "Item"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
              <span className="mt-2 text-sm text-slate-500">Loading price history...</span>
            </div>
          ) : error ? (
            <div className="text-center py-10 text-red-500 text-sm">{error}</div>
          ) : (
            <>
              {/* Show sections based on context — purchase form shows purchases first, sales form shows sales first */}
              {contextType === "purchase" ? (
                <>
                  {renderPurchaseSection()}
                  {renderSalesSection()}
                </>
              ) : (
                <>
                  {renderSalesSection()}
                  {renderPurchaseSection()}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-3 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PriceHistoryModal;
