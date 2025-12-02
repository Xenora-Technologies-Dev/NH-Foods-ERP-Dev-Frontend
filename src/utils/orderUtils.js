// Helper utilities for building order payloads according to the order-numbering contract
export function buildOrderPayload({ formData = {}, type, manual = false, items = [], totalAmount = 0, extras = {} }) {
  // Base payload always contains type
  const base = {
    type,
    ...extras,
    items,
    totalAmount,
  };

  if (type === "sales_order") {
    // Sales orders: manual -> send orderNumber only. auto -> omit both orderNumber and transactionNo
    if (manual) {
      if (formData.transactionNo) {
        base.orderNumber = formData.transactionNo;
      }
      // Backend will set transactionNo = "0000"
    }
    // Do not send transactionNo from frontend for sales (backend manages invoice numbers)
  } else if (type === "purchase_order") {
    // Purchase orders: manual -> send transactionNo. auto -> omit transactionNo so backend generates
    if (manual) {
      if (formData.transactionNo) base.transactionNo = formData.transactionNo;
    }
  }

  return base;
}

export function createApproveBody() {
  return { action: "approve" };
}
