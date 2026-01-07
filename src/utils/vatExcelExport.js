/**
 * VAT Report Excel Export Utility
 * Generates UAE FTA compliant VAT return Excel file
 * 
 * Output format matches official UAE VAT return filing requirements
 * Company: Najm Alhuda Foodstuff Trading Co. LLC-SOC (Dubai)
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Month names for labels
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Format date to DD-MM-YYYY string
 */
const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Format number to 2 decimal places
 */
const formatNumber = (num) => {
  if (num === null || num === undefined) return 0;
  return Number(Number(num).toFixed(2));
};

/**
 * Generate VAT Return Summary Sheet (matches UAE FTA Form VAT201)
 */
const generateVATReturnSheet = (exportData) => {
  const { companyInfo, reportInfo, vatReturnSummary, salesTotals, purchaseTotals } = exportData;
  
  const rows = [
    // Header
    [`Name of the Unit: ${companyInfo.name}`, "", `Reference No: ${reportInfo.referenceNo}`],
    [`Vat Return Period: ${reportInfo.period}`, "", ""],
    [""],
    // VAT on Sales & All Other Outputs
    ["VAT on Sales & all other outputs", "", "", ""],
    ["Sr. No.", "Description", "Amount (AED)", "VAT amount (AED)", "Adjustment (AED)", "Remarks"],
    ["1a", "Standard rated supplies in Abu Dhabi", "", "", "", "Enter supplies of goods and services made within the period subject to the standard rate of VAT and which are considered to take place in the Emirate of Abu Dhabi"],
    ["1b", "Standard rated supplies in Dubai", formatNumber(salesTotals.amountExclusive), formatNumber(salesTotals.vatAmount), "", "Enter supplies of goods and services made within the period subject to the standard rate of VAT and which are considered to take place in the Emirate of Dubai"],
    ["1c", "Standard rated supplies in Sharjah", "", "", "", "Enter supplies of goods and services made within the period subject to the standard rate of VAT and which are considered to take place in the Emirate of Sharjah"],
    ["1d", "Standard rated supplies in Ajman", "", "", "", "Enter supplies of goods and services made within the period subject to the standard rate of VAT and which are considered to take place in the Emirate of Ajman"],
    ["1e", "Standard rated supplies in Umm Al Quwain", "", "", "", "Enter Ras of goods and services made within the period subject to the standard rate of VAT and which are considered to take place At the Emirate of Qawsia"],
    ["1f", "Standard rated supplies in Ras Al Khaimah", "", "", "", "Enter Ras of goods and services made within the period subject to the standard rate of VAT and which are considered to take place At the Emirate of Khimea"],
    ["1g", "Standard rated supplies in Fujairah", "", "", "", "Enter supplies of goods and services made within the period subject to the standard rate of VAT and which are considered to take place in the Emirate of Fujairah"],
    [""],
    ["2", "Tax Refunds provided to Tourists under the Tax Refunds for Tourists Scheme", "", "", "", "Use this section only if you are a retailer and have provided Tax refunds to tourists as per the Tax Refunds for Tourists Scheme."],
    ["3", "Supplies subject to the reverse charge provisions", "", "", "", "Enter supplies of goods and services received which are subject to the reverse charge provisions, including imports of services from foreign suppliers on which you are required to account for VAT. Please disregard any imports of goods through customs which are subject to the reverse charge"],
    [""],
    ["4", "Zero rated supplies", "", "", "", "Enter supplies which is zero rated"],
    ["5", "Exempt supplies", "", "", "", "specified residential building)"],
    [""],
    ["6", "Goods imported into the UAE", "", "", "", "return. It is populated based on the amounts declared by you in your customs and Excise Tax import declarations. All goods here are at 5%. So make adjustment in box 7 if any of these are at zero rate"],
    ["7", "Adjustments to goods imported into the UAE", "", "", "", "incomplete or incorrect. The amounts of adjustments and additions included into this box could be positive or negative, and you should be able to justify them."],
    ["8", "Totals", formatNumber(salesTotals.amountExclusive), formatNumber(salesTotals.vatAmount), "", ""],
    [""],
    // VAT on Expenses & All Other Inputs
    ["VAT on Expenses and All Other Inputs", "", "", ""],
    ["9", "Standard rated expenses", formatNumber(purchaseTotals.amountExclusive), formatNumber(purchaseTotals.vatAmount), "", "With respect to the VAT amount, please enter the amounts of recoverable VAT only, in case your ability to recover input tax is restricted."],
    ["10", "Supplies subject to the reverse charge provisions", "", "", "", "Enter any expenses which were subject to the reverse charge for which you would like to recover input tax. With respect to the VAT amount, please enter the amounts of recoverable VAT only, in"],
    ["11", "Totals", formatNumber(purchaseTotals.amountExclusive), formatNumber(purchaseTotals.vatAmount), "", ""],
    [""],
    // Net VAT Due
    ["Net VAT Due", "", "", ""],
    ["12", "Total value of due tax for the period", formatNumber(salesTotals.amountExclusive), formatNumber(salesTotals.vatAmount), "", ""],
    ["13", "Total value of recoverable tax for the period", `(${formatNumber(purchaseTotals.amountExclusive)})`, `(${formatNumber(purchaseTotals.vatAmount)})`, "", ""],
    ["14", "Payable/(refund) tax for the period", formatNumber(salesTotals.amountExclusive - purchaseTotals.amountExclusive), formatNumber(salesTotals.vatAmount - purchaseTotals.vatAmount), "", ""],
    [""],
    // Declaration
    ["DECLARATION", "", "", ""],
    ["I declare that all information provided is true, accurate and complete to the best of my knowledge and belief.", "", "", ""],
  ];

  return rows;
};

