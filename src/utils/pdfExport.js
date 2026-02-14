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

/**
 * Export Item Profitability Report to PDF
 */
export const exportItemProfitabilityPDF = (report) => {
  const doc = new jsPDF('l', 'mm', 'a4'); // landscape for wide table
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 15;

  // Company Header
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('NH FOODSTUFF TRADING LLC S.O.C.', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text('Dubai, UAE', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 10;
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('ITEM PROFITABILITY ANALYSIS REPORT', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 8;
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text(`Period: ${report.dateRange?.label || 'All Time'}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 5;
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 8;

  // Summary
  const summary = report.summary || {};
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Summary:', 14, yPosition);
  yPosition += 5;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  const summaryText = [
    `Total Items: ${summary.totalItems || 0}`,
    `Profitable: ${summary.profitableItems || 0}`,
    `Loss: ${summary.lossItems || 0}`,
    `Total Purchase: AED ${(summary.totalPurchaseValue || 0).toFixed(2)}`,
    `Total Sales: AED ${(summary.totalSalesValue || 0).toFixed(2)}`,
    `Net Profit/Loss: AED ${(summary.totalProfit || 0).toFixed(2)} (${(summary.overallProfitPercentage || 0).toFixed(2)}%)`,
  ];
  doc.text(summaryText.join('   |   '), 14, yPosition);

  yPosition += 8;

  // Table data
  const items = report.items || [];
  const tableData = items.map((item) => [
    item.itemCode || '-',
    item.itemName || '-',
    item.category || '-',
    item.uom || '-',
    (item.purchaseQty || 0).toString(),
    (item.salesQty || 0).toString(),
    (item.avgPurchasePrice || 0).toFixed(2),
    (item.avgSalesPrice || 0).toFixed(2),
    (item.totalPurchaseValue || 0).toFixed(2),
    (item.totalSalesValue || 0).toFixed(2),
    (item.profitLoss || 0).toFixed(2),
    `${(item.profitPercentage || 0).toFixed(2)}%`,
    item.isProfitable ? 'PROFIT' : 'LOSS',
  ]);

  autoTable(doc, {
    head: [[
      'Code', 'Item Name', 'Category', 'UOM',
      'Pur Qty', 'Sales Qty',
      'Avg Pur', 'Avg Sales',
      'Total Pur', 'Total Sales',
      'P/L (AED)', 'Margin %', 'Status',
    ]],
    body: tableData,
    startY: yPosition,
    headStyles: {
      fillColor: [79, 70, 229], // indigo
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7,
    },
    bodyStyles: {
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: [245, 245, 255] },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 35 },
      2: { cellWidth: 20 },
      3: { cellWidth: 12, halign: 'center' },
      4: { halign: 'right', cellWidth: 16 },
      5: { halign: 'right', cellWidth: 16 },
      6: { halign: 'right', cellWidth: 18 },
      7: { halign: 'right', cellWidth: 18 },
      8: { halign: 'right', cellWidth: 22 },
      9: { halign: 'right', cellWidth: 22 },
      10: { halign: 'right', cellWidth: 20 },
      11: { halign: 'right', cellWidth: 16 },
      12: { halign: 'center', cellWidth: 16 },
    },
    margin: { top: 10, right: 8, bottom: 10, left: 8 },
    didParseCell: function (data) {
      if (data.section === 'body') {
        // Color profit/loss column
        if (data.column.index === 10) {
          const val = parseFloat(data.cell.raw) || 0;
          data.cell.styles.textColor = val >= 0 ? [22, 163, 74] : [220, 38, 38]; // green/red
          data.cell.styles.fontStyle = 'bold';
        }
        // Color margin % column
        if (data.column.index === 11) {
          const val = parseFloat(data.cell.raw) || 0;
          data.cell.styles.textColor = val >= 0 ? [22, 163, 74] : [220, 38, 38];
        }
        // Color status column
        if (data.column.index === 12) {
          const isProfit = data.cell.raw === 'PROFIT';
          data.cell.styles.textColor = isProfit ? [22, 163, 74] : [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // Generate filename with date-time stamp
  const now = new Date();
  const dateTimeStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  doc.save(`Item_Profitability_Report_${dateTimeStamp}.pdf`);
};
