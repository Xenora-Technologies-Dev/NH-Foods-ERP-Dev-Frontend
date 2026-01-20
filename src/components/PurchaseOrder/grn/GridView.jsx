import React from "react";
import {
  Eye,
  ArrowRightCircle,
  XCircle,
  Building,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  Package,
  Truck,
} from "lucide-react";

const GridView = ({ grns, onView, onConvert, onCancel }) => {
  const getStatusBadge = (status, converted) => {
    if (converted) {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Converted
        </span>
      );
    }

    switch (status) {
      case "RECEIVED":
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Received
          </span>
        );
      case "CONVERTED":
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Converted
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {grns.map((grn) => (
        <div
          key={grn._id}
          className="bg-white border rounded-xl p-5 hover:shadow-lg transition-all duration-300"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">GRN Number</p>
              <h3 className="font-bold text-lg text-blue-600">{grn.grnNumber}</h3>
            </div>
            {getStatusBadge(grn.status, grn.convertedToPurchase)}
          </div>

          {/* PO Reference */}
          <div className="flex items-center gap-2 mb-3 text-sm">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">PO:</span>
            <span className="font-medium">
              {grn.poNumber || grn.purchaseOrderId?.transactionNo || "-"}
            </span>
          </div>

          {/* Vendor */}
          <div className="flex items-center gap-2 mb-3 text-sm">
            <Building className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">
              {grn.vendorName || grn.vendorId?.vendorName || "Unknown"}
            </span>
          </div>

          {/* Date & Items */}
          <div className="flex items-center justify-between mb-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{new Date(grn.grnDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              <span>{grn.items?.length || 0} items</span>
            </div>
          </div>

          {/* Delivery Info */}
          {grn.deliveryNoteNo && (
            <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
              <Truck className="w-4 h-4 text-gray-400" />
              <span>DN: {grn.deliveryNoteNo}</span>
            </div>
          )}

          {/* Amount */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Amount</span>
              <span className="text-xl font-bold text-gray-900">
                AED {(grn.grandTotal || grn.totalAmount || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => onView(grn)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              <Eye className="w-4 h-4" />
              View
            </button>
            
            {grn.status === "RECEIVED" && !grn.convertedToPurchase && (
              <>
                <button
                  onClick={() => onConvert(grn._id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <ArrowRightCircle className="w-4 h-4" />
                  Convert
                </button>
                <button
                  onClick={() => onCancel(grn._id)}
                  className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GridView;