/**
 * Generate Sales Sheet
 */
const generateSalesSheet = (exportData) => {
  const { companyInfo, reportInfo, salesSheet, salesTotals } = exportData;
  
  const headerRows = [
    ["", "", "", "", "", "", "", "", "", "", ""],
    ["", "", `COMPANY NAME :${companyInfo.name}`, "", "", "", "", "", "", "", ""],
    ["", "", "VAT RETURN FILING PERIOD", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", "", "", ""],
    ["", "", "", "PURCHASE AND EXPENSES DETAILS", "", "", "", "", "", "", ""],
    [""],
    // Column Headers
    ["S.N", "Tax Invoice No.", "Tax Invoice date", "Customer Name", "Customer TRN", "Invoice Description", "Amount Exclusive", "VAT Rate", "VAT AMOUNT", "Grand Total", ""],
  ];

  // Data rows
  const dataRows = salesSheet.map((item, idx) => [
    idx + 1,
    item.taxInvoiceNo || "",
    formatDate(item.taxInvoiceDate),
    item.customerName || "",
    item.customerTRN || "",
    item.invoiceDescription || "Sales Invoice",
    formatNumber(item.amountExclusive),
    "5% STD",
    formatNumber(item.vatAmount),
    formatNumber(item.grandTotal),
    "",
  ]);

  // Totals row
  const totalsRow = [
    "Totals",
    "", "", "", "", "",
    formatNumber(salesTotals.amountExclusive),
    "-",
    formatNumber(salesTotals.vatAmount),
    formatNumber(salesTotals.grandTotal),
    "",
  ];

  return [...headerRows, ...dataRows, totalsRow];
};

/**
 * Generate Purchase Sheet
 */
const generatePurchaseSheet = (exportData) => {
  const { companyInfo, reportInfo, purchaseSheet, purchaseTotals } = exportData;
  
  const headerRows = [
    ["", "", "", "", "", "", "", "", "", "", ""],
    ["", "", `COMPANY NAME :${companyInfo.name}`, "", "", "", "", "", "", "", ""],
    ["", "", "VAT RETURN FILING PERIOD", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", "", "", ""],
    ["", "", "", "PURCHASE AND EXPENSES DETAILS", "", "", "", "", "", "", ""],
    [""],
    // Column Headers
    ["S.N", "Tax Invoice No.", "Tax Invoice date", "Vendor Name", "Vendor TRN", "Invoice Description", "Amount Exclusive", "VAT Rate", "VAT AMOUNT", "Grand Total", ""],
  ];

  // Data rows
  const dataRows = purchaseSheet.map((item, idx) => [
    idx + 1,
    item.taxInvoiceNo || "",
    formatDate(item.taxInvoiceDate),
    item.vendorName || "",
    item.vendorTRN || "",
    item.invoiceDescription || "Goods",
    formatNumber(item.amountExclusive),
    "5% STD",
    formatNumber(item.vatAmount),
    formatNumber(item.grandTotal),
    "",
  ]);

  // Totals row
  const totalsRow = [
    "Totals",
    "", "", "", "", "",
    formatNumber(purchaseTotals.amountExclusive),
    "-",
    formatNumber(purchaseTotals.vatAmount),
    formatNumber(purchaseTotals.grandTotal),
    "",
  ];

  return [...headerRows, ...dataRows, totalsRow];
};

/**
 * Apply styling to worksheet
 */
const applyWorksheetStyling = (ws, sheetType) => {
  // Set column widths
  const colWidths = {
    'Vat Return': [{ wch: 5 }, { wch: 45 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 80 }],
    'Sales': [{ wch: 5 }, { wch: 18 }, { wch: 12 }, { wch: 35 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 5 }],
    'Purchase': [{ wch: 5 }, { wch: 18 }, { wch: 12 }, { wch: 35 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 5 }],
  };
  
  ws['!cols'] = colWidths[sheetType] || colWidths['Sales'];
  
  return ws;
};

/**
 * Generate and download VAT Report Excel file
 * @param {Object} exportData - Data from VAT report export API
 * @returns {Promise<void>}
 */
export const generateVATReportExcel = async (exportData) => {
  try {
    if (!exportData) {
      throw new Error("No export data provided");
    }

    const { reportInfo, salesSheet, purchaseSheet } = exportData;
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // 1. Generate Sales Sheet
    const salesData = generateSalesSheet(exportData);
    const salesWs = XLSX.utils.aoa_to_sheet(salesData);
    applyWorksheetStyling(salesWs, 'Sales');
    XLSX.utils.book_append_sheet(wb, salesWs, "Sales");
    
    // 2. Generate Purchase Sheet
    const purchaseData = generatePurchaseSheet(exportData);
    const purchaseWs = XLSX.utils.aoa_to_sheet(purchaseData);
    applyWorksheetStyling(purchaseWs, 'Purchase');
    XLSX.utils.book_append_sheet(wb, purchaseWs, "Purchase");
    
    // 3. Generate VAT Return Summary Sheet
    const vatReturnData = generateVATReturnSheet(exportData);
    const vatReturnWs = XLSX.utils.aoa_to_sheet(vatReturnData);
    applyWorksheetStyling(vatReturnWs, 'Vat Return');
    XLSX.utils.book_append_sheet(wb, vatReturnWs, "Vat Return");
    
    // Generate filename
    const period = reportInfo.period?.replace(/\s/g, '_') || 'Report';
    const year = reportInfo.year || new Date().getFullYear();
    const fileName = `VAT_Report_${period}_${year}.xlsx`;
    
    // Write and download
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, fileName);
    
    return { success: true, fileName };
  } catch (error) {
    console.error("[VAT Excel Export] Error:", error);
    throw error;
  }
};

/**
 * Generate filename for VAT report
 * @param {Object} reportInfo - Report information
 * @returns {String} Formatted filename
 */
export const getVATReportFileName = (reportInfo) => {
  const period = reportInfo?.period?.replace(/\s/g, '_') || 'Report';
  const year = reportInfo?.year || new Date().getFullYear();
  return `VAT_Report_${period}_${year}.xlsx`;
};

export default {
  generateVATReportExcel,
  getVATReportFileName,
};
