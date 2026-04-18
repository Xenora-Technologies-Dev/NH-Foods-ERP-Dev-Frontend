import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  X,
  Printer,
  Download,
  Loader2,
} from "lucide-react";
import axiosInstance from "../../../axios/axios";

const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return `AED ${num.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* ─── SVG icon paths (inline to survive print/PDF) ─── */
const SvgMapPin = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const SvgPhone = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);
const SvgMail = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }}>
    <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const SvgUser = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const SvgBanknote = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
  </svg>
);
const SvgCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
  </svg>
);

const VoucherDocument = ({ voucher, type = "receipt", onClose }) => {
  const printRef = useRef(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const [profileData, setProfileData] = useState({
    companyName: "",
    companyNameArabic: "",
    addressLine1: "",
    addressLine2: "",
    phoneNumber: "",
    email: "",
    website: "",
    vatNumber: "",
    logo: null,
    bankName: "",
    accountNumber: "",
    accountName: "",
    ibanNumber: "",
    currency: "AED",
  });

  useEffect(() => {
    const loadProfile = async () => {
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
            bankName: d.companyInfo?.bankDetails?.bankName || p.bankName,
            accountNumber: d.companyInfo?.bankDetails?.accountNumber || p.accountNumber,
            accountName: d.companyInfo?.bankDetails?.accountName || p.accountName,
            ibanNumber: d.companyInfo?.bankDetails?.ibanNumber || p.ibanNumber,
            currency: d.companyInfo?.bankDetails?.currency || p.currency,
          }));
        }
      } catch (e) {
        console.error("Failed to load company profile:", e);
      }
    };
    loadProfile();
  }, []);

  const handlePrint = useCallback(() => {
    const el = printRef.current;
    if (!el) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${type === "receipt" ? "Receipt" : "Payment"} Voucher - ${voucher.voucherNo || ""}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif}@media print{body{margin:0;padding:0}}</style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  }, [voucher, type]);

  const handleDownloadPDF = useCallback(async () => {
    try {
      setIsGeneratingPDF(true);
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const input = printRef.current;
      if (!input) return;
      const canvas = await html2canvas(input, {
        scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff", logging: false,
        width: input.scrollWidth, height: input.scrollHeight,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const pW = pdf.internal.pageSize.getWidth();
      const pH = pdf.internal.pageSize.getHeight();
      const r = Math.min(pW / (canvas.width * 0.264583), pH / (canvas.height * 0.264583));
      const iW = canvas.width * 0.264583 * r;
      const iH = canvas.height * 0.264583 * r;
      pdf.addImage(imgData, "JPEG", (pW - iW) / 2, 0, iW, iH, undefined, "FAST");
      pdf.save(`${type === "receipt" ? "Receipt" : "Payment"}_${voucher.voucherNo}_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (e) {
      console.error("PDF error:", e);
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [voucher, type]);

  const partyName = type === "receipt"
    ? (voucher.customerName || voucher.partyId?.customerName || voucher.partyName || "N/A")
    : (voucher.vendorName || voucher.partyId?.vendorName || voucher.partyName || "N/A");

  const accountName = voucher.toAccountId?.accountName || voucher.fromAccountId?.accountName || voucher.accountType || "N/A";

  // Receipt = blue, Payment = purple
  const isReceipt = type === "receipt";
  const gradientFrom = isReceipt ? "#1e40af" : "#6d28d9";
  const gradientTo = isReceipt ? "#3b82f6" : "#8b5cf6";
  const accentBg = isReceipt ? "#eff6ff" : "#f5f3ff";
  const titleColor = isReceipt ? "#1e40af" : "#6d28d9";
  const partyBg = isReceipt ? "#f0fdf9" : "#faf5ff";
  const partyBorder = isReceipt ? "#d1fae5" : "#e9d5ff";
  const totalGradientFrom = isReceipt ? "#1e40af" : "#6d28d9";
  const totalGradientTo = isReceipt ? "#3b82f6" : "#8b5cf6";

  const voucherTitle = isReceipt ? "RECEIPT VOUCHER" : "PAYMENT VOUCHER";
  const totalAmount = Number(voucher.totalAmount ?? voucher.amount ?? 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* ── Modal toolbar ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #e5e7eb", background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {isReceipt ? "Receipt" : "Payment"} Voucher
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isGeneratingPDF ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {isGeneratingPDF ? "Generating..." : "Download PDF"}
            </button>
            <button onClick={handlePrint} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center gap-2 transition-all">
              <Printer size={16} /> Print
            </button>
            <button onClick={onClose} className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Document body (all inline styles) ── */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
          <div
            ref={printRef}
            id="receipt-content"
            style={{
              maxWidth: 800,
              margin: "0 auto",
              fontFamily: "'Segoe UI', Arial, sans-serif",
              color: "#333",
              backgroundColor: "#fff",
              border: `2px solid ${gradientFrom}`,
              boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            }}
          >
            {/* ── Company Header ── */}
            <div style={{ background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`, color: "white", padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  {profileData.logo && (
                    <img src={profileData.logo} alt="Logo" style={{ width: 64, height: 64, objectFit: "contain", backgroundColor: "white", borderRadius: 8, padding: 4 }} />
                  )}
                  <div>
                    {profileData.companyNameArabic && (
                      <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 4, direction: "rtl" }}>{profileData.companyNameArabic}</p>
                    )}
                    <h1 style={{ fontSize: 22, fontWeight: "bold", letterSpacing: "0.5px", margin: 0 }}>
                      {profileData.companyName || "Company Name"}
                    </h1>
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 12, lineHeight: 1.8, opacity: 0.9 }}>
                  {profileData.addressLine1 && <p style={{ margin: 0 }}><SvgMapPin />{profileData.addressLine1}</p>}
                  {profileData.addressLine2 && <p style={{ margin: 0 }}><span style={{ display: "inline-block", width: 16 }}></span>{profileData.addressLine2}</p>}
                  {profileData.phoneNumber && <p style={{ margin: 0 }}><SvgPhone />{profileData.phoneNumber}</p>}
                  {profileData.email && <p style={{ margin: 0 }}><SvgMail />{profileData.email}</p>}
                  {profileData.vatNumber && <p style={{ margin: "4px 0 0 0", fontSize: 11, opacity: 0.8 }}>VAT Reg. No: {profileData.vatNumber}</p>}
                </div>
              </div>
            </div>

            {/* ── Voucher Title ── */}
            <div style={{ textAlign: "center", padding: "16px 20px", background: "#f8fafc", borderBottom: `2px solid ${gradientFrom}` }}>
              <h2 style={{ fontSize: 20, fontWeight: "bold", color: titleColor, textTransform: "uppercase", letterSpacing: 2, margin: 0 }}>
                {voucherTitle}
              </h2>
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Official Document</p>
            </div>

            {/* ── Voucher Info Bar ── */}
            <div style={{ display: "flex", justifyContent: "space-around", padding: "14px 20px", background: accentBg, borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, margin: "0 0 4px 0" }}>Voucher No.</p>
                <p style={{ fontSize: 16, fontWeight: "bold", color: titleColor, margin: 0 }}>{voucher.voucherNo || "N/A"}</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, margin: "0 0 4px 0" }}>Date</p>
                <p style={{ fontSize: 16, fontWeight: "bold", color: "#1e293b", margin: 0 }}>{formatDate(voucher.date)}</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, margin: "0 0 4px 0" }}>Status</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#16a34a", margin: 0 }}><SvgCheck />Confirmed</p>
              </div>
              {voucher.reference && (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, margin: "0 0 4px 0" }}>Reference</p>
                  <p style={{ fontSize: 14, fontWeight: "bold", color: "#1e293b", margin: 0 }}>{voucher.reference}</p>
                </div>
              )}
            </div>

            {/* ── Party Information ── */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, margin: "0 0 10px 0", letterSpacing: 1 }}>
                    {isReceipt ? "RECEIVED FROM" : "PAID TO"}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, background: partyBg, border: `1px solid ${partyBorder}`, borderRadius: 10, padding: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: isReceipt ? "#dbeafe" : "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <SvgUser />
                    </div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", margin: 0 }}>{partyName}</p>
                      <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0 0" }}>{isReceipt ? "Customer" : "Vendor"}</p>
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, margin: "0 0 10px 0", letterSpacing: 1 }}>
                    {isReceipt ? "DEPOSITED TO" : "PAID FROM"}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, background: partyBg, border: `1px solid ${partyBorder}`, borderRadius: 10, padding: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <SvgBanknote />
                    </div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", margin: 0 }}>{accountName}</p>
                      <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0 0", textTransform: "capitalize" }}>{voucher.accountType || "Account"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Total Amount ── */}
            <div style={{ padding: "20px 24px", background: `linear-gradient(135deg, ${accentBg}, ${isReceipt ? "#dbeafe" : "#ede9fe"})`, borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>
                    Total Amount {isReceipt ? "Received" : "Paid"}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 30, fontWeight: "bold", color: titleColor, margin: 0 }}>
                    AED {totalAmount.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0 0" }}>AED</p>
                </div>
              </div>
            </div>

            {/* ── Narration ── */}
            {voucher.narration && (
              <div style={{ padding: "16px 24px", borderBottom: "1px solid #e2e8f0" }}>
                <p style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, margin: "0 0 8px 0" }}>Narration / Remarks</p>
                <p style={{ fontSize: 13, color: "#475569", background: "#f8fafc", padding: "10px 14px", borderRadius: 8, fontStyle: "italic", margin: 0 }}>
                  {voucher.narration}
                </p>
              </div>
            )}

            {/* ── Separator ── */}
            <div style={{ borderBottom: `3px solid ${gradientFrom}`, margin: "0 24px" }} />

            {/* ── Signatures ── */}
            <div style={{ padding: "24px 24px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40, gap: 30 }}>
                <div style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ height: 50, borderBottom: "2px solid #cbd5e1", marginBottom: 8 }} />
                  <p style={{ fontSize: 12, fontWeight: 500, color: "#475569", margin: 0 }}>Prepared By</p>
                </div>
                <div style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ height: 50, borderBottom: "2px solid #cbd5e1", marginBottom: 8 }} />
                  <p style={{ fontSize: 12, fontWeight: 500, color: "#475569", margin: 0 }}>Checked By</p>
                </div>
                <div style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ height: 50, borderBottom: "2px solid #cbd5e1", marginBottom: 8 }} />
                  <p style={{ fontSize: 12, fontWeight: 500, color: "#475569", margin: 0 }}>{isReceipt ? "Received By" : "Paid By"}</p>
                </div>
              </div>

              {/* Stamp Area */}
              <div style={{ textAlign: "center", marginTop: 24 }}>
                <div style={{ display: "inline-block", border: "2px dashed #cbd5e1", padding: "20px 48px", borderRadius: 8 }}>
                  <p style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", margin: 0 }}>Company Stamp</p>
                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div style={{ background: "#f8fafc", padding: "12px 24px", textAlign: "center", borderTop: "2px solid #e2e8f0" }}>
              <p style={{ fontSize: 10, color: "#94a3b8", margin: 0 }}>
                This is a computer-generated document. No signature is required for amounts below AED 10,000.
              </p>
              <p style={{ fontSize: 10, color: "#cbd5e1", marginTop: 4 }}>
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
