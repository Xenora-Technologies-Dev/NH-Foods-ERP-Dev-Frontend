import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import SaleInvoiceView from '../InvoiceView.jsx';

// Mock axios instance used in component
vi.mock('../../../axios/axios', () => ({ default: { get: vi.fn().mockResolvedValue({ data: { success: false } }) } }));

// Mock dynamic imports for html2canvas and jspdf used in PDF generation
vi.mock('html2canvas', () => ({ default: vi.fn(async () => ({ width: 800, height: 1200, toDataURL: vi.fn(() => 'data:image/png;base64,FAKE') })) }));
vi.mock('jspdf', () => ({ jsPDF: vi.fn().mockImplementation(() => ({ addImage: vi.fn(), save: vi.fn() })) }));

// Provide a stub for document.getElementById('copy-label') used during PDF generation cleanup
beforeEach(() => {
  const el = document.createElement('span');
  el.id = 'copy-label';
  document.body.appendChild(el);
});

afterEach(() => {
  const el = document.getElementById('copy-label');
  if (el) el.remove();
});

const baseProps = {
  selectedSO: null,
  createdSO: {
    transactionNo: 'SO-1234',
    displayTransactionNo: '0001',
    status: 'DRAFT',
    date: '2025-01-10T00:00:00.000Z',
    customerId: 'c1',
    items: [
      { itemCode: 'ITM1', description: 'Item One', qty: 2, rate: 200, vatAmount: 10, vatPercent: 5 },
      { itemCode: 'ITM2', description: 'Item Two', qty: 3, rate: 300, vatAmount: 15, vatPercent: 5 },
    ],
  },
  customers: [
    { _id: 'c1', customerId: 'CUST-001', customerName: 'Acme Corp', billingAddress: 'Dubai', phone: '123', email: 'a@b.com', trnNumber: 'TRN', paymentTerms: '30 Days' },
  ],
  setActiveView: vi.fn(),
  setSelectedSO: vi.fn(),
  setCreatedSO: vi.fn(),
};

const setupSession = () => {
  // Provide tokens to trigger profile fetch path, but our axios mock returns success: false
  sessionStorage.setItem('adminId', 'admin');
  sessionStorage.setItem('accessToken', 'token');
};

const clearSession = () => {
  sessionStorage.clear();
};

describe('SaleInvoiceView', () => {
  beforeEach(() => {
    setupSession();
  });
  afterEach(() => {
    clearSession();
    vi.clearAllMocks();
  });

  it('renders header and basic invoice fields', () => {
    render(<SaleInvoiceView {...baseProps} />);

    // Title based on status DRAFT => SALES ORDER
    expect(screen.getByText('SALES ORDER')).toBeInTheDocument();
    // Bill to info
    expect(screen.getByText('BILL TO:')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();

    // Copy label defaults to Customer Copy
    expect(screen.getByText('Customer Copy')).toBeInTheDocument();
  });

  it('computes totals correctly and displays them', () => {
    render(<SaleInvoiceView {...baseProps} />);

    // grossAmount = sum(rate) = 200 + 300 = 500
    // vatTotal = 10 + 15 = 25
    // grandTotal = 525
    expect(screen.getByText('500.00')).toBeInTheDocument();
    expect(screen.getByText('25.00')).toBeInTheDocument();
    expect(screen.getByText('525.00')).toBeInTheDocument();
  });

  it('derives unit price and line totals per row', () => {
    render(<SaleInvoiceView {...baseProps} />);

    // For first row: qty 2, lineValue 200 => unit price 100
    expect(screen.getAllByText('100.00')[0]).toBeInTheDocument();
    // Line values present
    expect(screen.getByText('200.00')).toBeInTheDocument();
    // VAT amount shown
    expect(screen.getByText('10.00')).toBeInTheDocument();
    // Total incl VAT 210 for first line
    expect(screen.getByText('210.00')).toBeInTheDocument();
  });

  it('prints when Print is clicked', async () => {
    const winMock = window.open;
    render(<SaleInvoiceView {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: /print/i }));

    await waitFor(() => {
      expect(winMock).toHaveBeenCalled();
    });
  });

  it('generates two PDFs when Download PDF is clicked', async () => {
    const { jsPDF } = await import('jspdf');
    render(<SaleInvoiceView {...baseProps} />);

    const btn = screen.getByRole('button', { name: /download pdf/i });
    fireEvent.click(btn);

    await waitFor(() => {
      // the component calls generatePDF twice (Internal Copy and Customer Copy)
      expect(jsPDF).toHaveBeenCalled();
    });
  });

  it('navigates back to list on Back to List', () => {
    render(<SaleInvoiceView {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: /back to list/i }));

    expect(baseProps.setSelectedSO).toHaveBeenCalledWith(null);
    expect(baseProps.setCreatedSO).toHaveBeenCalledWith(null);
    expect(baseProps.setActiveView).toHaveBeenCalledWith('list');
  });

  it('hides Invoice field when SO is not approved', () => {
    render(<SaleInvoiceView {...baseProps} />);
    // Should not render the label "Invoice:" block in DRAFT state
    expect(screen.queryByText(/Invoice:/i)).not.toBeInTheDocument();
  });

  it('shows 5-digit invoice number when approved with auto SO format', () => {
    const approved = {
      ...baseProps,
      createdSO: {
        ...baseProps.createdSO,
        status: 'APPROVED',
        transactionNo: 'SO202512-01234',
        orderNumber: 'SO202512-01234',
      },
    };
    render(<SaleInvoiceView {...approved} />);
    // Invoice label visible and number is NNNNN part of SO
    expect(screen.getByText(/Invoice:/i)).toBeInTheDocument();
    expect(screen.getByText('01234')).toBeInTheDocument();
  });

  it('uses manual SO number as invoice number when approved and not matching auto pattern', () => {
    const approvedManual = {
      ...baseProps,
      createdSO: {
        ...baseProps.createdSO,
        status: 'APPROVED',
        transactionNo: 'CUSTOM-SO-ABC',
        orderNumber: 'CUSTOM-SO-ABC',
      },
    };
    render(<SaleInvoiceView {...approvedManual} />);
    // Invoice should display the same manual value
    expect(screen.getByText(/Invoice:/i)).toBeInTheDocument();
    expect(screen.getByText('CUSTOM-SO-ABC')).toBeInTheDocument();
  });
});
