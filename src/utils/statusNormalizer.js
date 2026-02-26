/**
 * Status Normalization Utility for Trade ERP Nexus (Frontend)
 * ============================================================
 * 
 * PRODUCTION SAFETY: This module provides a mapping layer for status values
 * WITHOUT modifying any existing database records.
 * 
 * The Transaction model stores statuses in lowercase (via Mongoose lowercase: true).
 * The GRN model stores statuses in UPPERCASE (no transform).
 * Legacy data may have mixed casing.
 * 
 * All frontend comparisons should use these helpers to ensure consistency.
 * Display functions return UPPERCASE for UI presentation.
 */

// ─── CANONICAL STATUS DEFINITIONS ───

/**
 * Transaction (PO / SO / Purchase Entry) canonical statuses.
 * DB stores lowercase. We normalize to lowercase for comparisons,
 * and provide UPPERCASE display versions.
 */
export const TRANSACTION_STATUS = Object.freeze({
  DRAFT: "draft",
  APPROVED: "approved",
  PAID: "paid",
  PARTIAL: "partial",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
});

/**
 * GRN canonical statuses (stored UPPERCASE in DB).
 */
export const GRN_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  RECEIVED: "RECEIVED",
  CONVERTED: "CONVERTED",
  CANCELLED: "CANCELLED",
});

// ─── LEGACY MAPPING ───

const TRANSACTION_STATUS_MAP = Object.freeze({
  draft: TRANSACTION_STATUS.DRAFT,
  pending: TRANSACTION_STATUS.DRAFT,
  new: TRANSACTION_STATUS.DRAFT,
  approved: TRANSACTION_STATUS.APPROVED,
  approve: TRANSACTION_STATUS.APPROVED,
  invoicecreated: TRANSACTION_STATUS.APPROVED,
  paid: TRANSACTION_STATUS.PAID,
  payment_done: TRANSACTION_STATUS.PAID,
  fully_paid: TRANSACTION_STATUS.PAID,
  partial: TRANSACTION_STATUS.PARTIAL,
  partially_paid: TRANSACTION_STATUS.PARTIAL,
  partial_payment: TRANSACTION_STATUS.PARTIAL,
  partial_grn: TRANSACTION_STATUS.PARTIAL,
  rejected: TRANSACTION_STATUS.REJECTED,
  reject: TRANSACTION_STATUS.REJECTED,
  cancelled: TRANSACTION_STATUS.CANCELLED,
  canceled: TRANSACTION_STATUS.CANCELLED,
  cancel: TRANSACTION_STATUS.CANCELLED,
  void: TRANSACTION_STATUS.CANCELLED,
});

const GRN_STATUS_MAP = Object.freeze({
  draft: GRN_STATUS.DRAFT,
  received: GRN_STATUS.RECEIVED,
  grn_completed: GRN_STATUS.RECEIVED,
  converted: GRN_STATUS.CONVERTED,
  cancelled: GRN_STATUS.CANCELLED,
  canceled: GRN_STATUS.CANCELLED,
});

// ─── NORMALIZATION FUNCTIONS ───

/**
 * Normalize a transaction status to its canonical lowercase form.
 * Safe for legacy data — unknown statuses are returned as-is (lowercased).
 * 
 * @param {string} status - Raw status from API or state
 * @returns {string} Canonical lowercase status
 */
export function normalizeTransactionStatus(status) {
  if (!status || typeof status !== "string") return TRANSACTION_STATUS.DRAFT;
  const key = status.toLowerCase().trim();
  return TRANSACTION_STATUS_MAP[key] || key;
}

/**
 * Normalize a GRN status to its canonical UPPERCASE form.
 * 
 * @param {string} status - Raw status from API or state
 * @returns {string} Canonical UPPERCASE status
 */
export function normalizeGRNStatus(status) {
  if (!status || typeof status !== "string") return GRN_STATUS.DRAFT;
  const key = status.toLowerCase().trim();
  return GRN_STATUS_MAP[key] || status.toUpperCase().trim();
}

