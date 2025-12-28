import React, { useRef, useEffect, useState } from "react";
import {
  ArrowLeft,
  Download,
  Printer,
  Building,
  FileText,
  Calendar,
  Hash,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import axiosInstance from "../../../axios/axios";

const DebitNoteView = ({ returnData, vendor, onBack }) => {
  const debitNoteRef = useRef(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [fullVendor, setFullVendor] = useState(vendor);

  // Fetch company info
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const response = await axiosInstance.get("/company-profile");
        setCompanyInfo(response.data.data || response.data);
      } catch (error) {
        console.error("Error fetching company info:", error);
      }
    };
    fetchCompanyInfo();
  }, []);

  // Fetch vendor details if not provided
  useEffect(() => {
    const fetchVendor = async () => {
      if (!vendor && returnData?.partyId) {
        try {
          const vendorId = returnData.partyId._id || returnData.partyId;
          const response = await axiosInstance.get(`/vendors/vendors/${vendorId}`);
          setFullVendor(response.data.data || response.data);
        } catch (error) {
          console.error("Error fetching vendor:", error);
        }
      }
    };
    fetchVendor();
  }, [vendor, returnData?.partyId]);

  const handleDownloadPDF = async () => {
    if (!debitNoteRef.current) return;

    const canvas = await html2canvas(debitNoteRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Debit_Note_${returnData?.debitNoteNo || returnData?.transactionNo || "DN"}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculate totals from return items
  const calculateTotals = () => {
    if (!returnData?.items) return { subtotal: 0, vat: 0, total: 0 };

    let subtotal = 0;
    let vat = 0;

    returnData.items.forEach((item) => {
      if (item.selectedForReturn && item.returnQty > 0) {
        const unitPrice = item.currentPurchasePrice || item.price || (item.rate / (item.originalQty || item.qty || 1));
        const lineTotal = item.returnQty * unitPrice;
        const vatAmount = (lineTotal * (item.vatPercent || 0)) / 100;
        subtotal += lineTotal;
        vat += vatAmount;
      }
    });

    return {
      subtotal: +subtotal.toFixed(2),
      vat: +vat.toFixed(2),
      total: +(subtotal + vat).toFixed(2),
    };
  };

  const totals = calculateTotals();
  const returnItems = returnData?.items?.filter((item) => item.selectedForReturn && item.returnQty > 0) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-4 py-2 bg-white rounded-xl shadow hover:shadow-md transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
            <span className="text-slate-700 font-medium">Back to List</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors"
            >
              <Download className="w-5 h-5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-colors"
            >
              <Printer className="w-5 h-5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Debit Note Document */}
        <div
          ref={debitNoteRef}
          className="bg-white rounded-2xl shadow-xl p-8 print:shadow-none print:rounded-none"
        >
          {/* Header with Company Logo and Title */}
          <div className="flex justify-between items-start border-b-2 border-orange-500 pb-6 mb-6">
            <div className="flex items-start space-x-4">
              {companyInfo?.logo ? (
                <img
                  src={companyInfo.logo}
                  alt="Company Logo"
                  className="w-24 h-24 object-contain"
                />
              ) : (
                <div className="w-24 h-24 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Building className="w-12 h-12 text-orange-500" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {companyInfo?.companyName || "Company Name"}
                </h1>
                <p className="text-slate-600 text-sm mt-1">
                  {companyInfo?.address || "Company Address"}
                </p>
                <p className="text-slate-600 text-sm">
                  {companyInfo?.city}, {companyInfo?.country}
                </p>
                <div className="flex items-center space-x-4 text-sm text-slate-500 mt-2">
                  {companyInfo?.phone && (
                    <span className="flex items-center">
                      <Phone className="w-3 h-3 mr-1" />
                      {companyInfo.phone}
                    </span>
                  )}
                  {companyInfo?.email && (
                    <span className="flex items-center">
                      <Mail className="w-3 h-3 mr-1" />
                      {companyInfo.email}
                    </span>
                  )}
                </div>
                {companyInfo?.trnNumber && (
                  <p className="text-sm text-slate-600 mt-1">
                    TRN: {companyInfo.trnNumber}
                  </p>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="bg-orange-500 text-white px-6 py-3 rounded-xl">
                <h2 className="text-2xl font-bold">DEBIT NOTE</h2>
              </div>
              <div className="mt-4 text-sm">
                <p className="text-slate-500">Debit Note No</p>
                <p className="text-xl font-bold text-orange-600">
                  {returnData?.debitNoteNo || "DN-XXXX"}
                </p>
              </div>
            </div>
          </div>

          {/* Document Info Section */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Vendor Details */}
            <div className="bg-slate-50 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                ISSUED TO (VENDOR)
              </h3>
              <div className="space-y-1">
                <p className="text-lg font-bold text-slate-800">
                  {fullVendor?.vendorName || returnData?.partyName || "Vendor Name"}
                </p>
                <p className="text-sm text-slate-600">
                  {fullVendor?.vendorId || ""}
                </p>
                {fullVendor?.address && (
                  <p className="text-sm text-slate-600 flex items-start">
                    <MapPin className="w-4 h-4 mr-1 mt-0.5 text-slate-400" />
                    {fullVendor.address}
                  </p>
                )}
                {fullVendor?.phone && (
                  <p className="text-sm text-slate-600 flex items-center">
                    <Phone className="w-4 h-4 mr-1 text-slate-400" />
                    {fullVendor.phone}
                  </p>
                )}
                {fullVendor?.email && (
                  <p className="text-sm text-slate-600 flex items-center">
                    <Mail className="w-4 h-4 mr-1 text-slate-400" />
                    {fullVendor.email}
                  </p>
                )}
                {fullVendor?.trnNumber && (
                  <p className="text-sm text-slate-600 mt-2">
                    <span className="font-medium">TRN:</span> {fullVendor.trnNumber}
                  </p>
                )}
              </div>
            </div>

            {/* Debit Note Details */}
            <div className="bg-orange-50 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                DEBIT NOTE DETAILS
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Return No</p>
                  <p className="font-semibold text-slate-800">{returnData?.transactionNo}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Date</p>
                  <p className="font-semibold text-slate-800">
                    {new Date(returnData?.date).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Original Invoice</p>
                  <p className="font-semibold text-slate-800">{returnData?.originalInvoiceNo}</p>
                </div>
                {returnData?.reference && (
                  <div>
                    <p className="text-xs text-slate-500">Reference</p>
                    <p className="font-semibold text-slate-800">{returnData.reference}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-orange-500" />
              RETURNED ITEMS
            </h3>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Return Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">VAT %</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">VAT Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returnItems.map((item, index) => {
                  const unitPrice = item.currentPurchasePrice || item.price || (item.rate / (item.originalQty || item.qty || 1));
                  const lineTotal = item.returnQty * unitPrice;
                  const vatAmount = (lineTotal * (item.vatPercent || 0)) / 100;
                  const total = lineTotal + vatAmount;

                  return (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{index + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{item.description}</p>
                        <p className="text-xs text-slate-500">{item.itemCode}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-800">{item.returnQty}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{item.vatPercent || 0}%</td>
                      <td className="px-4 py-3 text-right text-slate-600">{vatAmount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{total.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end">
            <div className="w-80">
              <div className="bg-slate-50 rounded-xl p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium text-slate-800">
                    AED {(returnData?.subtotalAmount || totals.subtotal).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">VAT</span>
                  <span className="font-medium text-slate-800">
                    AED {(returnData?.vatAmount || totals.vat).toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-800">Total Debit Note Value</span>
                    <span className="text-xl font-bold text-orange-600">
                      AED {(returnData?.totalAmount || totals.total).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {returnData?.notes && (
            <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <h4 className="font-semibold text-amber-800 mb-2">Notes</h4>
              <p className="text-amber-700 text-sm">{returnData.notes}</p>
            </div>
          )}

          {/* Footer Section */}
          <div className="mt-10 pt-6 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-6">Authorized Signature</p>
                <div className="border-t border-slate-300 w-48"></div>
                <p className="text-xs text-slate-500 mt-2">Company Representative</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-600 mb-6">Received By</p>
                <div className="border-t border-slate-300 w-48 ml-auto"></div>
                <p className="text-xs text-slate-500 mt-2">Vendor Representative</p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex justify-center mt-8">
              <div className="flex items-center space-x-2 px-6 py-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-700">DEBIT NOTE ISSUED</span>
              </div>
            </div>

            {/* Generated Info */}
            <div className="text-center mt-4 text-xs text-slate-400">
              <p>Generated on {new Date().toLocaleString("en-GB")}</p>
              <p>{companyInfo?.companyName} - All Rights Reserved</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebitNoteView;
