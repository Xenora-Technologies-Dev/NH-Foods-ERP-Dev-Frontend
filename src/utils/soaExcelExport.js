import * as XLSX from 'xlsx';

// Default company details
const DEFAULT_COMPANY_NAME = 'NH FOODSTUFF TRADING LLC S.O.C.';
const DEFAULT_COMPANY_ADDRESS = 'Dubai, United Arab Emirates';
const CURRENCY = 'AED';

/**
 * Format date for display
 */
const formatDate = (dateString) => {
  if (!dateString || dateString === 'Beginning') return dateString || 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format number with 2 decimal places
 */
const formatNumber = (num) => {
  return (num || 0).toFixed(2);
};

/**
 * Get company name from statement data or default
 */
const getCompanyName = (statement) => {
  return statement?.companyInfo?.name || DEFAULT_COMPANY_NAME;
};

/**
 * Get company address from statement data or default
 */
const getCompanyAddress = (statement) => {
  return statement?.companyInfo?.address || DEFAULT_COMPANY_ADDRESS;
};

/**
 * Export Statement of Account to Excel
 * Standard format with customer details, transactions, and excess payments
 */
export const exportStatementOfAccountExcel = (statement) => {
  const wb = XLSX.utils.book_new();
  const companyName = getCompanyName(statement);
  const companyAddress = getCompanyAddress(statement);
  const customer = statement.customer || {};
  const period = statement.period || {};

  // ===== MAIN STATEMENT SHEET =====
  const mainData = [];

  // Company Header
  mainData.push([companyName]);
  mainData.push([companyAddress]);
  mainData.push(['']);
  mainData.push(['STATEMENT OF ACCOUNT']);
  mainData.push(['']);

  // Customer Details Section
  mainData.push(['CUSTOMER DETAILS']);
  mainData.push(['Customer Name:', customer.customerName || 'N/A']);
  mainData.push(['Customer ID:', customer.customerId || 'N/A']);
  mainData.push(['TRN Number:', customer.trnNumber || 'N/A']);
  mainData.push(['Contact Person:', customer.contactPerson || 'N/A']);
  mainData.push(['Email:', customer.email || 'N/A']);
  mainData.push(['Phone:', customer.phone || 'N/A']);
  mainData.push(['Billing Address:', customer.billingAddress || 'N/A']);
  mainData.push(['Payment Terms:', customer.paymentTerms || 'N/A']);
  mainData.push(['']);

  // Period
  mainData.push(['STATEMENT PERIOD']);
  mainData.push(['From:', formatDate(period.from)]);
  mainData.push(['To:', formatDate(period.to)]);
  mainData.push(['Generated:', formatDate(statement.generatedDate)]);
  mainData.push(['']);

  // Opening Balance
  mainData.push(['OPENING BALANCE:', '', '', '', `${CURRENCY} ${formatNumber(statement.openingBalance)}`]);
  mainData.push(['']);

  // Transaction Headers
  mainData.push([
    'Date',
    'Type',
    'Reference',
    'Description',
    `Debit (${CURRENCY})`,
    `Credit (${CURRENCY})`,
    `Balance (${CURRENCY})`,
  ]);

  // Transaction Rows
  const transactions = statement.transactions || [];
  transactions.forEach((t) => {
    mainData.push([
      formatDate(t.date),
      t.type || '',
      t.reference || '',
      t.description || '',
      t.debit > 0 ? formatNumber(t.debit) : '',
      t.credit > 0 ? formatNumber(t.credit) : '',
      formatNumber(t.balance),
    ]);
  });

  // Empty row before totals
  mainData.push(['']);

  // Totals Row
  mainData.push([
    'TOTALS',
    '',
    '',
    '',
    formatNumber(statement.totals?.totalDebit),
    formatNumber(statement.totals?.totalCredit),
    formatNumber(statement.closingBalance),
  ]);

  // Closing Balance
  mainData.push(['']);
  mainData.push(['CLOSING BALANCE:', '', '', '', '', '', `${CURRENCY} ${formatNumber(statement.closingBalance)}`]);

  // Summary Section
  mainData.push(['']);
  mainData.push(['SUMMARY']);
  mainData.push(['Total Invoices:', statement.summary?.totalInvoices || 0]);
  mainData.push(['Total Receipts:', statement.summary?.totalReceipts || 0]);
  mainData.push(['Total Returns:', statement.summary?.totalReturns || 0]);

  // Create main worksheet
  const mainWs = XLSX.utils.aoa_to_sheet(mainData);

  // Apply column widths
  mainWs['!cols'] = [
    { wch: 15 },  // Date
    { wch: 18 },  // Type
    { wch: 20 },  // Reference
    { wch: 35 },  // Description
    { wch: 15 },  // Debit
    { wch: 15 },  // Credit
    { wch: 15 },  // Balance
  ];

  // Add main sheet to workbook
  XLSX.utils.book_append_sheet(wb, mainWs, 'Statement of Account');

  // ===== EXCESS PAYMENTS SHEET =====
  const excessPayments = statement.excessPayments || [];
  if (excessPayments.length > 0) {
    const excessData = [];

    // Header
    excessData.push([companyName]);
    excessData.push([companyAddress]);
    excessData.push(['']);
    excessData.push(['EXCESS / PARTIAL PAYMENTS']);
    excessData.push(['']);
    excessData.push(['Customer:', customer.customerName || 'N/A']);
    excessData.push(['Period:', `${formatDate(period.from)} - ${formatDate(period.to)}`]);
    excessData.push(['']);

    // Description
    excessData.push(['These payments are partial or advance payments not fully allocated to invoices.']);
    excessData.push(['']);

    // Table Headers
    excessData.push([
      'Date',
      'Voucher No',
      'Description',
      `Amount (${CURRENCY})`,
      'Type',
      'Remaining Balance',
    ]);

    // Excess Payment Rows
    excessPayments.forEach((e) => {
      excessData.push([
        formatDate(e.date),
        e.voucherNo || '',
        e.description || '',
        formatNumber(e.amount),
        e.isPartial ? 'Partial Payment' : 'Advance Payment',
        formatNumber(e.remainingBalance),
      ]);
    });

    // Total
    excessData.push(['']);
    excessData.push([
      'TOTAL EXCESS AMOUNT',
      '',
      '',
      formatNumber(statement.excessTotal),
      '',
      '',
    ]);

    // Summary
    excessData.push(['']);
    excessData.push(['EXCESS PAYMENT SUMMARY']);
    excessData.push(['Total Partial Payments:', statement.summary?.totalPartialPayments || 0]);
    excessData.push(['Total Advance Payments:', statement.summary?.totalAdvancePayments || 0]);

    // Create excess payments worksheet
    const excessWs = XLSX.utils.aoa_to_sheet(excessData);

    // Apply column widths
    excessWs['!cols'] = [
      { wch: 15 },  // Date
      { wch: 18 },  // Voucher No
      { wch: 45 },  // Description
      { wch: 15 },  // Amount
      { wch: 18 },  // Type
      { wch: 18 },  // Remaining Balance
    ];

    // Add excess sheet to workbook
    XLSX.utils.book_append_sheet(wb, excessWs, 'Excess Payments');
  }

  // ===== GENERATE FILENAME AND SAVE =====
  const customerNameClean = (customer.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const periodStr = period.from && period.to 
    ? `_${period.from}_to_${period.to}`.replace(/[^a-zA-Z0-9_-]/g, '')
    : '';
  
  const filename = `SOA_${customerNameClean}${periodStr}_${dateStr}.xlsx`;

  // Save file
  XLSX.writeFile(wb, filename);

  return filename;
};

export default exportStatementOfAccountExcel;
