import * as XLSX from 'xlsx';

// Default company details - will be overridden by report data
const DEFAULT_COMPANY_NAME = 'NH FOODSTUFF TRADING LLC S.O.C.';
const DEFAULT_COMPANY_ADDRESS = 'Dubai, United Arab Emirates';
const CURRENCY = 'AED';

/**
 * Generate a Date_Time(HH:MM) stamp for filenames
 * Format: YYYY-MM-DD_HH-MM
 */
const getFileNameDateTimeStamp = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${date}_${hh}-${mm}`;
};

/**
 * Format date and time for display
 */
const formatDateTime = (date = new Date()) => {
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

/**
 * Format number with 4 decimal places
 */
const formatNumber = (num) => {
  return (num || 0).toFixed(2);
};

/**
 * Get company name from report data or default
 */
const getCompanyName = (report) => {
  return report?.companyInfo?.name || 
         report?.companyInfo?.companyName || 
         DEFAULT_COMPANY_NAME;
};

/**
 * Get company address from report data or default
 */
const getCompanyAddress = (report) => {
  return report?.companyInfo?.address || DEFAULT_COMPANY_ADDRESS;
};

/**
 * Create header rows with company info
 */
const createHeaderRows = (reportTitle, periodLabel, generatedDate, report) => {
  const companyName = getCompanyName(report);
  const companyAddress = getCompanyAddress(report);
  
  return [
    [companyName],
    [companyAddress],
    [''],
    [reportTitle],
    [''],
    [`Period: ${periodLabel || 'N/A'}`],
    [`Generated: ${formatDateTime(generatedDate ? new Date(generatedDate) : new Date())}`],
    [''],
  ];
};

/**
 * Apply styles to worksheet (column widths)
 */
const applyStyles = (ws, columnWidths) => {
  ws['!cols'] = columnWidths.map(width => ({ wch: width }));
};

/**
 * Export Trial Balance Report to Excel
 */
export const exportTrialBalanceExcel = (report) => {
  const wb = XLSX.utils.book_new();
  const companyName = getCompanyName(report);
  
  // Create header
  const data = createHeaderRows(
    'TRIAL BALANCE REPORT',
    report.dateRange?.label,
    report.generatedDate,
    report
  );
  
  // Add table headers
  data.push(['Account Code', 'Account Name', 'Account Type', `Debit (${CURRENCY})`, `Credit (${CURRENCY})`]);
  
  // Filter and add accounts
  const filteredAccounts = (report.accounts || []).filter(
    (a) => Math.abs(a.debitBalance || 0) > 0.01 || Math.abs(a.creditBalance || 0) > 0.01
  );
  
  filteredAccounts.forEach((account) => {
    data.push([
      account.accountCode || '-',
      account.accountName || '',
      account.accountType || '',
      formatNumber(account.debitBalance),
      formatNumber(account.creditBalance),
    ]);
  });
  
  // Add empty row
  data.push(['']);
  
  // Add totals
  data.push([
    'TOTAL',
    '',
    '',
    formatNumber(report.totals?.totalDebit),
    formatNumber(report.totals?.totalCredit),
  ]);
  
  // Add balance status
  data.push(['']);
  const isBalanced = report.totals?.isBalanced;
  data.push([isBalanced ? '✓ Trial Balance is Balanced' : '⚠ Trial Balance is NOT Balanced']);
  if (!isBalanced) {
    data.push([`Difference: ${CURRENCY} ${formatNumber(report.totals?.difference)}`]);
  }
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);
  applyStyles(ws, [15, 35, 15, 18, 18]);
  
  // Add to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Trial Balance');
  
  // Generate filename with date-time
  const stamp = getFileNameDateTimeStamp();
  const filename = `${companyName.replace(/\s+/g, '_')}_Trial_Balance_${report.year}${report.month ? `_${String(report.month).padStart(2, '0')}` : ''}_${stamp}.xlsx`;
  
  // Save file
  XLSX.writeFile(wb, filename);
};

/**
 * Export Profit & Loss Report to Excel
 */
export const exportProfitLossExcel = (report) => {
  const wb = XLSX.utils.book_new();
  const companyName = getCompanyName(report);
  
  // Create header
  const data = createHeaderRows(
    'PROFIT & LOSS ACCOUNT',
    report.dateRange?.label,
    report.generatedDate,
    report
  );
  
  // Revenue Section
  data.push(['REVENUE']);
  data.push(['Account Code', 'Account Name', `Amount (${CURRENCY})`]);
  
  const revenueItems = report.revenue?.items || [];
  if (revenueItems.length > 0) {
    revenueItems.forEach((item) => {
      data.push([
        item.accountCode || '-',
        item.accountName || '',
        formatNumber(item.amount),
      ]);
    });
  } else {
    data.push(['', 'No revenue items', '0.00']);
  }
  
  data.push(['', 'Total Revenue', formatNumber(report.revenue?.total)]);
  data.push(['']);
  
  // Cost of Goods Sold Section (if present)
  if (report.costOfGoodsSold?.total > 0) {
    data.push(['COST OF GOODS SOLD']);
    data.push(['Account Code', 'Account Name', `Amount (${CURRENCY})`]);
    
    const cogsItems = report.costOfGoodsSold?.items || [];
    cogsItems.forEach((item) => {
      data.push([
        item.accountCode || '-',
        item.accountName || '',
        formatNumber(item.amount),
      ]);
    });
    
    data.push(['', 'Total COGS', formatNumber(report.costOfGoodsSold?.total)]);
    data.push(['', 'Gross Profit', formatNumber(report.summary?.grossProfit)]);
    data.push(['']);
  }
  
  // Expenses Section
  data.push(['EXPENSES']);
  data.push(['Account Code', 'Account Name', `Amount (${CURRENCY})`]);
  
  const expenseItems = report.expenses?.items || [];
  if (expenseItems.length > 0) {
    expenseItems.forEach((item) => {
      data.push([
        item.accountCode || '-',
        item.accountName || '',
        formatNumber(item.amount),
      ]);
    });
  } else {
    data.push(['', 'No expense items', '0.00']);
  }
  
  data.push(['', 'Total Expenses', formatNumber(report.expenses?.total)]);
  data.push(['']);
  
  // Summary Section
  data.push(['SUMMARY']);
  data.push(['Total Revenue', '', formatNumber(report.summary?.totalRevenue)]);
  data.push(['Total Expenses', '', formatNumber(report.summary?.totalExpenses)]);
  
  const isProfitable = (report.summary?.netProfit || 0) >= 0;
  data.push([isProfitable ? 'Net Profit' : 'Net Loss', '', formatNumber(Math.abs(report.summary?.netProfit))]);
  data.push(['Profit Margin', '', `${parseFloat(report.summary?.profitMargin || 0).toFixed(2)}%`]);
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);
  applyStyles(ws, [15, 35, 18]);
  
  // Add to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Profit & Loss');
  
  // Generate filename
  const stamp = getFileNameDateTimeStamp();
  const filename = `${companyName.replace(/\s+/g, '_')}_Profit_Loss_${report.year}${report.month ? `_${String(report.month).padStart(2, '0')}` : ''}_${stamp}.xlsx`;
  
  XLSX.writeFile(wb, filename);
};

/**
 * Export Balance Sheet Report to Excel
 */
export const exportBalanceSheetExcel = (report) => {
  const wb = XLSX.utils.book_new();
  const companyName = getCompanyName(report);
  
  // Create header
  const data = createHeaderRows(
    'BALANCE SHEET',
    report.dateRange?.label,
    report.generatedDate,
    report
  );
  
  data.push(['(Statement of Financial Position)']);
  data.push(['']);
  
  // Assets Section
  data.push(['ASSETS']);
  data.push(['Account Code', 'Account Name', `Balance (${CURRENCY})`]);
  
  const assetsItems = report.assets?.items || report.assets?.net || [];
  if (assetsItems.length > 0) {
    assetsItems.forEach((item) => {
      data.push([
        item.accountCode || '-',
        item.accountName || '',
        formatNumber(item.balance),
      ]);
    });
  } else {
    data.push(['', 'No assets', '0.00']);
  }
  
  data.push(['', 'Total Assets', formatNumber(report.summary?.totalAssets)]);
  data.push(['']);
  
  // Liabilities Section
  data.push(['LIABILITIES']);
  data.push(['Account Code', 'Account Name', `Balance (${CURRENCY})`]);
  
  const liabilitiesItems = report.liabilities?.items || [];
  if (liabilitiesItems.length > 0) {
    liabilitiesItems.forEach((item) => {
      data.push([
        item.accountCode || '-',
        item.accountName || '',
        formatNumber(item.balance),
      ]);
    });
  } else {
    data.push(['', 'No liabilities', '0.00']);
  }
  
  data.push(['', 'Total Liabilities', formatNumber(report.summary?.totalLiabilities)]);
  data.push(['']);
  
  // Equity Section
  data.push(['EQUITY']);
  data.push(['Account Code', 'Account Name', `Balance (${CURRENCY})`]);
  
  const equityItems = report.equity?.items || [];
  if (equityItems.length > 0) {
    equityItems.forEach((item) => {
      data.push([
        item.accountCode || '-',
        item.accountName || '',
        formatNumber(item.balance),
      ]);
    });
  } else {
    data.push(['', 'No equity', '0.00']);
  }
  
  data.push(['', 'Total Equity', formatNumber(report.summary?.totalEquity)]);
  data.push(['']);
  
  // Balance Check
  data.push(['BALANCE CHECK']);
  data.push(['Total Assets', '', formatNumber(report.summary?.totalAssets)]);
  data.push(['Total Liabilities + Equity', '', formatNumber((report.summary?.totalLiabilities || 0) + (report.summary?.totalEquity || 0))]);
  
  const isBalanced = report.summary?.isBalanced;
  data.push([isBalanced ? '✓ Balance Sheet is Balanced' : '⚠ Balance Sheet is NOT Balanced']);
  if (!isBalanced) {
    data.push([`Difference: ${CURRENCY} ${formatNumber(report.summary?.difference)}`]);
  }
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);
  applyStyles(ws, [15, 35, 18]);
  
  // Add to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet');
  
  // Generate filename
  const stamp = getFileNameDateTimeStamp();
  const filename = `${companyName.replace(/\s+/g, '_')}_Balance_Sheet_${report.year}${report.month ? `_${String(report.month).padStart(2, '0')}` : ''}_${stamp}.xlsx`;
  
  XLSX.writeFile(wb, filename);
};

/**
 * Export Sales Order data to Excel with complete item details
 */
export const exportSalesOrdersToExcel = (salesOrders, fileName = 'Sales_Orders') => {
  if (!salesOrders || salesOrders.length === 0) {
    console.warn('No sales orders to export');
    return;
  }

  const wb = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData = salesOrders.map((so) => ({
    'SO Number': so.orderNumber || so.transactionNo || '-',
    'Transaction No': so.transactionNo || '-',
    'Customer': so.customerName || so.partyName || '-',
    'Date': so.date ? new Date(so.date).toLocaleDateString() : '-',
    'Delivery Date': so.deliveryDate ? new Date(so.deliveryDate).toLocaleDateString() : '-',
    'Status': so.status || '-',
    'Priority': so.priority || '-',
    'Total Amount': so.totalAmount ? String(so.totalAmount) : '-',
    'Items Count': Array.isArray(so.items) ? so.items.length : 0,
    'Notes': so.notes || '-',
    'Created By': so.createdBy || '-',
  }));

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  const fullFileName = `${fileName}_${getFileNameDateTimeStamp()}.xlsx`;
  XLSX.writeFile(wb, fullFileName);
};

/**
 * Export Sales Invoice data to Excel
 */
export const exportSalesInvoicesToExcel = (salesInvoices, fileName = 'Sales_Invoices') => {
  if (!salesInvoices || salesInvoices.length === 0) {
    console.warn('No sales invoices to export');
    return;
  }

  const wb = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData = salesInvoices.map((invoice) => ({
    'Invoice Number': invoice.transactionNo || '-',
    'Order Number': invoice.orderNumber || '-',
    'Customer': invoice.customerName || invoice.partyName || '-',
    'Invoice Date': invoice.date ? new Date(invoice.date).toLocaleDateString() : '-',
    'Status': invoice.status || '-',
    'Payment Status': ['PAID', 'PARTIAL'].includes(String(invoice.status || '').toUpperCase()) ? String(invoice.status).toUpperCase() : (Number(invoice.paidAmount || 0) > 0 ? (Number(invoice.outstandingAmount || 0) <= 0 ? 'PAID' : 'PARTIAL') : 'UNPAID'),
    'Total Amount': invoice.totalAmount ? String(invoice.totalAmount) : '-',
    'Paid Amount': invoice.paidAmount ? String(invoice.paidAmount) : '0',
    'Outstanding': invoice.outstandingAmount ? String(invoice.outstandingAmount) : String((invoice.totalAmount || 0) - (invoice.paidAmount || 0)),
    'Items Count': Array.isArray(invoice.items) ? invoice.items.length : 0,
    'Terms': invoice.terms || '-',
    'Created By': invoice.createdBy || '-',
  }));

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  const fullFileName = `${fileName}_${getFileNameDateTimeStamp()}.xlsx`;
  XLSX.writeFile(wb, fullFileName);
};

/**
 * Export Purchase Order data to Excel
 */
export const exportPurchaseOrdersToExcel = (purchaseOrders, fileName = 'Purchase_Orders') => {
  if (!purchaseOrders || purchaseOrders.length === 0) {
    console.warn('No purchase orders to export');
    return;
  }

  const wb = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData = purchaseOrders.map((po) => ({
    'PO Number': po.orderNumber || po.transactionNo || '-',
    'Transaction No': po.transactionNo || '-',
    'Vendor': po.vendorName || po.partyName || '-',
    'Vendor Reference': po.vendorReference || '-',
    'Date': po.date ? new Date(po.date).toLocaleDateString() : '-',
    'Delivery Date': po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString() : '-',
    'Status': po.status || '-',
    'Total Amount': po.totalAmount ? String(po.totalAmount) : '-',
    'Items Count': Array.isArray(po.items) ? po.items.length : 0,
    'Notes': po.notes || '-',
    'Created By': po.createdBy || '-',
  }));

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  const fullFileName = `${fileName}_${getFileNameDateTimeStamp()}.xlsx`;
  XLSX.writeFile(wb, fullFileName);
};

/**
 * Export Purchase Entry (Invoices) data to Excel
 */
export const exportPurchaseInvoicesToExcel = (purchaseInvoices, fileName = 'Purchase_Invoices') => {
  if (!purchaseInvoices || purchaseInvoices.length === 0) {
    console.warn('No purchase invoices to export');
    return;
  }

  const wb = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData = purchaseInvoices.map((invoice) => ({
    'Invoice Number': invoice.transactionNo || '-',
    'PO Number': invoice.orderNumber || '-',
    'Vendor': invoice.vendorName || invoice.partyName || '-',
    'Invoice Date': invoice.date ? new Date(invoice.date).toLocaleDateString() : '-',
    'Status': invoice.status || '-',
    'Payment Status': ['PAID', 'PARTIAL'].includes(String(invoice.status || '').toUpperCase()) ? String(invoice.status).toUpperCase() : (Number(invoice.paidAmount || 0) > 0 ? (Number(invoice.outstandingAmount || 0) <= 0 ? 'PAID' : 'PARTIAL') : 'UNPAID'),
    'Total Amount': invoice.totalAmount ? String(invoice.totalAmount) : '-',
    'Paid Amount': invoice.paidAmount ? String(invoice.paidAmount) : '0',
    'Outstanding': invoice.outstandingAmount ? String(invoice.outstandingAmount) : String((invoice.totalAmount || 0) - (invoice.paidAmount || 0)),
    'Items Count': Array.isArray(invoice.items) ? invoice.items.length : 0,
    'Terms': invoice.terms || '-',
    'Created By': invoice.createdBy || '-',
  }));

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  const fullFileName = `${fileName}_${getFileNameDateTimeStamp()}.xlsx`;
  XLSX.writeFile(wb, fullFileName);
};

/**
 * Export Item Profitability Report to Excel
 */
export const exportItemProfitabilityExcel = (report) => {
  const wb = XLSX.utils.book_new();

  // Build header rows
  const headerRows = [
    [DEFAULT_COMPANY_NAME],
    [DEFAULT_COMPANY_ADDRESS],
    [],
    ['ITEM PROFITABILITY ANALYSIS REPORT'],
    [`Period: ${report.dateRange?.label || 'All Time'}`],
    [`Generated: ${formatDateTime(new Date())}`],
    [],
  ];

  // Summary section
  const summary = report.summary || {};
  headerRows.push(['REPORT SUMMARY']);
  headerRows.push(['Total Items', summary.totalItems || 0]);
  headerRows.push(['Profitable Items', summary.profitableItems || 0]);
  headerRows.push(['Loss Items', summary.lossItems || 0]);
  headerRows.push([`Total Purchase Value (${CURRENCY})`, formatNumber(summary.totalPurchaseValue)]);
  headerRows.push([`Total Sales Value (${CURRENCY})`, formatNumber(summary.totalSalesValue)]);
  headerRows.push([`Net Profit/Loss (${CURRENCY})`, formatNumber(summary.totalProfit)]);
  headerRows.push(['Overall Profit %', `${(summary.overallProfitPercentage || 0).toFixed(2)}%`]);
  headerRows.push([]);

  // Table headers
  headerRows.push([
    'Item Code',
    'Item Name',
    'Category',
    'UOM',
    'Purchase Qty',
    'Sales Qty',
    `Avg Purchase Price (${CURRENCY})`,
    `Avg Sales Price (${CURRENCY})`,
    `Total Purchase Value (${CURRENCY})`,
    `Total Sales Value (${CURRENCY})`,
    `Profit/Loss (${CURRENCY})`,
    'Margin %',
    'Status',
  ]);

  // Data rows
  const items = report.items || [];
  items.forEach((item) => {
    headerRows.push([
      item.itemCode || '-',
      item.itemName || '-',
      item.category || '-',
      item.uom || '-',
      item.purchaseQty || 0,
      item.salesQty || 0,
      formatNumber(item.avgPurchasePrice),
      formatNumber(item.avgSalesPrice),
      formatNumber(item.totalPurchaseValue),
      formatNumber(item.totalSalesValue),
      formatNumber(item.profitLoss),
      `${(item.profitPercentage || 0).toFixed(2)}%`,
      item.isProfitable ? 'PROFIT' : 'LOSS',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(headerRows);

  // Set column widths
  ws['!cols'] = [
    { wch: 14 }, // Item Code
    { wch: 30 }, // Item Name
    { wch: 16 }, // Category
    { wch: 8 },  // UOM
    { wch: 14 }, // Purchase Qty
    { wch: 12 }, // Sales Qty
    { wch: 18 }, // Avg Purchase Price
    { wch: 16 }, // Avg Sales Price
    { wch: 22 }, // Total Purchase Value
    { wch: 20 }, // Total Sales Value
    { wch: 18 }, // Profit/Loss
    { wch: 12 }, // Margin %
    { wch: 10 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Item Profitability');

  // Generate filename with date-time stamp
  XLSX.writeFile(wb, `Item_Profitability_Report_${getFileNameDateTimeStamp()}.xlsx`);
};

// ──────────────────────────────────────────────────────────────
// Accounts Module Export Functions
// ──────────────────────────────────────────────────────────────

/**
 * Export Vouchers (Receipt/Payment/Journal/Contra/Expense) to Excel
 * Supports filtering based on current view
 */
export const exportVouchersToExcel = (vouchers, voucherType = 'All', filters = {}) => {
  if (!vouchers || vouchers.length === 0) {
    console.warn('No vouchers to export');
    return;
  }

  const wb = XLSX.utils.book_new();
  const typeLabel = voucherType.charAt(0).toUpperCase() + voucherType.slice(1);

  // Header rows
  const data = createHeaderRows(
    `${typeLabel.toUpperCase()} VOUCHER REPORT`,
    filters.dateRange || 'All Periods',
    new Date()
  );

  // Add filter info if available
  if (filters.status) data.push([`Status Filter: ${filters.status}`]);
  if (filters.party) data.push([`Party Filter: ${filters.party}`]);
  if (filters.dateFrom || filters.dateTo) {
    data.push([`Date Range: ${filters.dateFrom || 'Start'} to ${filters.dateTo || 'End'}`]);
  }
  data.push(['']);

  // Table headers based on voucher type
  if (voucherType === 'receipt' || voucherType === 'payment') {
    data.push([
      'Voucher No', 'Date', 'Party Name', `Amount (${CURRENCY})`,
      'Payment Mode', 'Status', 'Linked Invoices', 'Narration'
    ]);

    vouchers.forEach(v => {
      const linkedInvCount = v.linkedInvoices?.length || 0;
      data.push([
        v.voucherNo || '-',
        v.date ? new Date(v.date).toLocaleDateString('en-GB') : '-',
        v.partyName || '-',
        formatNumber(v.totalAmount),
        v.paymentMode || '-',
        v.status || '-',
        linkedInvCount > 0 ? `${linkedInvCount} invoice(s)` : 'On Account',
        v.narration || v.notes || '-',
      ]);
    });
  } else if (voucherType === 'journal') {
    data.push([
      'Voucher No', 'Date', 'Debit Account', 'Credit Account',
      `Amount (${CURRENCY})`, 'Status', 'Narration'
    ]);

    vouchers.forEach(v => {
      const debitEntry = v.entries?.find(e => e.debitAmount > 0);
      const creditEntry = v.entries?.find(e => e.creditAmount > 0);
      data.push([
        v.voucherNo || '-',
        v.date ? new Date(v.date).toLocaleDateString('en-GB') : '-',
        debitEntry?.accountName || '-',
        creditEntry?.accountName || '-',
        formatNumber(v.totalAmount),
        v.status || '-',
        v.narration || '-',
      ]);
    });
  } else if (voucherType === 'contra') {
    data.push([
      'Voucher No', 'Date', 'From Account', 'To Account',
      `Amount (${CURRENCY})`, 'Status', 'Narration'
    ]);

    vouchers.forEach(v => {
      const creditEntry = v.entries?.find(e => e.creditAmount > 0);
      const debitEntry = v.entries?.find(e => e.debitAmount > 0);
      data.push([
        v.voucherNo || '-',
        v.date ? new Date(v.date).toLocaleDateString('en-GB') : '-',
        creditEntry?.accountName || '-',
        debitEntry?.accountName || '-',
        formatNumber(v.totalAmount),
        v.status || '-',
        v.narration || '-',
      ]);
    });
  } else if (voucherType === 'expense') {
    data.push([
      'Voucher No', 'Date', 'Expense Account', 'Payment Source',
      `Net Amount (${CURRENCY})`, `VAT (${CURRENCY})`, `Total (${CURRENCY})`,
      'Status', 'Narration'
    ]);

    vouchers.forEach(v => {
      data.push([
        v.voucherNo || '-',
        v.date ? new Date(v.date).toLocaleDateString('en-GB') : '-',
        v.expenseAccountName || v.expenseTypeName || '-',
        v.transactorName || '-',
        formatNumber(v.netAmount || v.totalAmount),
        formatNumber(v.vatAmount || 0),
        formatNumber(v.totalAmount),
        v.status || '-',
        v.narration || v.description || '-',
      ]);
    });
  } else {
    // Generic voucher export
    data.push([
      'Voucher No', 'Type', 'Date', 'Party Name',
      `Amount (${CURRENCY})`, 'Status', 'Narration'
    ]);

    vouchers.forEach(v => {
      data.push([
        v.voucherNo || '-',
        v.voucherType || '-',
        v.date ? new Date(v.date).toLocaleDateString('en-GB') : '-',
        v.partyName || '-',
        formatNumber(v.totalAmount),
        v.status || '-',
        v.narration || '-',
      ]);
    });
  }

  // Add summary
  data.push(['']);
  const totalAmount = vouchers.reduce((sum, v) => sum + (v.totalAmount || 0), 0);
  data.push(['TOTAL', '', '', '', formatNumber(totalAmount)]);
  data.push([`Total Records: ${vouchers.length}`]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  applyStyles(ws, [18, 12, 25, 25, 18, 18, 18, 30]);
  XLSX.utils.book_append_sheet(wb, ws, `${typeLabel} Vouchers`);

  const stamp = getFileNameDateTimeStamp();
  XLSX.writeFile(wb, `${typeLabel}_Vouchers_${stamp}.xlsx`);
};

/**
 * Export Chart of Accounts to Excel
 */
export const exportChartOfAccountsExcel = (accounts, filters = {}) => {
  if (!accounts || accounts.length === 0) {
    console.warn('No accounts to export');
    return;
  }

  const wb = XLSX.utils.book_new();

  const data = createHeaderRows(
    'CHART OF ACCOUNTS',
    'Current',
    new Date()
  );

  if (filters.accountType) data.push([`Account Type: ${filters.accountType}`]);
  if (filters.search) data.push([`Search: ${filters.search}`]);
  data.push(['']);

  // Group by type
  const typeOrder = ['asset', 'liability', 'equity', 'revenue', 'expense'];
  const typeLabels = {
    asset: 'ASSETS',
    liability: 'LIABILITIES',
    equity: 'EQUITY',
    revenue: 'REVENUE',
    expense: 'EXPENSES',
  };

  data.push(['Account Code', 'Account Name', 'Type', 'Sub-Type', 'Normal Balance', `Current Balance (${CURRENCY})`, 'Active', 'System']);

  for (const type of typeOrder) {
    const typeAccounts = accounts.filter(a => a.accountType === type);
    if (typeAccounts.length === 0) continue;

    data.push(['']);
    data.push([typeLabels[type] || type.toUpperCase()]);

    typeAccounts
      .sort((a, b) => (a.accountCode || '').localeCompare(b.accountCode || ''))
      .forEach(acc => {
        data.push([
          acc.accountCode || '-',
          acc.accountName || '-',
          acc.accountType || '-',
          acc.accountSubType || acc.subType || '-',
          acc.normalBalance || (["asset", "expense"].includes(acc.accountType) ? 'Debit' : 'Credit'),
          formatNumber(acc.currentBalance || acc.openingBalance),
          acc.isActive !== false ? 'Yes' : 'No',
          acc.isSystemAccount ? 'Yes' : 'No',
        ]);
      });
  }

  data.push(['']);
  data.push([`Total Accounts: ${accounts.length}`]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  applyStyles(ws, [15, 35, 12, 20, 15, 18, 8, 8]);
  XLSX.utils.book_append_sheet(wb, ws, 'Chart of Accounts');

  const stamp = getFileNameDateTimeStamp();
  XLSX.writeFile(wb, `Chart_of_Accounts_${stamp}.xlsx`);
};

/**
 * Export Account Vouchers (Purchase/Sale accounts) to Excel
 */
export const exportAccountVouchersExcel = (vouchers, accountType = 'All', filters = {}) => {
  if (!vouchers || vouchers.length === 0) {
    console.warn('No account vouchers to export');
    return;
  }

  const wb = XLSX.utils.book_new();
  const typeLabel = accountType === 'purchase' ? 'Purchase (Debit)' : accountType === 'sale' ? 'Sale (Credit)' : 'Account';

  const data = createHeaderRows(
    `${typeLabel.toUpperCase()} ACCOUNTS REPORT`,
    filters.dateRange || 'All Periods',
    new Date()
  );

  if (filters.partyName) data.push([`Party: ${filters.partyName}`]);
  if (filters.status) data.push([`Status: ${filters.status}`]);
  data.push(['']);

  data.push([
    'Voucher No', 'Date', 'Party', 'Type',
    `Total Amount (${CURRENCY})`, 'Invoices', 'Status', 'Reference', 'Narration'
  ]);

  vouchers.forEach(v => {
    data.push([
      v.voucherNo || '-',
      v.date ? new Date(v.date).toLocaleDateString('en-GB') : '-',
      v.partyName || '-',
      v.voucherType || '-',
      formatNumber(v.totalAmount),
      v.linkedInvoices?.length || 0,
      v.status || '-',
      v.referenceNo || '-',
      v.narration || '-',
    ]);
  });

  data.push(['']);
  const totalAmount = vouchers.reduce((sum, v) => sum + (v.totalAmount || 0), 0);
  data.push(['TOTAL', '', '', '', formatNumber(totalAmount)]);
  data.push([`Total Records: ${vouchers.length}`]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  applyStyles(ws, [18, 12, 25, 12, 18, 10, 12, 15, 30]);
  XLSX.utils.book_append_sheet(wb, ws, `${typeLabel} Accounts`);

  const stamp = getFileNameDateTimeStamp();
  const fileType = accountType === 'purchase' ? 'Debit' : accountType === 'sale' ? 'Credit' : 'Account';
  XLSX.writeFile(wb, `${fileType}_Accounts_Report_${stamp}.xlsx`);
};

/**
 * Export Transactions list to Excel
 */
export const exportTransactionsExcel = (transactions, filters = {}) => {
  if (!transactions || transactions.length === 0) {
    console.warn('No transactions to export');
    return;
  }

  const wb = XLSX.utils.book_new();

  const data = createHeaderRows(
    'TRANSACTIONS REPORT',
    filters.dateRange || 'All Periods',
    new Date()
  );

  if (filters.transactorName) data.push([`Account: ${filters.transactorName}`]);
  if (filters.type) data.push([`Type: ${filters.type}`]);
  data.push(['']);

  data.push([
    'Account Code', 'Account Name', 'Type', 'Category',
    `Current Balance (${CURRENCY})`, 'Allow Posting', 'Active', 'Last Updated'
  ]);

  transactions.forEach(t => {
    data.push([
      t.accountCode || '-',
      t.accountName || '-',
      t.accountType || '-',
      t.transactorCategory || '-',
      formatNumber(t.currentBalance),
      t.allowDirectPosting !== false ? 'Yes' : 'No',
      t.isActive !== false ? 'Yes' : 'No',
      t.updatedAt ? new Date(t.updatedAt).toLocaleDateString('en-GB') : '-',
    ]);
  });

  data.push(['']);
  const totalBalance = transactions.reduce((sum, t) => sum + (t.currentBalance || 0), 0);
  data.push(['TOTAL BALANCE', '', '', '', formatNumber(totalBalance)]);
  data.push([`Total Accounts: ${transactions.length}`]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  applyStyles(ws, [15, 30, 12, 15, 18, 12, 8, 15]);
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

  const stamp = getFileNameDateTimeStamp();
  XLSX.writeFile(wb, `Transactions_Report_${stamp}.xlsx`);
};

/**
 * Export Expense Accounts to Excel
 */
export const exportExpenseAccountsExcel = (accounts, filters = {}) => {
  if (!accounts || accounts.length === 0) {
    console.warn('No expense accounts to export');
    return;
  }

  const wb = XLSX.utils.book_new();

  const data = createHeaderRows(
    'EXPENSE ACCOUNTS REPORT',
    'Current',
    new Date()
  );

  if (filters.search) data.push([`Search: ${filters.search}`]);
  data.push(['']);

  data.push([
    'Account Code', 'Account Name', `Total Spent (${CURRENCY})`,
    'Expense Types', 'Active', 'Created Date'
  ]);

  accounts.forEach(acc => {
    data.push([
      acc.accountCode || '-',
      acc.accountName || '-',
      formatNumber(acc.totalSpent || 0),
      acc.expenseTypes?.length || acc.typeCount || 0,
      acc.isActive !== false ? 'Yes' : 'No',
      acc.createdAt ? new Date(acc.createdAt).toLocaleDateString('en-GB') : '-',
    ]);
  });

  data.push(['']);
  const totalSpent = accounts.reduce((sum, a) => sum + (a.totalSpent || 0), 0);
  data.push(['TOTAL SPENT', '', formatNumber(totalSpent)]);
  data.push([`Total Accounts: ${accounts.length}`]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  applyStyles(ws, [15, 30, 18, 14, 8, 15]);
  XLSX.utils.book_append_sheet(wb, ws, 'Expense Accounts');

  const stamp = getFileNameDateTimeStamp();
  XLSX.writeFile(wb, `Expense_Accounts_${stamp}.xlsx`);
};

/**
 * Export General Ledger entries to Excel
 */
export const exportLedgerEntriesExcel = (entries, accountInfo = {}, filters = {}) => {
  if (!entries || entries.length === 0) {
    console.warn('No ledger entries to export');
    return;
  }

  const wb = XLSX.utils.book_new();

  const data = createHeaderRows(
    'GENERAL LEDGER',
    filters.dateRange || 'All Periods',
    new Date()
  );

  if (accountInfo.accountName) {
    data.push([`Account: ${accountInfo.accountCode || ''} - ${accountInfo.accountName}`]);
    data.push([`Account Type: ${accountInfo.accountType || '-'}`]);
    data.push([`Normal Balance: ${accountInfo.normalBalance || '-'}`]);
  }
  data.push(['']);

  data.push([
    'Date', 'Journal/Voucher No', 'Type', 'Narration',
    `Debit (${CURRENCY})`, `Credit (${CURRENCY})`, `Balance (${CURRENCY})`, 'Party'
  ]);

  entries.forEach(e => {
    data.push([
      e.date ? new Date(e.date).toLocaleDateString('en-GB') : '-',
      e.journalNo || e.voucherNo || '-',
      e.journalType || e.voucherType || '-',
      e.narration || e.description || '-',
      formatNumber(e.debit || e.debitAmount),
      formatNumber(e.credit || e.creditAmount),
      formatNumber(e.balance || e.runningBalance),
      e.partyName || '-',
    ]);
  });

  data.push(['']);
  const totalDebit = entries.reduce((sum, e) => sum + (e.debit || e.debitAmount || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + (e.credit || e.creditAmount || 0), 0);
  data.push(['TOTALS', '', '', '', formatNumber(totalDebit), formatNumber(totalCredit)]);
  data.push([`Total Entries: ${entries.length}`]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  applyStyles(ws, [12, 18, 12, 35, 18, 18, 18, 20]);
  XLSX.utils.book_append_sheet(wb, ws, 'Ledger');

  const acctName = (accountInfo.accountName || 'General').replace(/[^a-zA-Z0-9]/g, '_');
  const stamp = getFileNameDateTimeStamp();
  XLSX.writeFile(wb, `Ledger_${acctName}_${stamp}.xlsx`);
};

/**
 * Export Vendor (Debit Account) Ledger to Excel
 * Used in VendorDetailsPage for individual vendor account export
 */
export const exportVendorLedgerExcel = (vendor, ledger, filters = {}) => {
  if (!ledger || ledger.length === 0) {
    console.warn('No vendor ledger entries to export');
    return;
  }

  const wb = XLSX.utils.book_new();
  const vendorName = vendor?.name || 'Unknown Vendor';

  const data = [
    [DEFAULT_COMPANY_NAME],
    [DEFAULT_COMPANY_ADDRESS],
    [''],
    ['VENDOR LEDGER - DEBIT ACCOUNT (ACCOUNTS PAYABLE)'],
    [''],
    [`Vendor: ${vendorName}`],
    [`Vendor ID: ${vendor?.partyId || '-'}`],
    [`Outstanding Balance: ${CURRENCY} ${formatNumber(vendor?.currentBalance)}`],
    [''],
  ];

  if (filters.fromDate) data.push([`From: ${filters.fromDate}`]);
  if (filters.toDate) data.push([`To: ${filters.toDate}`]);
  if (filters.status && filters.status !== 'all') data.push([`Status Filter: ${filters.status}`]);
  if (filters.type && filters.type !== 'all') data.push([`Type Filter: ${filters.type}`]);
  data.push([`Generated: ${formatDateTime(new Date())}`]);
  data.push(['']);

  // Table Headers
  data.push([
    'Date', 'Type', 'Invoice No', `Debit (${CURRENCY})`, `Credit (${CURRENCY})`,
    `Balance (${CURRENCY})`, 'Reference', 'Status'
  ]);

  let totalDebit = 0;
  let totalCredit = 0;

  ledger.forEach(log => {
    const isDebit = log.drCr === 'Dr' || log.type.includes('Return') || log.type.includes('Payment');
    const debitAmt = isDebit ? log.amount : 0;
    const creditAmt = !isDebit ? log.amount : 0;
    totalDebit += debitAmt;
    totalCredit += creditAmt;

    data.push([
      log.date ? new Date(log.date).toLocaleDateString('en-GB') : '-',
      log.type || '-',
      log.invNo || '-',
      debitAmt > 0 ? formatNumber(debitAmt) : '-',
      creditAmt > 0 ? formatNumber(creditAmt) : '-',
      formatNumber(log.balance),
      log.ref || '-',
      log.status || '-',
    ]);
  });

  data.push(['']);
  data.push(['TOTALS', '', '', formatNumber(totalDebit), formatNumber(totalCredit), '', '', '']);
  data.push([`Total Entries: ${ledger.length}`]);
  data.push([`Closing Balance: ${CURRENCY} ${formatNumber(vendor?.currentBalance)}`]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  applyStyles(ws, [12, 20, 18, 16, 16, 16, 18, 10]);
  XLSX.utils.book_append_sheet(wb, ws, 'Vendor Ledger');

  const safeName = vendorName.replace(/[^a-zA-Z0-9]/g, '_');
  const stamp = getFileNameDateTimeStamp();
  XLSX.writeFile(wb, `Vendor_Ledger_${safeName}_${stamp}.xlsx`);
};

/**
 * Export Customer (Credit Account) Ledger to Excel
 * Used in CustomerDetailsPage for individual customer account export
 */
export const exportCustomerLedgerExcel = (customer, ledger, filters = {}) => {
  if (!ledger || ledger.length === 0) {
    console.warn('No customer ledger entries to export');
    return;
  }

  const wb = XLSX.utils.book_new();
  const customerName = customer?.name || 'Unknown Customer';

  const data = [
    [DEFAULT_COMPANY_NAME],
    [DEFAULT_COMPANY_ADDRESS],
    [''],
    ['CUSTOMER LEDGER - CREDIT ACCOUNT (ACCOUNTS RECEIVABLE)'],
    [''],
    [`Customer: ${customerName}`],
    [`Customer ID: ${customer?.partyId || '-'}`],
    [`Outstanding Balance: ${CURRENCY} ${formatNumber(customer?.currentBalance)}`],
    [''],
  ];

  if (filters.fromDate) data.push([`From: ${filters.fromDate}`]);
  if (filters.toDate) data.push([`To: ${filters.toDate}`]);
  if (filters.status && filters.status !== 'all') data.push([`Status Filter: ${filters.status}`]);
  if (filters.type && filters.type !== 'all') data.push([`Type Filter: ${filters.type}`]);
  data.push([`Generated: ${formatDateTime(new Date())}`]);
  data.push(['']);

  // Table Headers
  data.push([
    'Date', 'Type', 'Invoice No', `Debit (${CURRENCY})`, `Credit (${CURRENCY})`,
    `Balance (${CURRENCY})`, 'Reference', 'Status'
  ]);

  let totalDebit = 0;
  let totalCredit = 0;

  ledger.forEach(log => {
    const isDebit = log.drCr === 'Dr' && !log.type.includes('Return') && !log.type.includes('Receipt');
    const isCredit = log.drCr === 'Cr' || log.type.includes('Return') || log.type.includes('Receipt');
    const debitAmt = isDebit ? log.amount : 0;
    const creditAmt = isCredit ? log.amount : 0;
    totalDebit += debitAmt;
    totalCredit += creditAmt;

    data.push([
      log.date ? new Date(log.date).toLocaleDateString('en-GB') : '-',
      log.type || '-',
      log.invNo || '-',
      debitAmt > 0 ? formatNumber(debitAmt) : '-',
      creditAmt > 0 ? formatNumber(creditAmt) : '-',
      formatNumber(log.balance),
      log.ref || '-',
      log.status || '-',
    ]);
  });

  data.push(['']);
  data.push(['TOTALS', '', '', formatNumber(totalDebit), formatNumber(totalCredit), '', '', '']);
  data.push([`Total Entries: ${ledger.length}`]);
  data.push([`Closing Balance: ${CURRENCY} ${formatNumber(customer?.currentBalance)}`]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  applyStyles(ws, [12, 20, 18, 16, 16, 16, 18, 10]);
  XLSX.utils.book_append_sheet(wb, ws, 'Customer Ledger');

  const safeName = customerName.replace(/[^a-zA-Z0-9]/g, '_');
  const stamp = getFileNameDateTimeStamp();
  XLSX.writeFile(wb, `Customer_Ledger_${safeName}_${stamp}.xlsx`);
};
