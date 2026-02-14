import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  AlertTriangle,
  Clock,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  Receipt,
  FileText,
  Users,
  Wallet,
  Scale,
  ChevronRight,
} from "lucide-react";
import axiosInstance from "../../axios/axios.js";
import { formatAED } from "../../utils/currencyUtils.js";
import DirhamIcon from "../../assets/dirham.svg";

const Dashboard = () => {
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [transactions, stock, staff, vouchers] = await Promise.all([
        axiosInstance.get("/transactions/transactions").catch(() => ({ data: [] })),
        axiosInstance.get("/stock/stock").catch(() => ({ data: { stocks: [] } })),
        axiosInstance.get("/staff/staff").catch(() => ({ data: { staff: [] } })),
        axiosInstance.get("/vouchers/vouchers").catch(() => ({ data: [] })),
      ]);

      // Parse transactions
      const txnList = Array.isArray(transactions.data?.data)
        ? transactions.data.data
        : transactions.data?.data?.data || [];

      const salesTxns = txnList.filter(t => t.type === "sales_order" || t.transactionType === "sales");
      const purchaseTxns = txnList.filter(t => t.type === "purchase_order" || t.transactionType === "purchase");

      const totalSales = salesTxns.reduce((sum, t) => sum + (parseFloat(t.amount) || parseFloat(t.totalAmount) || 0), 0);
      const totalPurchase = purchaseTxns.reduce((sum, t) => sum + (parseFloat(t.amount) || parseFloat(t.totalAmount) || 0), 0);
      const profit = totalSales - totalPurchase;
      const marginPercent = totalSales > 0 ? ((profit / totalSales) * 100).toFixed(1) : "0.0";

      // Current month stats
      const now = new Date();
      const monthName = now.toLocaleString("default", { month: "long" });
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
      const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

      const thisMonthSales = salesTxns.filter(t => {
        const d = new Date(t.createdAt || t.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      });
      const lastMonthSales = salesTxns.filter(t => {
        const d = new Date(t.createdAt || t.date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      });

      const thisMonthTotal = thisMonthSales.reduce((s, t) => s + (parseFloat(t.amount) || parseFloat(t.totalAmount) || 0), 0);
      const lastMonthTotal = lastMonthSales.reduce((s, t) => s + (parseFloat(t.amount) || parseFloat(t.totalAmount) || 0), 0);
      const salesGrowth = lastMonthTotal > 0 ? (((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1) : null;

      // Parse stock
      let stocks = [];
      if (Array.isArray(stock.data?.data)) stocks = stock.data.data;
      else if (stock.data?.data?.stocks) stocks = stock.data.data.stocks;
      else if (Array.isArray(stock.data?.stocks)) stocks = stock.data.stocks;
      if (!Array.isArray(stocks)) stocks = [];

      // Parse staff
      let staffList = [];
      if (Array.isArray(staff.data?.data)) staffList = staff.data.data;
      else if (staff.data?.data?.staff) staffList = staff.data.data.staff;
      else if (Array.isArray(staff.data?.staff)) staffList = staff.data.staff;
      if (!Array.isArray(staffList)) staffList = [];

      // Parse vouchers
      let voucherList = [];
      if (Array.isArray(vouchers.data?.data)) voucherList = vouchers.data.data;
      else if (vouchers.data?.data?.data) voucherList = vouchers.data.data.data;
      if (!Array.isArray(voucherList)) voucherList = [];

      setKpiData({
        totalSales,
        totalPurchase,
        profit,
        marginPercent,
        salesGrowth,
        monthName,
        salesOrderCount: salesTxns.length,
        purchaseOrderCount: purchaseTxns.length,
        thisMonthOrders: thisMonthSales.length,
        stockItemCount: stocks.length,
        staffCount: staffList.length,
        voucherCount: voucherList.length,
        pendingOrders: txnList.filter(t => t.status === "DRAFT" || t.status === "PENDING").length,
        lowStockItems: stocks.filter(s => (s.quantity || 0) < (s.reorderLevel || 50)).length,
      });

      // Build alerts from real data
      const alertsList = [];
      const lowStock = stocks.filter(s => (s.quantity || 0) < (s.reorderLevel || 50)).length;
      if (lowStock > 0) {
        alertsList.push({ type: "critical", message: `${lowStock} item${lowStock > 1 ? "s" : ""} running low on stock`, icon: <AlertTriangle className="w-4 h-4" /> });
      }
      const pendingCount = txnList.filter(t => t.status === "DRAFT" || t.status === "PENDING").length;
      if (pendingCount > 0) {
        alertsList.push({ type: "warning", message: `${pendingCount} order${pendingCount > 1 ? "s" : ""} pending action`, icon: <Clock className="w-4 h-4" /> });
      }
      if (stocks.length > 0) {
        alertsList.push({ type: "info", message: `${stocks.length} stock items in inventory`, icon: <Package className="w-4 h-4" /> });
      }
      setAlerts(alertsList);

      // Recent activities: last 5 sales orders + last 5 purchase orders
      const sortByDate = (a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0);
      const recentSales = [...salesTxns].sort(sortByDate).slice(0, 5);
      const recentPurchases = [...purchaseTxns].sort(sortByDate).slice(0, 5);
      const combined = [...recentSales, ...recentPurchases].sort(sortByDate);
      const recent = combined.map((t, idx) => ({
        id: idx,
        type: t.type?.includes("sales") || t.transactionType === "sales" ? "sale" : t.type?.includes("purchase") || t.transactionType === "purchase" ? "purchase" : "other",
        txNo: t.transactionNo || t.referenceNumber || `TXN-${idx + 1}`,
        party: t.party?.customerName || t.party?.vendorName || t.partyName || "",
        amount: parseFloat(t.amount) || parseFloat(t.totalAmount) || 0,
        status: t.status || "DRAFT",
        date: t.createdAt || t.date,
      }));
      setRecentActivities(recent);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: "bg-slate-100 text-slate-600",
      PENDING: "bg-amber-100 text-amber-700",
      APPROVED: "bg-blue-100 text-blue-700",
      PAID: "bg-emerald-100 text-emerald-700",
      PARTIAL: "bg-orange-100 text-orange-700",
      INVOICED: "bg-purple-100 text-purple-700",
      REJECTED: "bg-red-100 text-red-700",
      CANCELLED: "bg-red-100 text-red-600",
    };
    return styles[status] || "bg-slate-100 text-slate-600";
  };

  const quickLinks = [
    { label: "Sales Order", icon: <ShoppingCart className="w-5 h-5" />, path: "/sales-order", color: "bg-orange-50 text-orange-700 border-orange-200" },
    { label: "Purchase Order", icon: <Truck className="w-5 h-5" />, path: "/purchase-order", color: "bg-green-50 text-green-700 border-green-200" },
    { label: "Stock Items", icon: <Package className="w-5 h-5" />, path: "/stock-item-creation", color: "bg-blue-50 text-blue-700 border-blue-200" },
    { label: "Customers", icon: <Users className="w-5 h-5" />, path: "/customer-creation", color: "bg-purple-50 text-purple-700 border-purple-200" },
    { label: "Receipt Voucher", icon: <Receipt className="w-5 h-5" />, path: "/receipt-voucher", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { label: "Payment Voucher", icon: <Wallet className="w-5 h-5" />, path: "/payment-voucher", color: "bg-rose-50 text-rose-700 border-rose-200" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-7 bg-slate-200 rounded w-48"></div>
              <div className="h-4 bg-slate-100 rounded w-64"></div>
            </div>
            <div className="h-9 bg-slate-200 rounded-lg w-28"></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-slate-200">
                <div className="h-3 bg-slate-200 rounded w-16 mb-3"></div>
                <div className="h-7 bg-slate-200 rounded w-28 mb-2"></div>
                <div className="h-3 bg-slate-100 rounded w-20"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 h-72"></div>
            <div className="bg-white rounded-xl p-6 border border-slate-200 h-72"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-xs text-slate-500">
                  {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Cards */}
        {kpiData && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sales ({kpiData.monthName})</p>
              <div className="flex items-center gap-1.5 mt-2">
                <img src={DirhamIcon} alt="AED" className="w-4 h-4 opacity-70" />
                <p className="text-xl font-bold text-slate-900">{formatAED(kpiData.totalSales)}</p>
              </div>
              {kpiData.salesGrowth !== null && (
                <div className="flex items-center mt-2">
                  {parseFloat(kpiData.salesGrowth) >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 mr-1" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-500 mr-1" />
                  )}
                  <span className={`text-xs font-medium ${parseFloat(kpiData.salesGrowth) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {kpiData.salesGrowth}% vs last month
                  </span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Purchases ({kpiData.monthName})</p>
              <div className="flex items-center gap-1.5 mt-2">
                <img src={DirhamIcon} alt="AED" className="w-4 h-4 opacity-70" />
                <p className="text-xl font-bold text-slate-900">{formatAED(kpiData.totalPurchase)}</p>
              </div>
              <p className="text-xs text-slate-500 mt-2">{kpiData.purchaseOrderCount} orders placed</p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Gross Profit</p>
              <div className="flex items-center gap-1.5 mt-2">
                <img src={DirhamIcon} alt="AED" className="w-4 h-4 opacity-70" />
                <p className={`text-xl font-bold ${kpiData.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatAED(kpiData.profit)}</p>
              </div>
              <p className="text-xs text-slate-500 mt-2">Margin: {kpiData.marginPercent}%</p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Orders This Month</p>
              <p className="text-xl font-bold text-slate-900 mt-2">{kpiData.thisMonthOrders}</p>
              <p className="text-xs text-slate-500 mt-2">{kpiData.salesOrderCount} total sales orders</p>
            </div>
          </div>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.map((alert, idx) => {
              const colors = {
                critical: "bg-red-50 border-red-200 text-red-800",
                warning: "bg-amber-50 border-amber-200 text-amber-800",
                info: "bg-blue-50 border-blue-200 text-blue-800",
              };
              const iconColors = {
                critical: "text-red-500",
                warning: "text-amber-500",
                info: "text-blue-500",
              };
              return (
                <div key={idx} className={`flex items-center space-x-3 px-4 py-3 rounded-lg border ${colors[alert.type] || colors.info}`}>
                  <span className={iconColors[alert.type] || iconColors.info}>{alert.icon}</span>
                  <p className="text-sm font-medium">{alert.message}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Links */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Quick Access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickLinks.map((link, idx) => (
              <button
                key={idx}
                onClick={() => navigate(link.path)}
                className={`group flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:shadow-md active:scale-[0.98] ${link.color}`}
              >
                <span className="group-hover:scale-110 transition-transform">{link.icon}</span>
                <span className="text-xs font-medium">{link.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Recent Transactions</h3>
              <span className="text-xs text-slate-500">Last 5 SO + 5 PO</span>
            </div>
            <div className="divide-y divide-slate-100">
              {recentActivities.length > 0 ? recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      activity.type === "sale" ? "bg-orange-100 text-orange-600" : activity.type === "purchase" ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-600"
                    }`}>
                      {activity.type === "sale" ? <ShoppingCart className="w-4 h-4" /> : activity.type === "purchase" ? <Truck className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{activity.txNo}</p>
                      <p className="text-xs text-slate-500 truncate">{activity.party || (activity.type === "sale" ? "Sales Order" : "Purchase Order")}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(activity.status)}`}>
                      {activity.status}
                    </span>
                    <p className="text-sm font-medium text-slate-700 tabular-nums">{formatAED(activity.amount)}</p>
                  </div>
                </div>
              )) : (
                <div className="px-5 py-10 text-center text-sm text-slate-400">No recent transactions</div>
              )}
            </div>
          </div>

          {/* Snapshot Panel */}
          <div className="space-y-4">
            {/* System Summary */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">System Snapshot</h3>
              </div>
              <div className="p-4 space-y-1">
                {kpiData && [
                  { label: "Stock Items", value: kpiData.stockItemCount, path: "/stock-item-creation" },
                  { label: "Sales Orders", value: kpiData.salesOrderCount, path: "/sales-order" },
                  { label: "Purchase Orders", value: kpiData.purchaseOrderCount, path: "/purchase-order" },
                  { label: "Staff Members", value: kpiData.staffCount, path: "/staff-creation" },
                  { label: "Vouchers", value: kpiData.voucherCount, path: "/receipt-voucher" },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(item.path)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Attention needed */}
            {kpiData && (kpiData.pendingOrders > 0 || kpiData.lowStockItems > 0) && (
              <div className="bg-amber-50 rounded-xl border border-amber-200">
                <div className="px-5 py-4 border-b border-amber-200">
                  <h3 className="text-sm font-semibold text-amber-800">Needs Attention</h3>
                </div>
                <div className="p-4 space-y-3">
                  {kpiData.pendingOrders > 0 && (
                    <div className="flex items-center space-x-3">
                      <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <p className="text-sm text-amber-800">{kpiData.pendingOrders} orders awaiting action</p>
                    </div>
                  )}
                  {kpiData.lowStockItems > 0 && (
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <p className="text-sm text-amber-800">{kpiData.lowStockItems} items low on stock</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
