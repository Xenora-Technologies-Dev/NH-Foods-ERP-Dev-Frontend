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
  const isDirectGRN = grn.entryMode === "direct";

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

        {/* Direct GRN Badge */}
        {isDirectGRN && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2 text-orange-800">
            <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs font-bold rounded-full">
              DIRECT GRN
            </span>
            <span className="font-medium">
              This GRN was created without a Purchase Order (Direct Entry).
            </span>
            {grn.referenceNumber && (
              <span className="ml-auto text-sm">
                Ref: <strong>{grn.referenceNumber}</strong>
              </span>
            )}
          </div>
        )}

        {/* GRN Document */}
        <div
          id="grn-content"
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "10mm",
            background: "#fff",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 11,
            color: "#000",
            boxSizing: "border-box",
          }}
        >
          {/* Color coded top bar - Teal for GRN */}
          <div style={{ height: 6, background: "linear-gradient(90deg, #0d9488, #14b8a6)", marginBottom: 12, borderRadius: 3 }} />

          <div style={{ textAlign: "right", fontWeight: "bold", marginBottom: 9 }}>
            <span>Goods Received Note</span>
          </div>

          {/* Header block */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div style={{ width: "18%", textAlign: "left" }}>
              {profileData.logo ? (
                <img src={profileData.logo} alt="logo" style={{ width: 110 }} />
              ) : (
                <div style={{ width: 100, height: 100 }} />
              )}
            </div>

            <div style={{ width: "52%", textAlign: "center", paddingLeft: 8, paddingRight: 8 }}>
              <div style={{ fontWeight: "700", direction: "rtl", fontSize: 13 }}>{profileData.companyNameArabic}</div>
              <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4, whiteSpace: "nowrap" }}>
                {profileData.companyName}
              </div>
              <div style={{ marginTop: 6, fontSize: 11, lineHeight: 1.4 }}>
                <div>
                  {profileData.addressLine1 || "Dubai, United Arab Emirates."}
                  <span style={{ display: "inline-block", margin: "0 8px" }}>|</span>
                  <span>Tel: {profileData.phoneNumber}</span>
                </div>
                <div>
                  Email: {profileData.email}
                  <span style={{ display: "inline-block", margin: "0 8px" }}>|</span>
                  Web: {profileData.website}
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 11 }}>
                <strong>VAT Reg. No:</strong> {profileData.vatNumber}
              </div>
              <div style={{ fontWeight: 700, textDecoration: "underline", marginTop: 6, fontSize: 13, color: "#0d9488" }}>
                GOODS RECEIVED NOTE
              </div>
              {isDirectGRN && (
                <div style={{ marginTop: 4, fontSize: 10, color: "#9a3412", fontWeight: 600 }}>(Direct Entry - No PO)</div>
              )}
            </div>

            <div style={{ width: "28%", textAlign: "right", fontSize: 11 }} />
          </div>

          {/* Vendor + meta */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ width: "58%", fontSize: 11 }}>
              <div style={{ fontWeight: 700 }}>VENDOR:</div>
              <div style={{ marginTop: 6 }}>{vendor.vendorId || ""}</div>
              <div style={{ fontWeight: 700, marginTop: 6 }}>{grn.vendorName || vendor.vendorName || "Unknown Vendor"}</div>
              <div style={{ marginTop: 4 }}>{vendor.address || ""}</div>
              <div style={{ marginTop: 4 }}>TEL: {vendor.phone || ""}, Email: {vendor.email || ""}</div>
              {vendorTRN && <div style={{ marginTop: 4 }}>VAT Reg. No: {vendorTRN}</div>}
            </div>

            <div style={{ width: "38%", textAlign: "right", fontSize: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ textAlign: "left", minWidth: 120 }}>
                  <div style={{ fontWeight: 700 }}>GRN No:</div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>Date:</div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>Received:</div>
                  {!isDirectGRN && <div style={{ fontWeight: 700, marginTop: 6 }}>PO No:</div>}
                  {grn.deliveryNoteNo && <div style={{ fontWeight: 700, marginTop: 6 }}>Delivery Note:</div>}
                </div>
                <div style={{ textAlign: "right", minWidth: 140 }}>
                  <div style={{ fontWeight: 700, color: "#0d9488" }}>{grn.grnNumber}</div>
                  <div style={{ marginTop: 6 }}>{formatDateGB(grn.grnDate)}</div>
                  <div style={{ marginTop: 6 }}>{formatDateGB(grn.receivedDate)}</div>
                  {!isDirectGRN && <div style={{ marginTop: 6 }}>{grn.poNumber}</div>}
                  {grn.deliveryNoteNo && <div style={{ marginTop: 6 }}>{grn.deliveryNoteNo}</div>}
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: "#000", marginBottom: 8 }} />

          {/* Items */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, marginBottom: 10 }}>
            <thead>
              <tr style={{ background: "#ccfbf1" }}>
                <th style={{ width: 30, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>Line</th>
                <th style={{ width: 64, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>CODE</th>
                <th style={{ textAlign: "left", padding: "8px 10px 8px 22px", borderBottom: "1px solid #777" }}>Item Description</th>
                {!isDirectGRN && <th style={{ width: 55, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>PO Qty</th>}
                <th style={{ width: 60, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>Received</th>
                {!isDirectGRN && <th style={{ width: 55, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>Pending</th>}
                <th style={{ width: 72, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>Rate</th>
                <th style={{ width: 54, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>VAT %</th>
                <th style={{ width: 84, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>VAT Amt</th>
                <th style={{ width: 100, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>TOTAL AED</th>
              </tr>
            </thead>
            <tbody>
              {(grn.items || []).map((item, idx) => {
                const rate = parseFloat(item.rate || item.price || 0);
                const vatAmt = parseFloat(item.vatAmount || 0);
                const total = parseFloat(item.grandTotal || item.lineTotal || 0);
                return (
                  <tr key={idx}>
                    <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "top" }}>{idx + 1}</td>
                    <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "top" }}>{item.itemCode || "-"}</td>
                    <td style={{ padding: "8px 10px 8px 22px", verticalAlign: "top" }}>{item.description}{item.brand ? ` (${item.brand})` : ""}</td>
                    {!isDirectGRN && <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "top" }}>{item.poQty}</td>}
                    <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "top", fontWeight: 600, color: "#059669" }}>{item.receivedQty}</td>
                    {!isDirectGRN && <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "top", color: item.pendingQty > 0 ? "#d97706" : "#059669" }}>{item.pendingQty}</td>}
                    <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "top" }}>{formatNumber(rate)}</td>
                    <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "top" }}>{item.vatPercent || 0}</td>
                    <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "top" }}>{formatNumber(vatAmt)}</td>
                    <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "top" }}>{formatNumber(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ minHeight: 40 }} />

          {/* Totals */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
            <div style={{ width: "38%", fontSize: 11 }}>
              <div style={{ border: "1px solid #000", padding: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div>SUBTOTAL</div>
                  <div style={{ minWidth: 100, textAlign: "right" }}>{formatNumber(subtotal)}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div>VAT</div>
                  <div style={{ minWidth: 100, textAlign: "right" }}>{formatNumber(vatTotal)}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, paddingTop: 6, borderTop: "1px solid #000", fontWeight: 800 }}>
                  <div>GRAND TOTAL</div>
                  <div style={{ minWidth: 100, textAlign: "right" }}>{formatNumber(grandTotal)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {grn.notes && (
            <div style={{ marginTop: 12, fontSize: 10 }}>
              <div style={{ fontWeight: 700 }}>Notes:</div>
              <div style={{ marginTop: 4 }}>{grn.notes}</div>
            </div>
          )}

          {/* Signatures */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, alignItems: "flex-start" }}>
            <div style={{ width: "30%", textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #000", paddingTop: 6, marginTop: 40 }}>
                <div style={{ fontWeight: 600, fontSize: 10 }}>Received By</div>
              </div>
            </div>
            <div style={{ width: "30%", textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #000", paddingTop: 6, marginTop: 40 }}>
                <div style={{ fontWeight: 600, fontSize: 10 }}>Checked By</div>
              </div>
            </div>
            <div style={{ width: "30%", textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #000", paddingTop: 6, marginTop: 40 }}>
                <div style={{ fontWeight: 600, fontSize: 10 }}>Approved By</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 18, fontSize: 10 }}>
            <div>This is computer generated document. Therefore signature is not required.</div>
            <div style={{ marginTop: 6 }}>For {profileData.companyName}</div>
          </div>

          <div style={{ textAlign: "center", marginTop: 18, fontSize: 10 }}>Page 1 of 1</div>
        </div>
      </div>
    </div>
  );
};

export default GRNView;
