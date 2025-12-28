import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  Search,
  FileText,
  Calendar,
  User,
  Package,
  Building,
  CheckCircle,
  XCircle,
  AlertCircle,
  Hash,
  Download,
  Printer,
  RefreshCw,
  Eye,
  Plus,
  Loader2,
  Receipt,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import Select from "react-select";
import axiosInstance from "../../../axios/axios";
import CreditNoteView from "./CreditNoteView";

// Toast notification component
const Toast = ({ show, message, type }) =>
  show && (
    <div
      className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg text-white z-50 ${
        type === "success" ? "bg-emerald-500" : "bg-red-500"
      }`}
    >
      <div className="flex items-center space-x-2">
        {type === "success" ? <CheckCircle size={16} /> : <XCircle size={16} />}
        <span>{message}</span>
      </div>
    </div>
  );

// Statistics card component
const StatCard = ({ title, count, icon, bgColor, textColor }) => (
  <div className={`${bgColor} rounded-2xl p-6 border transition-all duration-300 hover:shadow-lg`}>
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-white/50 rounded-xl">{icon}</div>
    </div>
    <h3 className={`text-sm font-medium ${textColor} mb-2`}>{title}</h3>
    <p className="text-3xl font-bold text-gray-900">{count}</p>
  </div>
);

const SalesReturnPage = () => {
  // State management
  const [activeView, setActiveView] = useState("list"); // list, create, view
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [approvedInvoices, setApprovedInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [salesReturns, setSalesReturns] = useState([]);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // Show toast message
  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
  }, []);

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/customers/customers");
      setCustomers(response.data.data || []);
    } catch (error) {
      showToast("Failed to fetch customers", "error");
    }
  }, [showToast]);

  // Fetch sales returns
  const fetchSalesReturns = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get("/returns/sales");
      setSalesReturns(response.data.data || []);
    } catch (error) {
      showToast("Failed to fetch sales returns", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Fetch approved invoices for selected customer
  const fetchApprovedInvoices = useCallback(async (customerId) => {
    if (!customerId) {
      setApprovedInvoices([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axiosInstance.get("/returns/approved-invoices", {
        params: { partyId: customerId, partyType: "Customer" },
      });
      setApprovedInvoices(response.data.data || []);
    } catch (error) {
      showToast("Failed to fetch invoices", "error");
      setApprovedInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Fetch invoice details for return
  const fetchInvoiceDetails = useCallback(async (invoiceId) => {
    if (!invoiceId) {
      setInvoiceDetails(null);
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`/returns/invoice/${invoiceId}`);
      setInvoiceDetails(response.data.data);
    } catch (error) {
      showToast("Failed to fetch invoice details", "error");
      setInvoiceDetails(null);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Handle customer selection
  const handleCustomerSelect = useCallback((customerId) => {
    const customer = customers.find((c) => c._id === customerId);
    setSelectedCustomer(customer);
    setSelectedInvoice(null);
    setInvoiceDetails(null);
    if (customerId) {
      fetchApprovedInvoices(customerId);
    }
  }, [customers, fetchApprovedInvoices]);

  // Handle invoice selection
  const handleInvoiceSelect = useCallback((invoiceId) => {
    const invoice = approvedInvoices.find((i) => i._id === invoiceId);
    setSelectedInvoice(invoice);
    if (invoiceId) {
      fetchInvoiceDetails(invoiceId);
    }
  }, [approvedInvoices, fetchInvoiceDetails]);

  // Handle item checkbox toggle
  const handleItemToggle = useCallback((index) => {
    setInvoiceDetails((prev) => {
      if (!prev) return prev;
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        selectedForReturn: !newItems[index].selectedForReturn,
        returnQty: !newItems[index].selectedForReturn ? newItems[index].availableForReturn : 0,
      };
      return { ...prev, items: newItems };
    });
  }, []);

  // Handle return quantity change - separate raw input from validated quantity
  const handleReturnQtyChange = useCallback((index, value, isBlur = false) => {
    setInvoiceDetails((prev) => {
      if (!prev) return prev;
      const newItems = [...prev.items];
      const item = newItems[index];
      const maxQty = item.availableForReturn || item.qty;
      
      if (isBlur) {
        // On blur, validate and set final value
        const validQty = Math.min(Math.max(0, parseFloat(value) || 0), maxQty);
        newItems[index] = {
          ...item,
          returnQty: validQty,
          returnQtyInput: validQty.toString(),
          selectedForReturn: validQty > 0,
        };
      } else {
        // During typing, allow any input but store raw value
        // Only update returnQty if value is valid number > 0
        const numValue = parseFloat(value);
        const isValidNumber = !isNaN(numValue) && numValue > 0;
        newItems[index] = {
          ...item,
          returnQtyInput: value, // Store raw input for display
          returnQty: isValidNumber ? Math.min(numValue, maxQty) : item.returnQty,
          // Don't change selectedForReturn during typing - only on blur
        };
      }
      return { ...prev, items: newItems };
    });
  }, []);

  // Calculate return totals
  const calculateReturnTotals = useCallback((items) => {
    if (!items) return { subtotal: 0, vat: 0, total: 0 };
    
    const selectedItems = items.filter((item) => item.selectedForReturn && item.returnQty > 0);
    
    let subtotal = 0;
    let vat = 0;
    
    selectedItems.forEach((item) => {
      const unitPrice = item.price || (item.rate / (item.originalQty || item.qty || 1));
      const lineTotal = item.returnQty * unitPrice;
      const vatAmount = (lineTotal * (item.vatPercent || 0)) / 100;
      subtotal += lineTotal;
      vat += vatAmount;
    });
    
    return {
      subtotal: +subtotal.toFixed(2),
      vat: +vat.toFixed(2),
      total: +(subtotal + vat).toFixed(2),
    };
  }, []);

  // Submit return
  const handleSubmitReturn = useCallback(async () => {
    if (!invoiceDetails || !selectedCustomer) {
      showToast("Please select a customer and invoice", "error");
      return;
    }

    const selectedItems = invoiceDetails.items.filter(
      (item) => item.selectedForReturn && item.returnQty > 0
    );

    if (selectedItems.length === 0) {
      showToast("Please select at least one item for return", "error");
      return;
    }

    setIsLoading(true);
    try {
      const returnData = {
        type: "sales_return",
        originalInvoiceId: selectedInvoice._id,
        partyId: selectedCustomer._id,
        partyType: "Customer",
        reference,
        notes,
        date: returnDate,
        items: invoiceDetails.items.map((item) => ({
          ...item,
          itemId: item.itemId._id || item.itemId,
        })),
      };

      const response = await axiosInstance.post("/returns", returnData);
      
      showToast("Sales Return created successfully!", "success");
      setSelectedReturn(response.data.data);
      setActiveView("view");
      
      // Reset form
      setSelectedCustomer(null);
      setSelectedInvoice(null);
      setInvoiceDetails(null);
      setReference("");
      setNotes("");
      
      // Refresh list
      fetchSalesReturns();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to create sales return", "error");
    } finally {
      setIsLoading(false);
    }
  }, [invoiceDetails, selectedCustomer, selectedInvoice, reference, notes, returnDate, showToast, fetchSalesReturns]);

  // Initial data fetch
  useEffect(() => {
    fetchCustomers();
    fetchSalesReturns();
  }, [fetchCustomers, fetchSalesReturns]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = salesReturns.length;
    const totalValue = salesReturns.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const thisMonth = salesReturns.filter((r) => {
      const d = new Date(r.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    
    return { total, totalValue, thisMonth };
  }, [salesReturns]);

  // Filter returns
  const filteredReturns = useMemo(() => {
    if (!searchTerm) return salesReturns;
    const term = searchTerm.toLowerCase();
    return salesReturns.filter(
      (r) =>
        r.transactionNo?.toLowerCase().includes(term) ||
        r.creditNoteNo?.toLowerCase().includes(term) ||
        r.partyName?.toLowerCase().includes(term) ||
        r.reference?.toLowerCase().includes(term)
    );
  }, [salesReturns, searchTerm]);

  const returnTotals = useMemo(() => calculateReturnTotals(invoiceDetails?.items), [invoiceDetails?.items, calculateReturnTotals]);

  // Render list view
  const renderListView = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Sales Returns</h1>
            <p className="text-slate-600 mt-1">Manage sales returns and credit notes</p>
          </div>
          <button
            onClick={() => setActiveView("create")}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>New Sales Return</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Returns"
            count={stats.total}
            icon={<Receipt className="w-6 h-6 text-blue-600" />}
            bgColor="bg-blue-50"
            textColor="text-blue-600"
          />
          <StatCard
            title="Total Value"
            count={`AED ${stats.totalValue.toLocaleString()}`}
            icon={<FileText className="w-6 h-6 text-green-600" />}
            bgColor="bg-green-50"
            textColor="text-green-600"
          />
          <StatCard
            title="This Month"
            count={stats.thisMonth}
            icon={<Calendar className="w-6 h-6 text-purple-600" />}
            bgColor="bg-purple-50"
            textColor="text-purple-600"
          />
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by return number, credit note, customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={fetchSalesReturns}
              className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-slate-600 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Returns Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredReturns.length === 0 ? (
            <div className="text-center py-20">
              <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No sales returns found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Return No</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Credit Note</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Original Invoice</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase">Amount</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReturns.map((ret) => (
                  <tr key={ret._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{ret.transactionNo}</td>
                    <td className="px-6 py-4 text-blue-600 font-medium">{ret.creditNoteNo || "-"}</td>
                    <td className="px-6 py-4 text-slate-600">{ret.partyName || ret.partyId?.customerName}</td>
                    <td className="px-6 py-4 text-slate-600">{ret.originalInvoiceNo}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(ret.date).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-800">
                      AED {ret.totalAmount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedReturn(ret);
                          setActiveView("view");
                        }}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );

  // Render create view
  const renderCreateView = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => setActiveView("list")}
            className="p-2 bg-white rounded-xl shadow hover:shadow-md transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Create Sales Return</h1>
            <p className="text-slate-600 mt-1">Select customer and invoice to process return</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Select Customer */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 text-sm font-bold">1</span>
                Select Customer
              </h3>
              <Select
                value={selectedCustomer ? {
                  value: selectedCustomer._id,
                  label: `${selectedCustomer.customerId} - ${selectedCustomer.customerName}`
                } : null}
                onChange={(option) => handleCustomerSelect(option?.value || "")}
                options={customers.map((c) => ({
                  value: c._id,
                  label: `${c.customerId} - ${c.customerName}`,
                  customer: c
                }))}
                placeholder="Search and select customer..."
                isClearable
                isSearchable
                classNamePrefix="react-select"
                className="react-select-container"
                styles={{
                  control: (base, state) => ({
                    ...base,
                    minHeight: '48px',
                    borderRadius: '12px',
                    backgroundColor: '#f8fafc',
                    borderColor: state.isFocused ? '#3b82f6' : '#e2e8f0',
                    boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.3)' : 'none',
                    '&:hover': { borderColor: '#3b82f6' }
                  }),
                  menu: (base) => ({
                    ...base,
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                    zIndex: 9999
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
                    color: state.isSelected ? 'white' : '#1e293b',
                    padding: '12px 16px',
                    cursor: 'pointer'
                  }),
                  placeholder: (base) => ({
                    ...base,
                    color: '#94a3b8'
                  })
                }}
                noOptionsMessage={() => "No customers found"}
              />
            </div>

            {/* Step 2: Select Invoice */}
            {selectedCustomer && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 text-sm font-bold">2</span>
                  Select Invoice
                </h3>
                {approvedInvoices.length === 0 ? (
                  <p className="text-slate-500 italic">No approved invoices found for this customer</p>
                ) : (
                  <select
                    value={selectedInvoice?._id || ""}
                    onChange={(e) => handleInvoiceSelect(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select an invoice...</option>
                    {approvedInvoices.map((inv) => (
                      <option key={inv._id} value={inv._id}>
                        {inv.transactionNo || inv.orderNumber || inv.invoiceNumber} - {new Date(inv.date).toLocaleDateString("en-GB")} - AED {inv.totalAmount?.toLocaleString()}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Step 3: Invoice Details */}
            {invoiceDetails && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 text-sm font-bold">3</span>
                  Invoice Details (Read-Only)
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-xl">
                  <div>
                    <label className="text-xs text-slate-500">Invoice No</label>
                    <p className="font-semibold text-slate-800">{invoiceDetails.transactionNo || invoiceDetails.orderNumber}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Invoice Date</label>
                    <p className="font-semibold text-slate-800">{new Date(invoiceDetails.date).toLocaleDateString("en-GB")}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Customer</label>
                    <p className="font-semibold text-slate-800">{selectedCustomer?.customerName}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Total Amount</label>
                    <p className="font-semibold text-slate-800">AED {invoiceDetails.totalAmount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Reference</label>
                    <p className="font-semibold text-slate-800">{invoiceDetails.lpono || invoiceDetails.vendorReference || "-"}</p>
                  </div>
                </div>

                {/* Items Table */}
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                  <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-3 text-sm font-bold">4</span>
                  Select Items for Return
                </h4>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setInvoiceDetails((prev) => ({
                                ...prev,
                                items: prev.items.map((item) => ({
                                  ...item,
                                  selectedForReturn: checked && item.availableForReturn > 0,
                                  returnQty: checked ? item.availableForReturn : 0,
                                })),
                              }));
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Available</th>
                        <th className="px-3 py-2 text-right">Return Qty</th>
                        <th className="px-3 py-2 text-right">Price</th>
                        <th className="px-3 py-2 text-right">VAT %</th>
                        <th className="px-3 py-2 text-right">VAT Amt</th>
                        <th className="px-3 py-2 text-right">Return Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoiceDetails.items.map((item, index) => {
                        const unitPrice = item.price || (item.rate / (item.originalQty || item.qty || 1));
                        const returnLineTotal = (item.returnQty || 0) * unitPrice;
                        const returnVatAmount = (returnLineTotal * (item.vatPercent || 0)) / 100;
                        const returnTotal = returnLineTotal + returnVatAmount;
                        
                        return (
                          <tr key={index} className={item.selectedForReturn ? "bg-blue-50" : ""}>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={item.selectedForReturn || false}
                                onChange={() => handleItemToggle(index)}
                                disabled={item.availableForReturn <= 0}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <p className="font-medium text-slate-800">{item.description}</p>
                              <p className="text-xs text-slate-500">{item.itemCode}</p>
                            </td>
                            <td className="px-3 py-2 text-right text-slate-600">{item.originalQty || item.qty}</td>
                            <td className="px-3 py-2 text-right">
                              <span className={item.availableForReturn > 0 ? "text-green-600" : "text-red-500"}>
                                {item.availableForReturn}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="text"
                                inputMode="decimal"
                                min="0"
                                max={item.availableForReturn}
                                value={item.returnQtyInput !== undefined ? item.returnQtyInput : (item.returnQty || "")}
                                onChange={(e) => handleReturnQtyChange(index, e.target.value, false)}
                                onBlur={(e) => handleReturnQtyChange(index, e.target.value, true)}
                                disabled={!item.selectedForReturn}
                                className="w-20 px-2 py-1 text-right bg-white rounded border border-slate-200 focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-slate-600">{unitPrice.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right text-slate-600">{item.vatPercent || 0}%</td>
                            <td className="px-3 py-2 text-right text-slate-600">{returnVatAmount.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-800">{returnTotal.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            {/* Customer Preview */}
            {selectedCustomer && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-blue-600" />
                  Customer Details
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-blue-600">{selectedCustomer.customerId}</p>
                  <p className="font-bold text-slate-800">{selectedCustomer.customerName}</p>
                  <p className="text-slate-600">{selectedCustomer.address}</p>
                  <p className="text-slate-600">{selectedCustomer.phone}</p>
                  <p className="text-slate-600">{selectedCustomer.email}</p>
                  {selectedCustomer.trnNumber && (
                    <p className="text-slate-600">TRN: {selectedCustomer.trnNumber}</p>
                  )}
                </div>
              </div>
            )}

            {/* Return Details */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Return Details
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Returned Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">Date when goods were returned</p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Reference (Optional)</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g., RMA-12345"
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Reason for Return (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe the reason for return..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 resize-none focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Return Summary */}
            {invoiceDetails && (
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
                <h3 className="text-lg font-semibold mb-4">Return Summary</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-blue-100">Items Selected</span>
                    <span className="font-semibold">
                      {invoiceDetails.items.filter((i) => i.selectedForReturn).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-100">Subtotal</span>
                    <span className="font-semibold">AED {returnTotals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-100">VAT</span>
                    <span className="font-semibold">AED {returnTotals.vat.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-blue-400 pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-lg">Total Return</span>
                      <span className="font-bold text-2xl">AED {returnTotals.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSubmitReturn}
                  disabled={isLoading || returnTotals.total <= 0}
                  className="w-full mt-6 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Submit Return</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render view (Credit Note)
  const renderViewMode = () => (
    <CreditNoteView
      returnData={selectedReturn}
      customer={customers.find((c) => c._id === (selectedReturn?.partyId?._id || selectedReturn?.partyId))}
      onBack={() => {
        setSelectedReturn(null);
        setActiveView("list");
      }}
    />
  );

  return (
    <>
      <Toast show={toast.show} message={toast.message} type={toast.type} />
      {activeView === "list" && renderListView()}
      {activeView === "create" && renderCreateView()}
      {activeView === "view" && selectedReturn && renderViewMode()}
    </>
  );
};

export default SalesReturnPage;
