export interface PurchaseOrder {
  id: string;
  transactionNo: string;
  vendorId: string;
  vendorName: string;
  date: string;
  deliveryDate: string;
  /** DB stores lowercase via Mongoose transform. Legacy data may have mixed casing.
   *  Use normalizeTransactionStatus() from utils/statusNormalizer for comparisons. */
  status: "draft" | "approved" | "paid" | "partial" | "rejected" | "cancelled" | string;
  approvalStatus: string;
  totalAmount: string;
  items: Array<{
    itemId: string;
    description: string;
    qty: number;
    rate: number;
    taxPercent: number;
    lineTotal: number;
  }>;
  terms: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  grnGenerated: boolean;
  invoiceGenerated: boolean;
  priority: "High" | "Medium" | "Low";
  // GRN-related fields
  sourceGrnId?: string;
  sourceGrnNumber?: string;
}