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
