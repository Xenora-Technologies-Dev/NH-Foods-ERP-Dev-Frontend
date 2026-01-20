import React from "react";
import {
  Eye,
  ArrowRightCircle,
  XCircle,
  Trash2,
  MoreVertical,
  Building,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
} from "lucide-react";

const TableView = ({ grns, onView, onConvert, onCancel, onDelete }) => {
  const getStatusBadge = (status, converted) => {
    if (converted) {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Converted
        </span>
      );
    }

    switch (status) {
      case "RECEIVED":
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Received
          </span>
        );
      case "CONVERTED":
        return (
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Converted
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        );
      case "DRAFT":
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            Draft
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              GRN Number
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              PO Reference
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Vendor
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              GRN Date
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Items
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {grns.map((grn) => (
            <tr key={grn._id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="font-medium text-blue-600">{grn.grnNumber}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">
                    {grn.poNumber || grn.purchaseOrderId?.transactionNo || "-"}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span>{grn.vendorName || grn.vendorId?.vendorName || "Unknown"}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {new Date(grn.grnDate).toLocaleDateString()}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className="text-gray-700">{grn.items?.length || 0}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <span className="font-medium">
                  AED {(grn.grandTotal || grn.totalAmount || 0).toFixed(2)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                {getStatusBadge(grn.status, grn.convertedToPurchase)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => onView(grn)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    title="View GRN"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  {grn.status === "RECEIVED" && !grn.convertedToPurchase && (
                    <button
                      onClick={() => onConvert(grn._id)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition"
                      title="Convert to Purchase Entry"
                    >
                      <ArrowRightCircle className="w-4 h-4" />
                    </button>
                  )}
                  
                  {grn.status === "RECEIVED" && !grn.convertedToPurchase && (
                    <button
                      onClick={() => onCancel(grn._id)}
                      className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition"
                      title="Cancel GRN"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  
                  {grn.status === "DRAFT" && (
                    <button
                      onClick={() => onDelete(grn._id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                      title="Delete GRN"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableView;
