import React, { useRef, useEffect, useState, useMemo } from "react";
import {
  ArrowLeft,
  Download,
  Printer,
  Loader2,
} from "lucide-react";
import axiosInstance from "../../../axios/axios";

const DebitNoteView = ({ returnData, vendor, onBack }) => {
  const debitNoteRef = useRef(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [fullVendor, setFullVendor] = useState(vendor);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Fetch company info
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const response = await axiosInstance.get("/company-profile");
        setCompanyInfo(response.data.data || response.data);
      } catch (error) {
        // Try alternate endpoint
        try {
          const response2 = await axiosInstance.get("/profile/me");
          if (response2.data.success) {
            setCompanyInfo(response2.data.data?.companyInfo || {});
          }
        } catch (e) {
          console.error("Error fetching company info:", e);
        }
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
    setIsGeneratingPDF(true);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(debitNoteRef.current, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: "#fff",
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = 210;
      const pdfHeight = 297;
      const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
      const width = canvas.width * ratio;
      const height = canvas.height * ratio;

      pdf.addImage(imgData, "JPEG", (pdfWidth - width) / 2, 10, width, height);

      const vendorName = fullVendor?.vendorName?.replace(/\s+/g, "_") || "Vendor";
      const filename = `DebitNote_${returnData?.debitNoteNo || returnData?.transactionNo || "DN"}_${vendorName}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const element = debitNoteRef.current;

    if (!printWindow || !element) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Debit Note - ${returnData?.debitNoteNo || returnData?.transactionNo}</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #fff; }
            @media print { 
              body { margin: 0; padding: 10mm; } 
              .no-print { display: none !important; }
            }
            table { border-collapse: collapse; width: 100%; }
            th, td { padding: 8px; text-align: left; }
            .print-content { max-width: 800px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="print-content">${element.innerHTML}</div>
          <script>
            setTimeout(function() {
              window.focus();
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatNumber = (num) => {
    return (num || 0).toLocaleString("en-AE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Calculate totals from return items
  const returnItems = useMemo(
    () => returnData?.items?.filter((item) => item.selectedForReturn && item.returnQty > 0) || [],
    [returnData?.items]
  );

  const totals = useMemo(() => {
    let subtotal = 0;
    let vat = 0;
    returnItems.forEach((item) => {
      const unitPrice = item.currentPurchasePrice || item.price || (item.rate / (item.originalQty || item.qty || 1));
      const lineTotal = item.returnQty * unitPrice;
      const vatAmount = (lineTotal * (item.vatPercent || 0)) / 100;
      subtotal += lineTotal;
      vat += vatAmount;
    });
    return {
      subtotal: +subtotal.toFixed(2),
      vat: +vat.toFixed(2),
      total: +(subtotal + vat).toFixed(2),
    };
  }, [returnItems]);

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-2 sm:px-4">
        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 active:scale-95 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to List
          </button>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 active:scale-95 min-h-[44px] text-sm"
            >
              {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isGeneratingPDF ? "Generating..." : "Download PDF"}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-95 min-h-[44px] text-sm"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>

        {/* Debit Note Document */}
        <div
          ref={debitNoteRef}
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
          {/* Color coded top bar - Orange for Debit Note */}
          <div style={{ height: 6, background: "linear-gradient(90deg, #c2410c, #f97316)", marginBottom: 12, borderRadius: 3 }} />

          <div style={{ textAlign: "right", fontWeight: "bold", marginBottom: 9 }}>
            <span>Debit Note</span>
          </div>

          {/* Header block */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div style={{ width: "18%", textAlign: "left" }}>
              {companyInfo?.companyLogo?.url ? (
                <img src={companyInfo.companyLogo.url} alt="logo" style={{ width: 110 }} />
              ) : companyInfo?.logo ? (
                <img src={companyInfo.logo} alt="logo" style={{ width: 110 }} />
              ) : (
                <div style={{ width: 100, height: 100 }} />
              )}
            </div>

            <div style={{ width: "52%", textAlign: "center", paddingLeft: 8, paddingRight: 8 }}>
              {companyInfo?.companyNameArabic && (
                <div style={{ fontWeight: "700", direction: "rtl", fontSize: 13 }}>{companyInfo.companyNameArabic}</div>
              )}
              <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4, whiteSpace: "nowrap" }}>
                {companyInfo?.companyName || "Company Name"}
              </div>
              <div style={{ marginTop: 6, fontSize: 11, lineHeight: 1.4 }}>
                <div>
                  {companyInfo?.addressLine1 || companyInfo?.address || ""}
                  {companyInfo?.phoneNumber && (
                    <>
                      <span style={{ display: "inline-block", margin: "0 8px" }}>|</span>
                      <span>Tel: {companyInfo.phoneNumber}</span>
                    </>
                  )}
                </div>
                <div>
                  {companyInfo?.emailAddress && <>Email: {companyInfo.emailAddress}</>}
                  {companyInfo?.website && (
                    <>
                      <span style={{ display: "inline-block", margin: "0 8px" }}>|</span>
                      Web: {companyInfo.website}
                    </>
                  )}
                </div>
              </div>
              {(companyInfo?.vatNumber || companyInfo?.trnNumber) && (
                <div style={{ marginTop: 6, fontSize: 11 }}>
                  <strong>VAT Reg. No:</strong> {companyInfo.vatNumber || companyInfo.trnNumber}
                </div>
              )}
              <div style={{ fontWeight: 700, textDecoration: "underline", marginTop: 6, fontSize: 13, color: "#c2410c" }}>
                DEBIT NOTE
              </div>
            </div>

            <div style={{ width: "28%", textAlign: "right", fontSize: 11 }} />
          </div>

          {/* Vendor + Meta */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ width: "58%", fontSize: 11 }}>
              <div style={{ fontWeight: 700 }}>VENDOR:</div>
              <div style={{ marginTop: 6 }}>{fullVendor?.vendorId || ""}</div>
              <div style={{ fontWeight: 700, marginTop: 6 }}>{fullVendor?.vendorName || returnData?.partyName || "Vendor"}</div>
              {fullVendor?.address && <div style={{ marginTop: 4 }}>{fullVendor.address}</div>}
              {fullVendor?.phone && <div style={{ marginTop: 4 }}>TEL: {fullVendor.phone}</div>}
              {fullVendor?.email && <div style={{ marginTop: 4 }}>Email: {fullVendor.email}</div>}
              {fullVendor?.trnNumber && <div style={{ marginTop: 4 }}>VAT Reg. No: {fullVendor.trnNumber}</div>}
            </div>

            <div style={{ width: "38%", textAlign: "right", fontSize: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ textAlign: "left", minWidth: 120 }}>
                  <div style={{ fontWeight: 700 }}>Debit Note No:</div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>Return No:</div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>Date:</div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>Orig. Invoice:</div>
                  {returnData?.originalInvoiceDate && <div style={{ fontWeight: 700, marginTop: 6 }}>Invoice Date:</div>}
                </div>
                <div style={{ textAlign: "right", minWidth: 140 }}>
                  <div style={{ fontWeight: 700, color: "#c2410c" }}>{returnData?.debitNoteNo || "DN-XXXX"}</div>
                  <div style={{ marginTop: 6 }}>{returnData?.transactionNo}</div>
                  <div style={{ marginTop: 6 }}>{formatDate(returnData?.date)}</div>
                  <div style={{ marginTop: 6 }}>{returnData?.originalInvoiceNo}</div>
                  {returnData?.originalInvoiceDate && (
                    <div style={{ marginTop: 6 }}>{formatDate(returnData.originalInvoiceDate)}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: "#000", marginBottom: 8 }} />

          {/* Items Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, marginBottom: 10 }}>
            <thead>
              <tr style={{ background: "#ffedd5" }}>
                <th style={{ width: 30, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>Line</th>
                <th style={{ width: 64, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>CODE</th>
                <th style={{ textAlign: "left", padding: "8px 10px 8px 22px", borderBottom: "1px solid #777" }}>Item Description</th>
                <th style={{ width: 60, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>Return Qty</th>
                <th style={{ width: 72, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>Unit Price</th>
                <th style={{ width: 84, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>Value</th>
                <th style={{ width: 54, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>VAT %</th>
                <th style={{ width: 84, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>VAT Amount</th>
                <th style={{ width: 120, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>TOTAL AED</th>
              </tr>
            </thead>
            <tbody>
              {returnItems.map((item, idx) => {
                const unitPrice = item.currentPurchasePrice || item.price || (item.rate / (item.originalQty || item.qty || 1));
                const lineTotal = item.returnQty * unitPrice;
                const vatAmount = (lineTotal * (item.vatPercent || 0)) / 100;
                const total = lineTotal + vatAmount;
                return (
                  <tr key={idx}>
                    <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "top" }}>{idx + 1}</td>
                    <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "top" }}>{item.itemCode || "-"}</td>
                    <td style={{ padding: "8px 10px 8px 22px", verticalAlign: "top" }}>{item.description}</td>
                    <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "top" }}>{item.returnQty}</td>
                    <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "top" }}>{formatNumber(unitPrice)}</td>
                    <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "top" }}>{formatNumber(lineTotal)}</td>
                    <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "top" }}>{item.vatPercent || 0}</td>
                    <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "top" }}>{formatNumber(vatAmount)}</td>
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
                  <div style={{ minWidth: 100, textAlign: "right" }}>{formatNumber(returnData?.subtotalAmount || totals.subtotal)}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div>VAT</div>
                  <div style={{ minWidth: 100, textAlign: "right" }}>{formatNumber(returnData?.vatAmount || totals.vat)}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, paddingTop: 6, borderTop: "1px solid #000", fontWeight: 800 }}>
                  <div>TOTAL DEBIT</div>
                  <div style={{ minWidth: 100, textAlign: "right" }}>{formatNumber(returnData?.totalAmount || totals.total)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {returnData?.notes && (
            <div style={{ marginTop: 12, fontSize: 10 }}>
              <div style={{ fontWeight: 700 }}>Notes:</div>
              <div style={{ marginTop: 4 }}>{returnData.notes}</div>
            </div>
          )}

          {/* Signatures */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, alignItems: "flex-start" }}>
            <div style={{ width: "45%", textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #000", paddingTop: 6, marginTop: 40 }}>
                <div style={{ fontWeight: 600, fontSize: 10 }}>Authorized Signature</div>
              </div>
            </div>
            <div style={{ width: "45%", textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #000", paddingTop: 6, marginTop: 40 }}>
                <div style={{ fontWeight: 600, fontSize: 10 }}>Received By</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 18, fontSize: 10 }}>
            <div>This is a computer-generated document. No signature required.</div>
            <div style={{ marginTop: 6 }}>For {companyInfo?.companyName || "Company"}</div>
          </div>

          <div style={{ textAlign: "center", marginTop: 18, fontSize: 10 }}>Page 1 of 1</div>
        </div>
      </div>
    </div>
  );
};

export default DebitNoteView;
