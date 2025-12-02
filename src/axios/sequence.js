// API service for sequence preview, order save, and approve flows
// Synced to transactions backend used across the app
import axios from '../axios/axios';

// Normalize type input: accepts 'SO'|'PO' or full backend types
const mapType = (t) => {
  if (!t) return undefined;
  const up = String(t).toUpperCase();
  if (up === 'SO' || up === 'SALES_ORDER') return 'sales_order';
  if (up === 'PO' || up === 'PURCHASE_ORDER') return 'purchase_order';
  return t; // fallback
};

// Get sequence preview for SO/PO (non-consuming preview)
export const getSequencePreview = async (type, yearMonth) => {
  // Backend primary endpoint
  const backendType = mapType(type);
  try {
    const { data } = await axios.get(`/transactions/next-number`, {
      params: { type: backendType, preview: true, date: yearMonth },
    });
    // Accept multiple shapes per spec
    const next = data?.data?.next || data?.data?.nextNumber || data?.next || data?.nextNumber;
    return { formatted: next || '' };
  } catch (e) {
    // Fallback legacy endpoint if available
    try {
      const { data } = await axios.get(`/sequence/preview`, {
        params: { type, date: yearMonth },
      });
      const next = data?.data?.next || data?.data?.nextNumber || data?.formatted || data?.next || data?.nextNumber;
      return { formatted: next || '' };
    } catch (e2) {
      return { formatted: '' };
    }
  }
};

// Save order (SO/PO)
export const saveOrder = async (payload) => {
  // Persist via transactions API
  return axios.post('/transactions/transactions', payload);
};

// Approve order (SO/PO)
export const approveOrder = async (orderId) => {
  return axios.patch(`/transactions/transactions/${orderId}/process`, { action: 'approve' });
};

// Update existing order (SO/PO)
export const updateOrder = async (orderId, payload) => {
  return axios.put(`/transactions/transactions/${orderId}`, payload);
};
