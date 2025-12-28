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
            padding: "15mm",
            background: "#fff",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: "11px",
            color: "#000",
            boxSizing: "border-box",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
              color: "#fff",
              padding: "20px",
              borderRadius: "8px",
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "bold" }}>
                {profileData.companyName}
              </h1>
              {profileData.companyNameArabic && (
                <p style={{ margin: "4px 0", fontSize: "14px", direction: "rtl" }}>
                  {profileData.companyNameArabic}
                </p>
              )}
            </div>
            <div style={{ textAlign: "right", fontSize: "11px" }}>
              <p style={{ margin: "2px 0" }}>📍 {profileData.addressLine1}</p>
              <p style={{ margin: "2px 0" }}>📞 {profileData.phoneNumber}</p>
              <p style={{ margin: "2px 0" }}>✉️ {profileData.email}</p>
            </div>
          </div>

          {/* Document Title */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "25px",
              paddingBottom: "10px",
              borderBottom: "2px solid #3b82f6",
            }}
          >
            <h2
              style={{
                color: "#1e40af",
                fontSize: "24px",
                margin: 0,
                fontWeight: "bold",
                letterSpacing: "2px",
              }}
            >
              CREDIT NOTE
            </h2>
            <p style={{ color: "#666", margin: "5px 0 0 0", fontSize: "12px" }}>
              Official Document
            </p>
          </div>

          {/* Document Info */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "20px",
              padding: "15px",
              background: "#f8fafc",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div>
              <p style={{ margin: "4px 0" }}>
                <strong>Credit Note No:</strong>{" "}
                <span style={{ color: "#1e40af", fontWeight: "bold" }}>
                  {ret.creditNoteNo}
                </span>
              </p>
              <p style={{ margin: "4px 0" }}>
                <strong>Return No:</strong> {ret.transactionNo}
              </p>
            </div>
            <div>
              <p style={{ margin: "4px 0" }}>
                <strong>Date:</strong> {formatDate(ret.date)}
              </p>
              <p style={{ margin: "4px 0" }}>
                <strong>Status:</strong>{" "}
                <span
                  style={{
                    background: "#22c55e",
                    color: "#fff",
                    padding: "2px 10px",
                    borderRadius: "12px",
                    fontSize: "10px",
                  }}
                >
                  ✓ Confirmed
                </span>
              </p>
            </div>
            <div>
              <p style={{ margin: "4px 0" }}>
                <strong>Original Invoice:</strong> {ret.originalInvoiceNo}
              </p>
              {ret.reference && (
                <p style={{ margin: "4px 0" }}>
                  <strong>Reference:</strong> {ret.reference}
                </p>
              )}
            </div>
          </div>

          {/* Customer Details */}
          <div
            style={{
              marginBottom: "20px",
              padding: "15px",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  background: "#e0f2fe",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: "10px",
                }}
              >
                👤
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: "bold", fontSize: "14px" }}>
                  {customer?.customerName || ret.partyId?.customerName || "Customer"}
                </p>
                <p style={{ margin: 0, color: "#666", fontSize: "10px" }}>Customer</p>
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "#666" }}>
              {customer?.address && <p style={{ margin: "2px 0" }}>{customer.address}</p>}
              {customer?.email && <p style={{ margin: "2px 0" }}>Email: {customer.email}</p>}
              {customer?.trnNumber && (
                <p style={{ margin: "2px 0" }}>TRN: {customer.trnNumber}</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div style={{ marginBottom: "20px" }}>
            <h3
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                marginBottom: "10px",
                color: "#1e40af",
              }}
            >
              RETURNED ITEMS
            </h3>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "10px",
              }}
            >
              <thead>
                <tr style={{ background: "#1e40af", color: "#fff" }}>
                  <th style={{ padding: "10px", textAlign: "center", width: "40px" }}>
                    S.NO
                  </th>
                  <th style={{ padding: "10px", textAlign: "left" }}>ITEM DESCRIPTION</th>
                  <th style={{ padding: "10px", textAlign: "center", width: "60px" }}>
                    QTY
                  </th>
                  <th style={{ padding: "10px", textAlign: "right", width: "80px" }}>
                    UNIT PRICE
                  </th>
                  <th style={{ padding: "10px", textAlign: "right", width: "80px" }}>
                    EX VAT
                  </th>
                  <th style={{ padding: "10px", textAlign: "center", width: "50px" }}>
                    VAT %
                  </th>
                  <th style={{ padding: "10px", textAlign: "right", width: "80px" }}>
                    VAT AMT
                  </th>
                  <th style={{ padding: "10px", textAlign: "right", width: "100px" }}>
                    TOTAL (AED)
                  </th>
                </tr>
              </thead>
              <tbody>
                {ret.items?.map((item, index) => {
                  const unitPrice = item.price || (item.rate / (item.qty || 1)) || 0;
                  const exVat = item.lineTotal || item.rate || 0;
                  const vatAmt = item.vatAmount || 0;
                  const total = exVat + vatAmt;

                  return (
                    <tr
                      key={index}
                      style={{
                        background: index % 2 === 0 ? "#f8fafc" : "#fff",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      <td style={{ padding: "10px", textAlign: "center" }}>{index + 1}</td>
                      <td style={{ padding: "10px" }}>
                        <strong>{item.description}</strong>
                        {item.itemCode && (
                          <span style={{ color: "#666", fontSize: "9px", display: "block" }}>
                            Code: {item.itemCode}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px", textAlign: "center" }}>{item.qty || item.returnQty}</td>
                      <td style={{ padding: "10px", textAlign: "right" }}>{formatNumber(unitPrice)}</td>
                      <td style={{ padding: "10px", textAlign: "right" }}>{formatNumber(exVat)}</td>
                      <td style={{ padding: "10px", textAlign: "center" }}>{item.vatPercent || 0}%</td>
                      <td style={{ padding: "10px", textAlign: "right" }}>{formatNumber(vatAmt)}</td>
                      <td
                        style={{
                          padding: "10px",
                          textAlign: "right",
                          fontWeight: "bold",
                          color: "#1e40af",
                        }}
                      >
                        AED {formatNumber(total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                width: "280px",
                background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                border: "1px solid #bae6fd",
                borderRadius: "8px",
                padding: "15px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "5px 0",
                  borderBottom: "1px dashed #93c5fd",
                }}
              >
                <span>Subtotal:</span>
                <span>AED {formatNumber(subtotal)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "5px 0",
                  borderBottom: "1px dashed #93c5fd",
                }}
              >
                <span>VAT:</span>
                <span>AED {formatNumber(vatTotal)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0 5px 0",
                  fontWeight: "bold",
                  fontSize: "16px",
                  color: "#1e40af",
                }}
              >
                <span>Total Credit:</span>
                <span>AED {formatNumber(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {ret.notes && (
            <div
              style={{
                marginBottom: "20px",
                padding: "10px 15px",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "8px",
              }}
            >
              <strong>Notes:</strong> {ret.notes}
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: "30px",
              paddingTop: "15px",
              borderTop: "1px solid #e2e8f0",
              textAlign: "center",
              fontSize: "10px",
              color: "#666",
            }}
          >
            <p style={{ margin: "4px 0" }}>
              This is a computer-generated document. No signature required.
            </p>
            <p style={{ margin: "4px 0" }}>
              For queries, please contact: {profileData.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditNoteView;
