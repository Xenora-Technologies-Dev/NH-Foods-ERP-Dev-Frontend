import * as XLSX from 'xlsx';

// Default company details - will be overridden by report data
const DEFAULT_COMPANY_NAME = 'NH FOODSTUFF TRADING LLC S.O.C.';
const DEFAULT_COMPANY_ADDRESS = 'Dubai, United Arab Emirates';
const CURRENCY = 'AED';

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
 * Format number with 2 decimal places
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
  
  // Generate filename with date
  const filename = `${companyName.replace(/\s+/g, '_')}_Trial_Balance_${report.year}${report.month ? `_${String(report.month).padStart(2, '0')}` : ''}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  
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
  const filename = `${companyName.replace(/\s+/g, '_')}_Profit_Loss_${report.year}${report.month ? `_${String(report.month).padStart(2, '0')}` : ''}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  
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
  const filename = `${companyName.replace(/\s+/g, '_')}_Balance_Sheet_${report.year}${report.month ? `_${String(report.month).padStart(2, '0')}` : ''}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  
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
  
  // Detailed sheet with all items
  const detailedData = [];
  salesOrders.forEach((so) => {
    if (Array.isArray(so.items) && so.items.length > 0) {
      so.items.forEach((item, idx) => {
        detailedData.push({
          'SO Number': idx === 0 ? (so.orderNumber || so.transactionNo || '-') : '',
          'Customer': idx === 0 ? (so.customerName || so.partyName || '-') : '',
          'Date': idx === 0 ? (so.date ? new Date(so.date).toLocaleDateString() : '-') : '',
          'Status': idx === 0 ? (so.status || '-') : '',
          'Item Name': item.description || item.itemName || item.name || '-',
          'Item Qty': item.quantity ? String(item.quantity) : '0',
          'Unit Price': item.price ? String(item.price) : '0',
          'Item Total': item.total ? String(item.total) : String((item.quantity || 0) * (item.price || 0)),
          'UOM': item.uom || item.unit || '-',
          'Item Description': item.notes || item.remarks || '-',
        });
      });
    } else {
      detailedData.push({
        'SO Number': so.orderNumber || so.transactionNo || '-',
        'Customer': so.customerName || so.partyName || '-',
        'Date': so.date ? new Date(so.date).toLocaleDateString() : '-',
        'Status': so.status || '-',
        'Item Name': 'No items',
        'Item Qty': '0',
        'Unit Price': '0',
        'Item Total': '0',
        'UOM': '-',
        'Item Description': '-',
      });
    }
  });

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  const detailedWs = XLSX.utils.json_to_sheet(detailedData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
  XLSX.utils.book_append_sheet(wb, detailedWs, 'Items Detail');

  const timestamp = new Date().toISOString().split('T')[0];
  const fullFileName = `${fileName}_${timestamp}.xlsx`;
  XLSX.writeFile(wb, fullFileName);
};

/**
 * Export Sales Invoice data to Excel with complete item details
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
    'Total Amount': invoice.totalAmount ? String(invoice.totalAmount) : '-',
    'Paid Amount': invoice.paidAmount ? String(invoice.paidAmount) : '0',
    'Outstanding': invoice.outstandingAmount ? String(invoice.outstandingAmount) : String((invoice.totalAmount || 0) - (invoice.paidAmount || 0)),
    'Items Count': Array.isArray(invoice.items) ? invoice.items.length : 0,
    'Terms': invoice.terms || '-',
    'Created By': invoice.createdBy || '-',
  }));
  
  // Detailed sheet with all items
  const detailedData = [];
  salesInvoices.forEach((invoice) => {
    if (Array.isArray(invoice.items) && invoice.items.length > 0) {
      invoice.items.forEach((item, idx) => {
        detailedData.push({
          'Invoice Number': idx === 0 ? (invoice.transactionNo || '-') : '',
          'Customer': idx === 0 ? (invoice.customerName || invoice.partyName || '-') : '',
          'Invoice Date': idx === 0 ? (invoice.date ? new Date(invoice.date).toLocaleDateString() : '-') : '',
          'Status': idx === 0 ? (invoice.status || '-') : '',
          'Item Name': item.description || item.itemName || item.name || '-',
          'Item Qty': item.quantity ? String(item.quantity) : '0',
          'Unit Price': item.price ? String(item.price) : '0',
          'Item Total': item.total ? String(item.total) : String((item.quantity || 0) * (item.price || 0)),
          'UOM': item.uom || item.unit || '-',
          'Item Description': item.notes || item.remarks || '-',
        });
      });
    } else {
      detailedData.push({
        'Invoice Number': invoice.transactionNo || '-',
        'Customer': invoice.customerName || invoice.partyName || '-',
        'Invoice Date': invoice.date ? new Date(invoice.date).toLocaleDateString() : '-',
        'Status': invoice.status || '-',
        'Item Name': 'No items',
        'Item Qty': '0',
        'Unit Price': '0',
        'Item Total': '0',
        'UOM': '-',
        'Item Description': '-',
      });
    }
  });

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  const detailedWs = XLSX.utils.json_to_sheet(detailedData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
  XLSX.utils.book_append_sheet(wb, detailedWs, 'Items Detail');

  const timestamp = new Date().toISOString().split('T')[0];
  const fullFileName = `${fileName}_${timestamp}.xlsx`;
  XLSX.writeFile(wb, fullFileName);
};

/**
 * Export Purchase Order data to Excel with complete item details
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
  
  // Detailed sheet with all items
  const detailedData = [];
  purchaseOrders.forEach((po) => {
    if (Array.isArray(po.items) && po.items.length > 0) {
      po.items.forEach((item, idx) => {
        detailedData.push({
          'PO Number': idx === 0 ? (po.orderNumber || po.transactionNo || '-') : '',
          'Vendor': idx === 0 ? (po.vendorName || po.partyName || '-') : '',
          'Date': idx === 0 ? (po.date ? new Date(po.date).toLocaleDateString() : '-') : '',
          'Status': idx === 0 ? (po.status || '-') : '',
          'Item Name': item.description || item.itemName || item.name || '-',
          'Item Qty': item.quantity ? String(item.quantity) : '0',
          'Unit Price': item.price ? String(item.price) : '0',
          'Item Total': item.total ? String(item.total) : String((item.quantity || 0) * (item.price || 0)),
          'UOM': item.uom || item.unit || '-',
          'Item Description': item.notes || item.remarks || '-',
        });
      });
    } else {
      detailedData.push({
        'PO Number': po.orderNumber || po.transactionNo || '-',
        'Vendor': po.vendorName || po.partyName || '-',
        'Date': po.date ? new Date(po.date).toLocaleDateString() : '-',
        'Status': po.status || '-',
        'Item Name': 'No items',
        'Item Qty': '0',
        'Unit Price': '0',
        'Item Total': '0',
        'UOM': '-',
        'Item Description': '-',
      });
    }
  });

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  const detailedWs = XLSX.utils.json_to_sheet(detailedData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
  XLSX.utils.book_append_sheet(wb, detailedWs, 'Items Detail');

  const timestamp = new Date().toISOString().split('T')[0];
  const fullFileName = `${fileName}_${timestamp}.xlsx`;
  XLSX.writeFile(wb, fullFileName);
};

/**
 * Export Purchase Entry (Invoices) data to Excel with complete item details
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
    'Total Amount': invoice.totalAmount ? String(invoice.totalAmount) : '-',
    'Paid Amount': invoice.paidAmount ? String(invoice.paidAmount) : '0',
    'Outstanding': invoice.outstandingAmount ? String(invoice.outstandingAmount) : String((invoice.totalAmount || 0) - (invoice.paidAmount || 0)),
    'Items Count': Array.isArray(invoice.items) ? invoice.items.length : 0,
    'Terms': invoice.terms || '-',
    'Created By': invoice.createdBy || '-',
  }));
  
  // Detailed sheet with all items
  const detailedData = [];
  purchaseInvoices.forEach((invoice) => {
    if (Array.isArray(invoice.items) && invoice.items.length > 0) {
      invoice.items.forEach((item, idx) => {
        detailedData.push({
          'Invoice Number': idx === 0 ? (invoice.transactionNo || '-') : '',
          'Vendor': idx === 0 ? (invoice.vendorName || invoice.partyName || '-') : '',
          'Invoice Date': idx === 0 ? (invoice.date ? new Date(invoice.date).toLocaleDateString() : '-') : '',
          'Status': idx === 0 ? (invoice.status || '-') : '',
          'Item Name': item.description || item.itemName || item.name || '-',
          'Item Qty': item.quantity ? String(item.quantity) : '0',
          'Unit Price': item.price ? String(item.price) : '0',
          'Item Total': item.total ? String(item.total) : String((item.quantity || 0) * (item.price || 0)),
          'UOM': item.uom || item.unit || '-',
          'Item Description': item.notes || item.remarks || '-',
        });
      });
    } else {
      detailedData.push({
        'Invoice Number': invoice.transactionNo || '-',
        'Vendor': invoice.vendorName || invoice.partyName || '-',
        'Invoice Date': invoice.date ? new Date(invoice.date).toLocaleDateString() : '-',
        'Status': invoice.status || '-',
        'Item Name': 'No items',
        'Item Qty': '0',
        'Unit Price': '0',
        'Item Total': '0',
        'UOM': '-',
        'Item Description': '-',
      });
    }
  });

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  const detailedWs = XLSX.utils.json_to_sheet(detailedData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
  XLSX.utils.book_append_sheet(wb, detailedWs, 'Items Detail');

  const timestamp = new Date().toISOString().split('T')[0];
  const fullFileName = `${fileName}_${timestamp}.xlsx`;
  XLSX.writeFile(wb, fullFileName);
};
