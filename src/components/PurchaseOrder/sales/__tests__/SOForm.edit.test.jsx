import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SOForm from '../SOForm.jsx';

function Harness({ initial, extraProps }) {
  const [data, setData] = React.useState({
    transactionNo: 'SO202512-00077',
    transactionNoMode: 'AUTO',
    partyId: 'c1',
    partyName: 'Customer 1',
    date: '2025-12-01',
    deliveryDate: '2025-12-05',
    status: 'DRAFT',
    items: [ { itemId: 'i1', qty: '1', rate: '100', vatPercent: '5' } ],
    ...initial,
  });
  return (
    <SOForm
      formData={data}
      setFormData={setData}
      customers={[{ _id: 'c1', customerId: 'C001', customerName: 'Customer 1' }]}
      stockItems={[{ _id: 'i1', itemId: 'I1', itemName: 'Item 1', salesPrice: 100 }]}
      addNotification={() => {}}
      selectedSO={{ id: 'x1', status: 'DRAFT' }}
      setSelectedSO={() => {}}
      setActiveView={() => {}}
      setSalesOrders={() => {}}
      activeView="edit"
      resetForm={() => {}}
      calculateTotals={() => ({ total: 100, subtotal: 95, tax: 5 })}
      onSOSuccess={() => {}}
      formErrors={{}}
      setFormErrors={() => {}}
      {...extraProps}
    />
  );
}

describe('SOForm edit locks (Draft)', () => {
  it('locks SO number, dates, and customer when editing a Draft', () => {
    render(<Harness />);

    const soInput = screen.getByLabelText(/Auto SO number preview|Manual SO number input/i);
    expect(soInput).toHaveAttribute('readonly');

    const dateInput = screen.getByLabelText('Order date');
    const deliveryInput = screen.getByLabelText('Delivery date');
    expect(dateInput).toBeDisabled();
    expect(deliveryInput).toBeDisabled();

    // Auto/Manual toggles visually disabled (not interactive)
    const autoBtn = screen.getByRole('button', { name: /Auto mode/i });
    const manualBtn = screen.getByRole('button', { name: /Manual mode/i });
    expect(autoBtn.className).toMatch(/cursor-not-allowed/);
    expect(manualBtn.className).toMatch(/cursor-not-allowed/);
  });
});
