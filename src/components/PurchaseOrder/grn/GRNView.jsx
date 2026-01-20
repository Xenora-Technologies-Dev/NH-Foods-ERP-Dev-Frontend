/* GRN Document View - similar to Purchase Invoice format */
import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Printer, ArrowRightCircle, XCircle, CheckCircle } from "lucide-react";
import axiosInstance from "../../../axios/axios";
import { formatNumber, formatDateGB } from "../../../utils/format";

const GRNView = ({
  grn,
  vendors = [],
  onBack,
  onConvert,
  onCancel,
  addNotification,
}) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [profileData, setProfileData] = useState({
    companyName: "NAJM ALHUDA FOODSTUFF TRADING LLC S.O.C.C.",
    companyNameArabic: "نجم الهدى لتجارة المواد الغذائية ذ.م.م ش.ش.و",
    addressLine1: "DIP 2, Dubai, U.A.E.",
    addressLine2: "P.O. Box: 3352 - DUBAI - U.A.E.",
    phoneNumber: "04 885 7575",
    email: "corporate@elfab.ae",
    website: "www.nhfoodsglobal.com",
    vatNumber: "105033168300003",
    logo: null,
  });

  const adminId = sessionStorage.getItem("adminId");
  const token = sessionStorage.getItem("accessToken");

  useEffect(() => {
    const load = async () => {
      if (!adminId || !token) return;
      try {
        const { data } = await axiosInstance.get("/profile/me");
        if (data.success) {
          const d = data.data;
          setProfileData((p) => ({
            ...p,
            companyName: d.companyInfo?.companyName || p.companyName,
            companyNameArabic: d.companyInfo?.companyNameArabic || p.companyNameArabic,
            addressLine1: d.companyInfo?.addressLine1 || p.addressLine1,
            addressLine2: d.companyInfo?.addressLine2 || p.addressLine2,
            phoneNumber: d.companyInfo?.phoneNumber || p.phoneNumber,
            email: d.companyInfo?.emailAddress || p.email,
            website: d.companyInfo?.website || p.website,
            vatNumber: d.companyInfo?.vatNumber || p.vatNumber,
            logo: d.companyInfo?.companyLogo?.url || p.logo,
          }));
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [adminId, token]);

  if (!grn) return null;

  const vendor = vendors.find((v) => v._id === (grn.vendorId?._id || grn.vendorId)) || {};
  const vendorTRN = vendor.trnNO || grn.vendorTRN || "";
  const isConverted = grn.status === "CONVERTED" || grn.convertedToPurchase;
  const canConvert = grn.status === "RECEIVED" && !grn.convertedToPurchase;
  const canCancel = grn.status === "RECEIVED" && !grn.convertedToPurchase;

  // Calculate totals
  const subtotal = useMemo(() => 
    (grn.items || []).reduce((sum, item) => sum + (item.lineTotal || 0), 0), 
    [grn.items]
  );
  const vatTotal = useMemo(() => 
    (grn.items || []).reduce((sum, item) => sum + (item.vatAmount || 0), 0), 
    [grn.items]
  );
  const grandTotal = useMemo(() => grn.grandTotal || subtotal + vatTotal, [grn.grandTotal, subtotal, vatTotal]);

  // Number to words
  const numberToWords = (n) => {
    const a = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
    const b = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
    if (n === 0) return "Zero";
    let w = "";
    if (n >= 1000) { w += numberToWords(Math.floor(n/1000)) + " Thousand "; n = n % 1000; }
    if (n >= 100) { w += a[Math.floor(n/100)] + " Hundred "; n = n % 100; }
    if (n >= 20) { w += b[Math.floor(n/10)] + " "; n = n % 10; }
    if (n > 0) w += a[n] + " ";
    return w.trim();
  };
  const decimalWords = numberToWords(Math.round((grandTotal % 1) * 100));
  const amountInWords = `${numberToWords(Math.floor(grandTotal))} Dirhams and ${decimalWords} Fils Only`;

  // PDF generation - with oklch color workaround
  const generatePDF = async () => {
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      await new Promise((r) => setTimeout(r, 100));
      
      const el = document.getElementById("grn-content");
      if (!el) {
        console.error("GRN content element not found");
        addNotification && addNotification("PDF generation failed: content not found", "error");
        return;
      }

      // Clone the element to avoid modifying the original
      const clone = el.cloneNode(true);
      clone.style.position = "absolute";
      clone.style.left = "-9999px";
      clone.style.top = "0";
      clone.style.width = el.offsetWidth + "px";
      document.body.appendChild(clone);

      // Convert oklch colors to standard colors in the clone
      const convertOklchColors = (element) => {
        const computedStyle = window.getComputedStyle(element);
        const bgColor = computedStyle.backgroundColor;
        const textColor = computedStyle.color;
        const borderColor = computedStyle.borderColor;
        
        // If any color contains oklch, set fallback
        if (bgColor && bgColor.includes("oklch")) {
          element.style.backgroundColor = "#ffffff";
        }
        if (textColor && textColor.includes("oklch")) {
          element.style.color = "#000000";
        }
        if (borderColor && borderColor.includes("oklch")) {
          element.style.borderColor = "#e5e7eb";
        }
        
        // Recursively process children
        Array.from(element.children).forEach(convertOklchColors);
      };
      
      convertOklchColors(clone);

      const canvas = await html2canvas(clone, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: "#ffffff",
        logging: false,
        allowTaint: true,
        removeContainer: true,
        onclone: (clonedDoc) => {
          // Additional cleanup of oklch in cloned document
          const styles = clonedDoc.querySelectorAll('style');
          styles.forEach(style => {
            if (style.textContent.includes('oklch')) {
              style.textContent = style.textContent.replace(/oklch\([^)]+\)/g, '#3b82f6');
            }
          });
        }
      });
      
      // Remove the clone
      document.body.removeChild(clone);

      const img = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfW = 210, pdfH = 297;
      const ratio = Math.min(pdfW / canvas.width, pdfH / canvas.height);
      const w = canvas.width * ratio, h = canvas.height * ratio;
      pdf.addImage(img, "JPEG", (pdfW - w) / 2, Math.max(5, (pdfH - h) / 2), w, h, undefined, "FAST");
      const fname = `GRN_${grn.grnNumber || 'document'}.pdf`;
      pdf.save(fname);
      addNotification && addNotification("PDF downloaded successfully", "success");
    } catch (error) {
      console.error("PDF generation error:", error);
      addNotification && addNotification(`PDF generation failed: ${error.message}`, "error");
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById("grn-content");
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Action Bar */}
        <div className="flex justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700"
          >
            <ArrowLeft className="w-4 h-4" /> Back to List
          </button>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                setIsGeneratingPDF(true);
                try {
                  await generatePDF();
                } finally {
                  setIsGeneratingPDF(false);
                }
              }}
              disabled={isGeneratingPDF}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isGeneratingPDF ? (
                <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            {canConvert && (
              <button
                onClick={() => onConvert(grn._id)}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                <ArrowRightCircle className="w-4 h-4" />
                Convert to Purchase Entry
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => onCancel(grn._id)}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Status Banner */}
        {isConverted && (
          <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">
              This GRN has been converted to Purchase Entry. Inventory and accounts have been updated.
            </span>
          </div>
        )}

        {/* GRN Document */}
        <div
          id="grn-content"
          className="bg-white rounded-lg shadow-lg overflow-hidden"
          style={{ fontFamily: "Arial, sans-serif" }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-6">
            <div className="flex justify-between items-start">
              <div>
                {profileData.logo && (
                  <img
                    src={profileData.logo}
                    alt="Company Logo"
                    className="h-16 mb-2"
                  />
                )}
                <h1 className="text-2xl font-bold">{profileData.companyName}</h1>
                <p className="text-blue-200">{profileData.companyNameArabic}</p>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold mb-2">GOODS RECEIVED NOTE</h2>
                <p className="text-blue-200 text-lg">{grn.grnNumber}</p>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="p-6 grid grid-cols-2 gap-6 border-b">
            {/* Vendor Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                Vendor Details
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-bold text-lg">
                  {grn.vendorName || vendor.vendorName || "Unknown Vendor"}
                </p>
                {vendor.address && <p className="text-gray-600">{vendor.address}</p>}
                {vendorTRN && (
                  <p className="text-sm text-gray-500 mt-2">TRN: {vendorTRN}</p>
                )}
              </div>
            </div>

            {/* GRN Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                GRN Details
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">GRN Date:</span>
                  <span className="font-medium">
                    {new Date(grn.grnDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Received Date:</span>
                  <span className="font-medium">
                    {new Date(grn.receivedDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">PO Inv No:</span>
                  <span className="font-medium text-blue-600">{grn.poNumber}</span>
                </div>
                {grn.deliveryNoteNo && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Note:</span>
                    <span className="font-medium">{grn.deliveryNoteNo}</span>
                  </div>
                )}
                {grn.deliveryChallanNo && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Challan No:</span>
                    <span className="font-medium">{grn.deliveryChallanNo}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          {(grn.vehicleNo || grn.driverName || grn.receivedBy) && (
            <div className="px-6 py-3 bg-gray-50 border-b flex gap-8 text-sm">
              {grn.vehicleNo && (
                <div>
                  <span className="text-gray-500">Vehicle:</span>{" "}
                  <span className="font-medium">{grn.vehicleNo}</span>
                </div>
              )}
              {grn.driverName && (
                <div>
                  <span className="text-gray-500">Driver:</span>{" "}
                  <span className="font-medium">{grn.driverName}</span>
                </div>
              )}
              {grn.receivedBy && (
                <div>
                  <span className="text-gray-500">Received By:</span>{" "}
                  <span className="font-medium">{grn.receivedBy}</span>
                </div>
              )}
            </div>
          )}

          {/* Items Table */}
          <div className="p-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left text-xs font-semibold text-gray-600">
                    #
                  </th>
                  <th className="border p-2 text-left text-xs font-semibold text-gray-600">
                    Item Code
                  </th>
                  <th className="border p-2 text-left text-xs font-semibold text-gray-600">
                    Description
                  </th>
                  <th className="border p-2 text-center text-xs font-semibold text-gray-600">
                    PO Qty
                  </th>
                  <th className="border p-2 text-center text-xs font-semibold text-gray-600">
                    Received
                  </th>
                  <th className="border p-2 text-center text-xs font-semibold text-gray-600">
                    Pending
                  </th>
                  <th className="border p-2 text-right text-xs font-semibold text-gray-600">
                    Rate
                  </th>
                  <th className="border p-2 text-center text-xs font-semibold text-gray-600">
                    VAT %
                  </th>
                  <th className="border p-2 text-right text-xs font-semibold text-gray-600">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {(grn.items || []).map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border p-2 text-center text-sm">{index + 1}</td>
                    <td className="border p-2 text-sm">{item.itemCode || "-"}</td>
                    <td className="border p-2 text-sm">
                      <div>
                        <p>{item.description}</p>
                        {item.brand && (
                          <p className="text-xs text-gray-500">{item.brand}</p>
                        )}
                      </div>
                    </td>
                    <td className="border p-2 text-center text-sm">{item.poQty}</td>
                    <td className="border p-2 text-center text-sm font-medium text-green-600">
                      {item.receivedQty}
                    </td>
                    <td className="border p-2 text-center text-sm">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          item.pendingQty > 0
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {item.pendingQty}
                      </span>
                    </td>
                    <td className="border p-2 text-right text-sm">
                      {(item.rate || item.price || 0).toFixed(2)}
                    </td>
                    <td className="border p-2 text-center text-sm">
                      {item.vatPercent || 0}%
                    </td>
                    <td className="border p-2 text-right text-sm font-medium">
                      {(item.grandTotal || item.lineTotal || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mt-4">
              <div className="w-72">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">AED {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">VAT:</span>
                  <span className="font-medium">AED {vatTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 bg-blue-50 px-3 -mx-3 rounded">
                  <span className="font-bold text-lg">Grand Total:</span>
                  <span className="font-bold text-lg text-blue-600">
                    AED {grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Amount in Words */}
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <p className="text-sm">
                <span className="font-semibold">Amount in Words:</span>{" "}
                {amountInWords}
              </p>
            </div>
          </div>

          {/* Notes */}
          {grn.notes && (
            <div className="px-6 pb-6">
              <h4 className="font-semibold text-gray-700 mb-2">Notes:</h4>
              <p className="text-gray-600 text-sm">{grn.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="bg-gray-100 p-6 border-t">
            <div className="grid grid-cols-3 gap-8">
              <div className="text-center">
                <div className="border-t-2 border-gray-400 pt-2 mt-8">
                  <p className="font-semibold">Received By</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t-2 border-gray-400 pt-2 mt-8">
                  <p className="font-semibold">Checked By</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t-2 border-gray-400 pt-2 mt-8">
                  <p className="font-semibold">Approved By</p>
                </div>
              </div>
            </div>
          </div>

          {/* Company Footer */}
          <div className="bg-blue-900 text-white text-center py-3 text-sm">
            <p>{profileData.addressLine1} | {profileData.addressLine2}</p>
            <p>Tel: {profileData.phoneNumber} | Email: {profileData.email}</p>
            {profileData.vatNumber && <p>TRN: {profileData.vatNumber}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GRNView;
