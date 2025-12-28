import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export Trial Balance Report to PDF
 */
export const exportTrialBalancePDF = (report) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  doc.setFontSize(16);
  doc.text('Trial Balance Report', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(10);
  doc.text(`Period: ${report.dateRange?.label || 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;

  // Filter accounts with balances
  const filteredAccounts = report.accounts.filter(
    (a) => Math.abs(a.debitBalance || 0) > 0.01 || Math.abs(a.creditBalance || 0) > 0.01
  );

  // Table data
  const tableData = filteredAccounts.map((account) => [
    account.accountCode || '-',
    account.accountName,
    account.accountType,
    (account.debitBalance || 0).toFixed(2),
    (account.creditBalance || 0).toFixed(2),
  ]);

  // Add totals row
  tableData.push([
    'TOTAL',
    '',
    '',
    (report.totals?.totalDebit || 0).toFixed(2),
    (report.totals?.totalCredit || 0).toFixed(2),
  ]);

  // Generate table using autoTable
  autoTable(doc, {
    head: [['Code', 'Account Name', 'Type', 'Debit (AED)', 'Credit (AED)']],
    body: tableData,
    startY: yPosition,
    headStyles: { fillColor: [33, 150, 243], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
  });

  // Add status footer
  yPosition = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(10);
  const isBalanced = report.totals?.isBalanced;
  const statusText = isBalanced ? 'Trial Balance OK' : 'Out of Balance';
  const statusColor = isBalanced ? [76, 175, 80] : [255, 152, 0];
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(statusText, pageWidth / 2, yPosition, { align: 'center' });

  // Save PDF
  doc.save(`Trial_Balance_${report.year}${report.month ? `_${report.month}` : ''}.pdf`);
};

/**
 * Export Profit & Loss Report to PDF
 */
export const exportProfitLossPDF = (report) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Header
  doc.setFontSize(16);
  doc.text('Profit & Loss Account', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 10;
  doc.setFontSize(10);
  doc.text(`Period: ${report.dateRange?.label || 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 8;
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;

  // Revenue Section
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('REVENUE', 20, yPosition);

  yPosition += 8;
  const revenueData = report.revenue?.items?.map((item) => [
    item.accountCode || '-',
    item.accountName,
    (item.amount || 0).toFixed(2),
  ]) || [];

  autoTable(doc, {
    head: [['Code', 'Account', 'Amount (AED)']],
    body: revenueData.length > 0 ? revenueData : [['N/A', 'No revenue items', '0.00']],
    startY: yPosition,
    headStyles: { fillColor: [76, 175, 80], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      2: { halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  });

  yPosition = doc.lastAutoTable.finalY + 5;
  doc.setFont(undefined, 'bold');
  doc.text(`Total Revenue: AED ${(report.revenue?.total || 0).toFixed(2)}`, 20, yPosition);

  yPosition += 15;

  // Expenses Section
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('EXPENSES', 20, yPosition);

  yPosition += 8;
  const expenseData = report.expenses?.items?.map((item) => [
    item.accountCode || '-',
    item.accountName,
    (item.amount || 0).toFixed(2),
  ]) || [];

  autoTable(doc, {
    head: [['Code', 'Account', 'Amount (AED)']],
    body: expenseData.length > 0 ? expenseData : [['N/A', 'No expense items', '0.00']],
    startY: yPosition,
    headStyles: { fillColor: [244, 67, 54], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      2: { halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  });

  yPosition = doc.lastAutoTable.finalY + 5;
  doc.setFont(undefined, 'bold');
  doc.text(`Total Expenses: AED ${(report.expenses?.total || 0).toFixed(2)}`, 20, yPosition);

  yPosition += 15;

  // Summary Section
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  const isProfitable = report.summary?.netProfit >= 0;
  const netProfitColor = isProfitable ? [76, 175, 80] : [244, 67, 54];
  doc.setTextColor(netProfitColor[0], netProfitColor[1], netProfitColor[2]);
  
  doc.text(
    `Net ${isProfitable ? 'Profit' : 'Loss'}: AED ${Math.abs(report.summary?.netProfit || 0).toFixed(2)}`,
    20,
    yPosition
  );

  yPosition += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  doc.text(`Profit Margin: ${(report.summary?.profitMargin || 0).toFixed(2)}%`, 20, yPosition);

  // Save PDF
  doc.save(`Profit_Loss_${report.year}${report.month ? `_${report.month}` : ''}.pdf`);
};

/**
 * Export Balance Sheet Report to PDF
 */
export const exportBalanceSheetPDF = (report) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Header
  doc.setFontSize(16);
  doc.text('Balance Sheet', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 10;
  doc.setFontSize(10);
  doc.text(`Period: ${report.dateRange?.label || 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 8;
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;

  // Assets Section
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('ASSETS', 20, yPosition);

  yPosition += 8;
  // Support both 'net' (old) and 'items' (new) structure
  const assetsItems = report.assets?.items || report.assets?.net || [];
  const assetsData = assetsItems.map((item) => [
    item.accountCode || '-',
    item.accountName,
    (item.balance || 0).toFixed(2),
  ]);

  autoTable(doc, {
    head: [['Code', 'Account', 'Amount (AED)']],
    body: assetsData.length > 0 ? assetsData : [['N/A', 'No assets', '0.00']],
    startY: yPosition,
    headStyles: { fillColor: [33, 150, 243], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      2: { halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  });

  yPosition = doc.lastAutoTable.finalY + 5;
  doc.setFont(undefined, 'bold');
  doc.text(`Total Assets: AED ${(report.summary?.totalAssets || 0).toFixed(2)}`, 20, yPosition);

  yPosition += 15;

  // Liabilities Section
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('LIABILITIES', 20, yPosition);

  yPosition += 8;
  const liabilitiesData = report.liabilities?.items?.map((item) => [
    item.accountCode || '-',
    item.accountName,
    (item.balance || 0).toFixed(2),
  ]) || [];

  autoTable(doc, {
    head: [['Code', 'Account', 'Amount (AED)']],
    body: liabilitiesData.length > 0 ? liabilitiesData : [['N/A', 'No liabilities', '0.00']],
    startY: yPosition,
    headStyles: { fillColor: [255, 152, 0], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      2: { halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  });

  yPosition = doc.lastAutoTable.finalY + 5;
  doc.setFont(undefined, 'bold');
  doc.text(`Total Liabilities: AED ${(report.summary?.totalLiabilities || 0).toFixed(2)}`, 20, yPosition);

  yPosition += 15;

  // Equity Section
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('EQUITY', 20, yPosition);

  yPosition += 8;
  const equityData = report.equity?.items?.map((item) => [
    item.accountCode || '-',
    item.accountName,
    (item.balance || 0).toFixed(2),
  ]) || [];

  autoTable(doc, {
    head: [['Code', 'Account', 'Amount (AED)']],
    body: equityData.length > 0 ? equityData : [['N/A', 'No equity', '0.00']],
    startY: yPosition,
    headStyles: { fillColor: [156, 39, 176], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      2: { halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  });

  yPosition = doc.lastAutoTable.finalY + 5;
  doc.setFont(undefined, 'bold');
  doc.text(`Total Equity: AED ${(report.summary?.totalEquity || 0).toFixed(2)}`, 20, yPosition);

  yPosition += 15;

  // Status
  doc.setFontSize(10);
  const isBalanced = report.summary?.isBalanced;
  const statusText = isBalanced ? 'Balance Sheet Balanced' : 'Out of Balance';
  const statusColor = isBalanced ? [76, 175, 80] : [255, 152, 0];
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(statusText, pageWidth / 2, yPosition, { align: 'center' });

  // Save PDF
  doc.save(`Balance_Sheet_${report.year}${report.month ? `_${report.month}` : ''}.pdf`);
};
