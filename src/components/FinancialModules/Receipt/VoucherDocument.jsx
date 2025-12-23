import React, { useRef } from "react";
import {
  X,
  Printer,
  Download,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  User,
  CreditCard,
  CheckCircle,
  Banknote,
} from "lucide-react";

const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(num);
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const VoucherDocument = ({ voucher, type = "receipt", onClose }) => {
  const printRef = useRef(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    const printWindow = window.open("", "", "width=800,height=600");
    printWindow.document.write(`
      <html>
        <head>
          <title>${type === "receipt" ? "Receipt" : "Payment"} Voucher - ${voucher.voucherNo || "N/A"}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #333; }
            .voucher-container { max-width: 800px; margin: 0 auto; border: 2px solid #1e40af; }
            .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 20px; }
            .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .company-details { font-size: 12px; opacity: 0.9; }
            .voucher-title { text-align: center; padding: 15px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
            .voucher-title h2 { font-size: 20px; color: #1e40af; text-transform: uppercase; letter-spacing: 2px; }
            .voucher-info { display: flex; justify-content: space-between; padding: 15px 20px; background: #f1f5f9; }
            .info-item { text-align: center; }
            .info-label { font-size: 11px; color: #64748b; text-transform: uppercase; }
            .info-value { font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 3px; }
            .section { padding: 15px 20px; border-bottom: 1px solid #e2e8f0; }
            .section-title { font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 10px; font-weight: 600; }
            .party-name { font-size: 16px; font-weight: 600; color: #1e293b; }
            .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .table th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 12px; color: #64748b; border-bottom: 2px solid #e2e8f0; }
            .table td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .table .amount { text-align: right; font-weight: 600; }
            .total-section { background: #f8fafc; padding: 15px 20px; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .total-row.grand { font-size: 18px; font-weight: bold; color: #1e40af; border-top: 2px solid #1e40af; padding-top: 15px; margin-top: 10px; }
            .footer { padding: 20px; border-top: 2px solid #e2e8f0; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
            .signature-box { text-align: center; width: 200px; }
            .signature-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; font-size: 12px; }
            .stamp-area { text-align: center; margin-top: 20px; padding: 20px; border: 1px dashed #cbd5e1; }
            .narration { font-style: italic; color: #64748b; padding: 10px; background: #f8fafc; border-radius: 5px; margin-top: 10px; }
            @media print {
              body { padding: 0; }
              .voucher-container { border: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const partyName = type === "receipt"
    ? (voucher.customerName || voucher.partyId?.customerName || voucher.partyName || "N/A")
    : (voucher.vendorName || voucher.partyId?.vendorName || voucher.partyName || "N/A");

  const accountName = voucher.toAccountId?.accountName || voucher.fromAccountId?.accountName || voucher.accountType || "N/A";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText size={20} />
            {type === "receipt" ? "Receipt" : "Payment"} Voucher
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center gap-2 transition-all"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Voucher Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
          <div ref={printRef} className="bg-white shadow-lg max-w-3xl mx-auto">
            {/* Company Header */}
            <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold tracking-wide">NH FOODSTUFF TRADING LLC</h1>
                  <p className="text-blue-100 text-sm mt-1">S.O.C.</p>
                </div>
                <div className="text-right text-sm text-blue-100">
                  <p className="flex items-center justify-end gap-1">
                    <MapPin size={12} />
                    Dubai, United Arab Emirates
                  </p>
                  <p className="flex items-center justify-end gap-1 mt-1">
                    <Phone size={12} />
                    +971 XX XXX XXXX
                  </p>
                  <p className="flex items-center justify-end gap-1 mt-1">
                    <Mail size={12} />
                    info@nhfoodstuff.com
                  </p>
                </div>
              </div>
            </div>

            {/* Voucher Title */}
            <div className="text-center py-4 bg-gray-50 border-b-2 border-blue-600">
              <h2 className="text-xl font-bold text-blue-800 uppercase tracking-widest">
                {type === "receipt" ? "Receipt Voucher" : "Payment Voucher"}
              </h2>
              <p className="text-gray-500 text-sm mt-1">Official Document</p>
            </div>

            {/* Voucher Info Bar */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 border-b">
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase font-medium">Voucher No.</p>
                <p className="text-lg font-bold text-blue-800">{voucher.voucherNo || "N/A"}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase font-medium">Date</p>
                <p className="text-lg font-bold text-gray-800">{formatDate(voucher.date)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase font-medium">Status</p>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  <CheckCircle size={14} />
                  Confirmed
                </span>
              </div>
            </div>

            {/* Party Information */}
            <div className="p-5 border-b">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                    {type === "receipt" ? "Received From" : "Paid To"}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{partyName}</p>
                      <p className="text-sm text-gray-500">
                        {type === "receipt" ? "Customer" : "Vendor"}
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                    {type === "receipt" ? "Deposited To" : "Paid From"}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Banknote size={20} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{accountName}</p>
                      <p className="text-sm text-gray-500 capitalize">{voucher.accountType || "Account"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            {voucher.linkedInvoices && voucher.linkedInvoices.length > 0 && (
              <div className="p-5 border-b">
                <p className="text-xs text-gray-500 uppercase font-medium mb-3">
                  {type === "receipt" ? "Payment Against Invoices" : "Payment For Invoices"}
                </p>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">S.No</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Invoice No.</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Amount (AED)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voucher.linkedInvoices.map((inv, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm text-gray-600">{idx + 1}</td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">
                          {inv.invoiceId?.transactionNo || 
                           inv.invoiceId?.docno || 
                           inv.transactionNo || 
                           (typeof inv.invoiceId === 'string' ? inv.invoiceId : 'N/A')}
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">
                          {formatCurrency(inv.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Total Section */}
            <div className="p-5 bg-gradient-to-r from-blue-50 to-blue-100 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Total Amount {type === "receipt" ? "Received" : "Paid"}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {voucher.linkedInvoices?.length || 0} invoice(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-800">
                    {formatCurrency(voucher.totalAmount ?? voucher.amount)}
                  </p>
                  <p className="text-sm text-gray-500">AED</p>
                </div>
              </div>
            </div>

            {/* Narration */}
            {voucher.narration && (
              <div className="p-5 border-b">
                <p className="text-xs text-gray-500 uppercase font-medium mb-2">Narration / Remarks</p>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg italic">
                  {voucher.narration}
                </p>
              </div>
            )}

            {/* Signatures */}
            <div className="p-6">
              <div className="grid grid-cols-3 gap-8 mt-8">
                <div className="text-center">
                  <div className="h-16 border-b-2 border-gray-300 mb-2"></div>
                  <p className="text-sm font-medium text-gray-600">Prepared By</p>
                </div>
                <div className="text-center">
                  <div className="h-16 border-b-2 border-gray-300 mb-2"></div>
                  <p className="text-sm font-medium text-gray-600">Checked By</p>
                </div>
                <div className="text-center">
                  <div className="h-16 border-b-2 border-gray-300 mb-2"></div>
                  <p className="text-sm font-medium text-gray-600">
                    {type === "receipt" ? "Received By" : "Paid By"}
                  </p>
                </div>
              </div>

              {/* Stamp Area */}
              <div className="mt-8 text-center">
                <div className="inline-block border-2 border-dashed border-gray-300 px-12 py-6 rounded-lg">
                  <p className="text-xs text-gray-400 uppercase">Company Stamp</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 p-4 text-center border-t">
              <p className="text-xs text-gray-500">
                This is a computer-generated document. No signature is required for amounts below AED 10,000.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Generated on {new Date().toLocaleString("en-GB")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoucherDocument;
