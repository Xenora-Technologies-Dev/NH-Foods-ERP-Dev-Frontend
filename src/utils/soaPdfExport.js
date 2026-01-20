import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Statement of Account PDF Export Utility
 * Generates PDF with company header, customer details, and transaction table
 * Layout matches UAE standard SOA format
 */

// Default company details (fallback)
const DEFAULT_COMPANY = {
  companyName: 'NAJM ALHUDA FOODSTUFF TRADING LLC S.O.C.C.',
  companyNameArabic: 'نجم الهدى لتجارة المواد الغذائية ذ.م.م ش.ش.و',
  addressLine1: 'DIP 2, Dubai, U.A.E.',
  addressLine2: 'P.O. Box: 3352 - DUBAI - U.A.E.',
  phoneNumber: '04 885 7575',
  email: 'corporate@elfab.ae',
  website: 'www.nhfoodsglobal.com',
  vatNumber: '105033168300003',
};

/**
 * Format date for display
 */
const formatDate = (dateString) => {
  if (!dateString || dateString === 'Beginning') return dateString || 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format number with 2 decimal places
 */
const formatNumber = (num) => {
  const value = parseFloat(num) || 0;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Fetch company profile data
 */
const fetchCompanyProfile = async (axiosInstance) => {
  try {
    const { data } = await axiosInstance.get('/profile/me');
    if (data.success && data.data) {
      const d = data.data;
      return {
        companyName: d.companyInfo?.companyName || DEFAULT_COMPANY.companyName,
        companyNameArabic: d.companyInfo?.companyNameArabic || DEFAULT_COMPANY.companyNameArabic,
        addressLine1: d.companyInfo?.addressLine1 || DEFAULT_COMPANY.addressLine1,
        addressLine2: d.companyInfo?.addressLine2 || DEFAULT_COMPANY.addressLine2,
        phoneNumber: d.companyInfo?.phoneNumber || DEFAULT_COMPANY.phoneNumber,
        email: d.companyInfo?.emailAddress || DEFAULT_COMPANY.email,
        website: d.companyInfo?.website || DEFAULT_COMPANY.website,
        vatNumber: d.companyInfo?.vatNumber || DEFAULT_COMPANY.vatNumber,
        logo: d.companyInfo?.companyLogo?.url || null,
      };
    }
  } catch (e) {
    console.error('Failed to fetch company profile:', e);
  }
  return DEFAULT_COMPANY;
};

/**
 * Export Statement of Account to PDF
 * @param {Object} statement - Statement data from backend
 * @param {Object} axiosInstance - Axios instance for fetching company profile
 * @returns {Promise<string>} - Filename of generated PDF
 */
export const exportStatementOfAccountPDF = async (statement, axiosInstance) => {
  // Fetch company profile
  const companyProfile = await fetchCompanyProfile(axiosInstance);
  
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  const customer = statement.customer || {};
  const period = statement.period || {};
  const transactions = statement.transactions || [];

  // ===== HEADER SECTION =====
  
  // Arabic company name (right-aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  
  // Company name in English (centered)
  yPosition = 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(companyProfile.companyName, pageWidth / 2, yPosition, { align: 'center' });

  // Contact details
  yPosition += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(companyProfile.addressLine1, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 4;
  doc.text(`Tel: ${companyProfile.phoneNumber} | Email: ${companyProfile.email}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 4;
  doc.text(`Web: ${companyProfile.website}`, pageWidth / 2, yPosition, { align: 'center' });

  // VAT Registration Number
  yPosition += 5;
  doc.setFontSize(9);
  doc.text(`VAT Reg. No: ${companyProfile.vatNumber}`, pageWidth / 2, yPosition, { align: 'center' });

  // ===== STATEMENT OF ACCOUNT TITLE =====
  yPosition += 8;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPosition - 4, pageWidth - (margin * 2), 8, 'F');
  doc.text('STATEMENT OF ACCOUNT', pageWidth / 2, yPosition, { align: 'center' });

  // ===== CUSTOMER & PERIOD SECTION =====
  yPosition += 12;
  
  // Left side - Customer Details
  const leftColX = margin;
  const rightColX = pageWidth / 2 + 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER DETAILS', leftColX, yPosition);
  doc.text('STATEMENT PERIOD', rightColX, yPosition);

  yPosition += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  // Customer details (left)
  doc.text(`Customer ID: ${customer.customerId || 'N/A'}`, leftColX, yPosition);
  doc.text(`From: ${formatDate(period.from)}`, rightColX, yPosition);
  
  yPosition += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(customer.customerName || 'N/A', leftColX, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(`To: ${formatDate(period.to)}`, rightColX, yPosition);
  
  yPosition += 5;
  if (customer.billingAddress) {
    const addressLines = customer.billingAddress.split('\n');
    addressLines.forEach((line, idx) => {
      if (idx < 2) { // Limit to 2 lines
        doc.text(line.trim(), leftColX, yPosition);
        yPosition += 4;
      }
    });
  }
  
  doc.text(`TRN: ${customer.trnNumber || 'N/A'}`, leftColX, yPosition);
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`, rightColX, yPosition);
  
  yPosition += 5;
  if (customer.phone) {
    doc.text(`Phone: ${customer.phone}`, leftColX, yPosition);
  }
  if (customer.email) {
    yPosition += 4;
    doc.text(`Email: ${customer.email}`, leftColX, yPosition);
  }

  // ===== OPENING BALANCE =====
  yPosition += 10;
  doc.setFillColor(230, 240, 255);
  doc.rect(margin, yPosition - 4, pageWidth - (margin * 2), 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('OPENING BALANCE:', margin + 2, yPosition);
  doc.text(`AED ${formatNumber(statement.openingBalance)}`, pageWidth - margin - 2, yPosition, { align: 'right' });

  // ===== TRANSACTIONS TABLE =====
  yPosition += 10;

  // Table headers: Date, Invoice #, LPO No, Debit, Credit, Balance
  const tableHeaders = [
    { header: 'Date', dataKey: 'date' },
    { header: 'Type', dataKey: 'type' },
    { header: 'Invoice #', dataKey: 'reference' },
    { header: 'LPO No', dataKey: 'lpoNo' },
    { header: 'Debit (AED)', dataKey: 'debit' },
    { header: 'Credit (AED)', dataKey: 'credit' },
    { header: 'Balance (AED)', dataKey: 'balance' },
  ];

  // Prepare table data
  const tableData = transactions.map((t) => ({
    date: formatDate(t.date),
    type: t.type || '',
    reference: t.reference || '',
    lpoNo: t.lpoNo || '-',
    debit: t.debit > 0 ? formatNumber(t.debit) : '-',
    credit: t.credit > 0 ? formatNumber(t.credit) : '-',
    balance: formatNumber(t.balance),
  }));

  // Generate table using autoTable
  autoTable(doc, {
    columns: tableHeaders,
    body: tableData,
    startY: yPosition,
    theme: 'grid',
    headStyles: {
      fillColor: [70, 70, 70],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      valign: 'middle',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2,
      valign: 'middle',
    },
    columnStyles: {
      date: { cellWidth: 22, halign: 'center' },
      type: { cellWidth: 26, halign: 'left' },
      reference: { cellWidth: 28, halign: 'center' },
      lpoNo: { cellWidth: 28, halign: 'center' },
      debit: { cellWidth: 26, halign: 'right' },
      credit: { cellWidth: 26, halign: 'right' },
      balance: { cellWidth: 26, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    margin: { left: margin, right: margin },
    tableWidth: 'auto',
    didDrawPage: (data) => {
      // Add page number at bottom
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    },
  });

  // Get Y position after table
  yPosition = doc.lastAutoTable.finalY + 5;

  // ===== TOTALS ROW =====
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, yPosition, pageWidth - (margin * 2), 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  
  const totals = statement.totals || {};
  doc.text('TOTALS', margin + 2, yPosition + 5);
  doc.text(formatNumber(totals.totalDebit || 0), pageWidth - margin - 54, yPosition + 5, { align: 'right' });
  doc.text(formatNumber(totals.totalCredit || 0), pageWidth - margin - 28, yPosition + 5, { align: 'right' });
  doc.text(formatNumber(statement.closingBalance || 0), pageWidth - margin - 2, yPosition + 5, { align: 'right' });

  // ===== CLOSING BALANCE =====
  yPosition += 12;
  doc.setFillColor(200, 230, 200);
  doc.rect(margin, yPosition - 4, pageWidth - (margin * 2), 8, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CLOSING BALANCE:', margin + 2, yPosition);
  doc.text(`AED ${formatNumber(statement.closingBalance)}`, pageWidth - margin - 2, yPosition, { align: 'right' });

  // ===== SUMMARY SECTION =====
  yPosition += 12;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMARY', margin, yPosition);
  
  yPosition += 5;
  doc.setFont('helvetica', 'normal');
  const summary = statement.summary || {};
  doc.text(`Total Invoices: ${summary.totalInvoices || 0}`, margin, yPosition);
  doc.text(`Total Receipts: ${summary.totalReceipts || 0}`, margin + 50, yPosition);
  doc.text(`Total Returns: ${summary.totalReturns || 0}`, margin + 100, yPosition);

  // ===== EXCESS PAYMENTS SECTION (if any) =====
  const excessPayments = statement.excessPayments || [];
  if (excessPayments.length > 0) {
    yPosition += 12;
    
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(255, 245, 200);
    doc.rect(margin, yPosition - 4, pageWidth - (margin * 2), 7, 'F');
    doc.text('EXCESS / PARTIAL PAYMENTS', margin + 2, yPosition);

    yPosition += 8;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('These payments are partial or advance payments not fully allocated to invoices.', margin, yPosition);

    yPosition += 5;

    // Excess payments table
    const excessHeaders = [
      { header: 'Date', dataKey: 'date' },
      { header: 'Voucher No', dataKey: 'voucherNo' },
      { header: 'Description', dataKey: 'description' },
      { header: 'Amount (AED)', dataKey: 'amount' },
      { header: 'Type', dataKey: 'type' },
    ];

    const excessData = excessPayments.map((e) => ({
      date: formatDate(e.date),
      voucherNo: e.voucherNo || '',
      description: e.description || '',
      amount: formatNumber(e.amount),
      type: e.isPartial ? 'Partial' : 'Advance',
    }));

    autoTable(doc, {
      columns: excessHeaders,
      body: excessData,
      startY: yPosition,
      theme: 'grid',
      headStyles: {
        fillColor: [180, 150, 50],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
      },
      columnStyles: {
        date: { cellWidth: 25 },
        voucherNo: { cellWidth: 30 },
        description: { cellWidth: 70 },
        amount: { cellWidth: 28, halign: 'right' },
        type: { cellWidth: 25, halign: 'center' },
      },
      margin: { left: margin, right: margin },
    });

    yPosition = doc.lastAutoTable.finalY + 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Total Excess Amount: AED ${formatNumber(statement.excessTotal || 0)}`, margin, yPosition);
  }

  // ===== FOOTER =====
  yPosition = pageHeight - 25;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('This is a computer generated statement. No signature required.', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 4;
  doc.text(`Generated on: ${new Date().toLocaleString('en-GB')}`, pageWidth / 2, yPosition, { align: 'center' });

  // ===== GENERATE FILENAME AND SAVE =====
  const customerNameClean = (customer.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const periodStr = period.from && period.to
    ? `_${String(period.from).slice(0, 10)}_to_${String(period.to).slice(0, 10)}`.replace(/[^a-zA-Z0-9_-]/g, '')
    : '';

  const filename = `SOA_${customerNameClean}${periodStr}_${dateStr}.pdf`;

  // Save file
  doc.save(filename);

  return filename;
};

export default exportStatementOfAccountPDF;