/**
 * Compare a raw status against a canonical transaction status (case-insensitive).
 */
export function isTransactionStatus(rawStatus, canonicalStatus) {
  return normalizeTransactionStatus(rawStatus) === canonicalStatus;
}

/**
 * Compare a raw status against a canonical GRN status (case-insensitive).
 */
export function isGRNStatus(rawStatus, canonicalStatus) {
  return normalizeGRNStatus(rawStatus) === canonicalStatus;
}

/**
 * Check if a transaction status indicates it has been processed.
 */
export function isTransactionProcessed(status) {
  const normalized = normalizeTransactionStatus(status);
  return [
    TRANSACTION_STATUS.APPROVED,
    TRANSACTION_STATUS.PAID,
    TRANSACTION_STATUS.PARTIAL,
    TRANSACTION_STATUS.REJECTED,
    TRANSACTION_STATUS.CANCELLED,
  ].includes(normalized);
}

/**
 * Check if a transaction is in an "invoice" status (approved/paid/partial).
 * These appear in Purchase Entry view, not in Purchase Order list.
 */
export function isInvoiceStatus(status) {
  const normalized = normalizeTransactionStatus(status);
  return [
    TRANSACTION_STATUS.APPROVED,
    TRANSACTION_STATUS.PAID,
    TRANSACTION_STATUS.PARTIAL,
  ].includes(normalized);
}

/**
 * Check if a transaction is in a "purchase order" status.
 * These appear in Purchase Order list view.
 */
export function isPurchaseOrderStatus(status) {
  return !isInvoiceStatus(status);
}

/**
 * Get display-friendly UPPERCASE version of a transaction status.
 * Used for UI elements (badges, labels, etc.)
 * 
 * @param {string} status - Raw status
 * @returns {string} Display status in UPPERCASE
 */
export function getDisplayStatus(status) {
  return normalizeTransactionStatus(status).toUpperCase();
}

/**
 * Get status color classes for transaction (PO) statuses.
 * Uses normalized status for matching, so works with any casing.
 * 
 * @param {string} rawStatus - Raw status from data
 * @returns {string} Tailwind CSS classes
 */
export function getTransactionStatusColor(rawStatus) {
  const status = normalizeTransactionStatus(rawStatus);
  switch (status) {
    case TRANSACTION_STATUS.DRAFT:
      return "bg-slate-100 text-slate-700 border-slate-200";
    case TRANSACTION_STATUS.APPROVED:
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case TRANSACTION_STATUS.PAID:
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case TRANSACTION_STATUS.PARTIAL:
      return "bg-orange-100 text-orange-700 border-orange-200";
    case TRANSACTION_STATUS.REJECTED:
      return "bg-rose-100 text-rose-700 border-rose-200";
    case TRANSACTION_STATUS.CANCELLED:
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

/**
 * Get status color classes for GRN statuses.
 * 
 * @param {string} rawStatus - Raw status from data
 * @returns {string} Tailwind CSS classes
 */
export function getGRNStatusColor(rawStatus) {
  const status = normalizeGRNStatus(rawStatus);
  switch (status) {
    case GRN_STATUS.RECEIVED:
      return "bg-blue-100 text-blue-700 border-blue-200";
    case GRN_STATUS.CONVERTED:
      return "bg-green-100 text-green-700 border-green-200";
    case GRN_STATUS.CANCELLED:
      return "bg-red-100 text-red-700 border-red-200";
    case GRN_STATUS.DRAFT:
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

/**
 * Get payment status display text.
 * 
 * @param {number} paidAmount 
 * @param {number} totalAmount 
 * @returns {string} "PAID" | "PARTIAL" | "UNPAID"
 */
export function getPaymentStatus(paidAmount, totalAmount) {
  const paid = Number(paidAmount) || 0;
  const total = Number(totalAmount) || 0;
  if (total <= 0) return "PAID";
  if (paid >= total) return "PAID";
  if (paid > 0) return "PARTIAL";
  return "UNPAID";
}
