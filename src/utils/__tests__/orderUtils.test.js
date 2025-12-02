import { describe, it, expect } from 'vitest';
import { buildOrderPayload, createApproveBody } from '../orderUtils';

describe('orderUtils.buildOrderPayload', () => {
  it('sales-auto: omits orderNumber and transactionNo', () => {
    const formData = { transactionNo: 'SO123' };
    const payload = buildOrderPayload({ formData, type: 'sales_order', manual: false, items: [], totalAmount: 0 });
    expect(payload.type).toBe('sales_order');
    expect(payload.orderNumber).toBeUndefined();
    expect(payload.transactionNo).toBeUndefined();
  });

  it('sales-manual: includes orderNumber only', () => {
    const formData = { transactionNo: 'SO202512-54321' };
    const payload = buildOrderPayload({ formData, type: 'sales_order', manual: true, items: [], totalAmount: 0 });
    expect(payload.orderNumber).toBe('SO202512-54321');
    expect(payload.transactionNo).toBeUndefined();
  });

  it('purchase-auto: omits transactionNo so backend generates it', () => {
    const formData = { transactionNo: 'PO123' };
    const payload = buildOrderPayload({ formData, type: 'purchase_order', manual: false, items: [], totalAmount: 0 });
    expect(payload.transactionNo).toBeUndefined();
  });

  it('purchase-manual: includes transactionNo only', () => {
    const formData = { transactionNo: 'PO202512-00001' };
    const payload = buildOrderPayload({ formData, type: 'purchase_order', manual: true, items: [], totalAmount: 0 });
    expect(payload.transactionNo).toBe('PO202512-00001');
  });
});

describe('orderUtils.createApproveBody', () => {
  it('returns correct approve body', () => {
    expect(createApproveBody()).toEqual({ action: 'approve' });
  });
});
