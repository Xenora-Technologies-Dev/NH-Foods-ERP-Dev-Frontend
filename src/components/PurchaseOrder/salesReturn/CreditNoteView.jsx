import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Download, Printer, Loader2 } from "lucide-react";
import axiosInstance from "../../../axios/axios";

const CreditNoteView = ({ returnData, customer, onBack }) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [profileData, setProfileData] = useState({
    companyName: "NH FOODSTUFF TRADING LLC",
    companyNameArabic: "",
    addressLine1: "Dubai, United Arab Emirates",
    phoneNumber: "+971 XX XXX XXXX",
    email: "info@nhfoodstuff.com",
    website: "",
    vatNumber: "",
    logo: null,
  });

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const response = await axiosInstance.get("/profile/me");
        if (response.data.success) {
          const data = response.data.data;
          setProfileData((prev) => ({
            ...prev,
            companyName: data.companyInfo?.companyName || prev.companyName,
            companyNameArabic: data.companyInfo?.companyNameArabic || prev.companyNameArabic,
            addressLine1: data.companyInfo?.addressLine1 || prev.addressLine1,
            phoneNumber: data.companyInfo?.phoneNumber || prev.phoneNumber,
            email: data.companyInfo?.emailAddress || prev.email,
            website: data.companyInfo?.website || prev.website,
            vatNumber: data.companyInfo?.vatNumber || prev.vatNumber,
            logo: data.companyInfo?.companyLogo?.url || prev.logo,
          }));
        }
      } catch (error) {
        console.error("Failed to load profile data:", error);
      }
    };
    loadProfileData();
  }, []);

  const ret = returnData;
  if (!ret) return null;

  // Calculate totals
  const subtotal = useMemo(
    () => ret.items?.reduce((sum, item) => sum + (item.lineTotal || item.rate || 0), 0) || 0,
    [ret.items]
  );
  const vatTotal = useMemo(
    () => ret.items?.reduce((sum, item) => sum + (item.vatAmount || 0), 0) || 0,
    [ret.items]
  );
  const grandTotal = subtotal + vatTotal;

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

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const element = document.getElementById("credit-note-content");
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
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

      const customerName = customer?.customerName?.replace(/\s+/g, "_") || "Customer";
      const filename = `CreditNote_${ret.creditNoteNo}_${customerName}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const element = document.getElementById("credit-note-content");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Credit Note - ${ret.creditNoteNo}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            @media print { body { margin: 0; padding: 10mm; } }
            table { border-collapse: collapse; width: 100%; }
            th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
            .header { text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>${element.innerHTML}</body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Action buttons */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex space-x-3">
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isGeneratingPDF ? "Generating..." : "Download PDF"}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Credit Note Document */}
        <div
          id="credit-note-content"
          style={{
            width: "210mm",
            minHeight: "297mm",
            margin: "0 auto",
            padding: "10mm",
            background: "#fff",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 11,
            color: "#000",
            boxSizing: "border-box",
          }}
        >
          {/* Color coded top bar - Rose for Credit Note */}
          <div style={{ height: 6, background: "linear-gradient(90deg, #be123c, #f43f5e)", marginBottom: 12, borderRadius: 3 }} />

          <div style={{ textAlign: "right", fontWeight: "bold", marginBottom: 9 }}>
            <span>Credit Note</span>
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
              {profileData.companyNameArabic && (
                <div style={{ fontWeight: "700", direction: "rtl", fontSize: 13 }}>{profileData.companyNameArabic}</div>
              )}
              <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4, whiteSpace: "nowrap" }}>
                {profileData.companyName}
              </div>
              <div style={{ marginTop: 6, fontSize: 11, lineHeight: 1.4 }}>
                <div>
                  {profileData.addressLine1}
                  <span style={{ display: "inline-block", margin: "0 8px" }}>|</span>
                  <span>Tel: {profileData.phoneNumber}</span>
                </div>
                <div>
                  Email: {profileData.email}
                  {profileData.website && (
                    <>
                      <span style={{ display: "inline-block", margin: "0 8px" }}>|</span>
                      Web: {profileData.website}
                    </>
                  )}
                </div>
              </div>
              {profileData.vatNumber && (
                <div style={{ marginTop: 6, fontSize: 11 }}>
                  <strong>VAT Reg. No:</strong> {profileData.vatNumber}
                </div>
              )}
              <div style={{ fontWeight: 700, textDecoration: "underline", marginTop: 6, fontSize: 13, color: "#be123c" }}>
                CREDIT NOTE
              </div>
            </div>

            <div style={{ width: "28%", textAlign: "right", fontSize: 11 }} />
          </div>

          {/* Customer + Meta */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ width: "58%", fontSize: 11 }}>
              <div style={{ fontWeight: 700 }}>BILL TO:</div>
              <div style={{ fontWeight: 700, marginTop: 6 }}>
                {customer?.customerName || ret.partyId?.customerName || "Customer"}
              </div>
              {customer?.address && <div style={{ marginTop: 4 }}>{customer.address}</div>}
              {customer?.email && <div style={{ marginTop: 4 }}>Email: {customer.email}</div>}
              {customer?.trnNumber && <div style={{ marginTop: 4 }}>VAT Reg. No: {customer.trnNumber}</div>}
            </div>

            <div style={{ width: "38%", textAlign: "right", fontSize: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ textAlign: "left", minWidth: 120 }}>
                  <div style={{ fontWeight: 700 }}>Credit Note No:</div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>Return No:</div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>Date:</div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>Orig. Invoice:</div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>Invoice Date:</div>
                </div>
                <div style={{ textAlign: "right", minWidth: 140 }}>
                  <div style={{ fontWeight: 700, color: "#be123c" }}>{ret.creditNoteNo}</div>
                  <div style={{ marginTop: 6 }}>{ret.transactionNo}</div>
                  <div style={{ marginTop: 6 }}>{formatDate(ret.date)}</div>
                  <div style={{ marginTop: 6 }}>{ret.originalInvoiceNo}</div>
                  <div style={{ marginTop: 6 }}>{formatDate(ret.originalInvoiceDate || ret.invoiceDate)}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: "#000", marginBottom: 8 }} />

          {/* Items Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, marginBottom: 10 }}>
            <thead>
              <tr style={{ background: "#ffe4e6" }}>
                <th style={{ width: 30, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>Line</th>
                <th style={{ width: 64, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>CODE</th>
                <th style={{ textAlign: "left", padding: "8px 10px 8px 22px", borderBottom: "1px solid #777" }}>Item Description</th>
                <th style={{ width: 60, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>Qty</th>
                <th style={{ width: 72, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>Unit Price</th>
                <th style={{ width: 84, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>Value</th>
                <th style={{ width: 54, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>VAT %</th>
                <th style={{ width: 84, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>VAT Amount</th>
                <th style={{ width: 120, padding: "8px 6px", borderBottom: "1px solid #777", textAlign: "center" }}>TOTAL AED</th>
              </tr>
            </thead>
            <tbody>
              {ret.items?.map((item, idx) => {
                const unitPrice = item.price || (item.rate / (item.qty || 1)) || 0;
                const exVat = item.lineTotal || item.rate || 0;
                const vatAmt = item.vatAmount || 0;
                const total = exVat + vatAmt;
                return (
                  <tr key={idx}>
                    <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "top" }}>{idx + 1}</td>
                    <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "top" }}>{item.itemCode || "-"}</td>
                    <td style={{ padding: "8px 10px 8px 22px", verticalAlign: "top" }}>{item.description}</td>
                    <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "top" }}>{item.qty || item.returnQty}</td>
                    <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "top" }}>{formatNumber(unitPrice)}</td>
                    <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "top" }}>{formatNumber(exVat)}</td>
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
                  <div>TOTAL CREDIT</div>
                  <div style={{ minWidth: 100, textAlign: "right" }}>{formatNumber(grandTotal)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {ret.notes && (
            <div style={{ marginTop: 12, fontSize: 10 }}>
              <div style={{ fontWeight: 700 }}>Notes:</div>
              <div style={{ marginTop: 4 }}>{ret.notes}</div>
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
            <div style={{ marginTop: 6 }}>For {profileData.companyName}</div>
          </div>

          <div style={{ textAlign: "center", marginTop: 18, fontSize: 10 }}>Page 1 of 1</div>
        </div>
      </div>
    </div>
  );
};

export default CreditNoteView;
