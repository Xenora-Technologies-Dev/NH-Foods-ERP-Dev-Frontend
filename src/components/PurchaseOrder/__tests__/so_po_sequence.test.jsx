import { describe, it, expect, vi } from 'vitest';
// We'll import the sequence API after we register the mock (top-level await)
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import SOForm from '../sales/SOForm';
import POForm from '../purchase/POForm';

// Mock the sequence API module so we can control preview/save behavior
vi.mock('../../../axios/sequence', () => ({
  getSequencePreview: vi.fn(),
  saveOrder: vi.fn(),
}));
import * as sequenceApi from '../../../axios/sequence';

// Helper to render a component with internal formData state so setFormData works
function renderWithState(Component, initialData = {}, extraProps = {}) {
  function Harness() {
    const [data, setData] = React.useState({
      date: '2025-12-01',
      deliveryDate: '2025-12-05',
      partyId: 'c1',
      partyName: 'Customer 1',
      items: [ { itemId: 'i1', qty: '1', rate: '100', vatPercent: '5' } ],
      status: 'DRAFT',
      ...initialData,
    });
    return <Component {...extraProps} formData={data} setFormData={setData} />;
  }
  return render(<Harness />);
}

describe('SO/PO Form sequence preview and save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows preview on create (SO)', async () => {
    sequenceApi.getSequencePreview.mockResolvedValue({ formatted: 'SO202512-00001' });
    renderWithState(SOForm, { date: '2025-12-01' }, { customers: [{ _id: 'c1', customerId: 'C001', customerName: 'Customer 1' }], stockItems: [{ _id: 'i1', itemId: 'ITEM1', itemName: 'Item 1', salesPrice: 100 }] , addNotification: () => {}, setSalesOrders: () => {}, setActiveView: () => {}, resetForm: () => {}, calculateTotals: () => ({ total: 100, subtotal: 100, tax: 0 }), onSOSuccess: () => {}, formErrors: {}, setFormErrors: () => {} });
    const input = await screen.findByLabelText('Auto SO number preview');
    expect(input).toBeInTheDocument();
    expect(input.placeholder).toContain('SO202512-00001');
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('shows preview on create (PO)', async () => {
    sequenceApi.getSequencePreview.mockResolvedValue({ formatted: 'PO202512-00001' });
    renderWithState(POForm, { date: '2025-12-01' }, { vendors: [{ _id: 'v1', vendorId: 'V001', vendorName: 'Vendor 1' }], stockItems: [{ _id: 'i1', itemId: 'ITEM1', itemName: 'Item 1', salesPrice: 100 }], addNotification: () => {}, setPurchaseOrders: () => {}, setActiveView: () => {}, resetForm: () => {}, calculateTotals: () => ({ total: 100 }), onPOSuccess: () => {}, formErrors: {}, setFormErrors: () => {} });
    const input = await screen.findByLabelText('Auto PO number preview');
    expect(input).toBeInTheDocument();
    expect(input.placeholder).toContain('PO202512-00001');
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('auto/manual toggle works and sends numberManual', async () => {
    sequenceApi.getSequencePreview.mockResolvedValue({ formatted: 'SO202512-00001' });
    sequenceApi.saveOrder.mockResolvedValue({ data: { data: { _id: '1', partyId: 'c1', totalAmount: 100, items: [] } } });
    renderWithState(SOForm, { date: '2025-12-01' }, { customers: [{ _id: 'c1', customerId: 'C001', customerName: 'Customer 1' }], stockItems: [{ _id: 'i1', itemId: 'ITEM1', itemName: 'Item 1', salesPrice: 100 }], addNotification: () => {}, setSalesOrders: () => {}, setActiveView: () => {}, resetForm: () => {}, calculateTotals: () => ({ total: 100, subtotal: 100, tax: 0 }), onSOSuccess: () => {}, formErrors: {}, setFormErrors: () => {} });
    // Switch to manual
    fireEvent.click(screen.getByRole('button', { name: /Manual mode/i }));
    const input = screen.getByLabelText('Manual SO number input');
    fireEvent.change(input, { target: { value: 'SO202512-54321' } });
    // Save
    // Button accessible name may be 'Save SO' or 'Save Sales Order' depending on implementation; match both
    fireEvent.click(screen.getByRole('button', { name: /Save (SO|Sales Order)/i }));
    await waitFor(() => expect(sequenceApi.saveOrder).toHaveBeenCalledWith(expect.objectContaining({ numberManual: true })));
  });

  it('handles 409 conflict and re-fetches preview', async () => {
    sequenceApi.getSequencePreview.mockResolvedValue({ formatted: 'SO202512-00001' });
    sequenceApi.saveOrder.mockRejectedValue({ response: { status: 409 } });
    renderWithState(SOForm, { date: '2025-12-01' }, { customers: [{ _id: 'c1', customerId: 'C001', customerName: 'Customer 1' }], stockItems: [{ _id: 'i1', itemId: 'ITEM1', itemName: 'Item 1', salesPrice: 100 }], addNotification: () => {}, setSalesOrders: () => {}, setActiveView: () => {}, resetForm: () => {}, calculateTotals: () => ({ total: 100, subtotal: 100, tax: 0 }), onSOSuccess: () => {}, formErrors: {}, setFormErrors: () => {} });
    // Ensure preview has rendered before saving to match UI flow
    await screen.findByLabelText('Auto SO number preview');
    // Trigger save which will reject with 409
    fireEvent.click(screen.getByRole('button', { name: /Save (SO|Sales Order)/i }));
    await waitFor(() => expect(screen.getByText('Conflict')).toBeInTheDocument());
    // One call for initial preview + one after conflict
    expect(sequenceApi.getSequencePreview).toHaveBeenCalledTimes(2);
  });
});
