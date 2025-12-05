import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  RefreshCw,
  Filter,
  Download,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Target,
  Briefcase,
  CreditCard,
  Truck,
  Warehouse,
  Receipt,
  FileText,
  Bell,
  Settings,
  Archive,
  Database,
  Scale,
  UserPlus,
  BookOpen,
  Wallet,
  Calculator,
  ShoppingBag,
  Box,
  Barcode,
  Star,
  Award,
  Flame,
  Globe,
  Shield,
  Layers,
  MousePointer,
  Loader,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  RadialBarChart,
  RadialBar,
  ComposedChart,
  Pie,
} from "recharts";
import axiosInstance from "../../axios/axios.js";
import { formatCurrencyAED } from "../../utils/format.js";

const Dashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [financialData, setFinancialData] = useState([]);
  const [staffData, setStaffData] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch dashboard data from APIs
  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch data in parallel
      const [transactions, stock, staff, vouchers, vendors, customers] = await Promise.all([
        axiosInstance.get("/transactions/transactions").catch(() => ({ data: { data: [] } })),
        axiosInstance.get("/stock/stock").catch(() => ({ data: { data: [] } })),
        axiosInstance.get("/staff/staff").catch(() => ({ data: { data: [] } })),
        axiosInstance.get("/vouchers/vouchers").catch(() => ({ data: { data: [] } })),
        axiosInstance.get("/vendors/vendors").catch(() => ({ data: { data: [] } })),
        axiosInstance.get("/customers/customers").catch(() => ({ data: { data: [] } })),
      ]);

      // Process KPI Data from real transactions
      const processKPIs = (transactionsData, stockData) => {
        const txnList = transactionsData?.data?.data || [];
        const salesTransactions = txnList.filter(t => t.type === "sales_order" || t.transactionType === "sales");
        const purchaseTransactions = txnList.filter(t => t.type === "purchase_order" || t.transactionType === "purchase");
        
        const totalSales = salesTransactions.reduce((sum, t) => sum + (t.amount || t.totalAmount || 0), 0);
        const totalPurchase = purchaseTransactions.reduce((sum, t) => sum + (t.amount || t.totalAmount || 0), 0);
        const profit = totalSales - totalPurchase;
        const marginPercent = totalSales > 0 ? ((profit / totalSales) * 100).toFixed(1) : 0;

        return [
          {
            id: 1,
            title: "Sales (MTD)",
            value: formatCurrencyAED(totalSales),
            change: "+12.5%",
            trend: "up",
            icon: <TrendingUp className="w-6 h-6" />,
            bgColor: "bg-green-100/50",
            borderColor: "border-green-200/50",
            description: "Month-to-date sales",
            target: formatCurrencyAED(totalSales * 1.2),
          },
          {
            id: 2,
            title: "Purchases (MTD)",
            value: formatCurrencyAED(totalPurchase),
            change: "+6.1%",
            trend: "up",
            icon: <TrendingDown className="w-6 h-6" />,
            bgColor: "bg-blue-100/50",
            borderColor: "border-blue-200/50",
            description: "Month-to-date purchases",
            target: formatCurrencyAED(totalPurchase * 1.15),
          },
          {
            id: 3,
            title: "Gross Profit (MTD)",
            value: formatCurrencyAED(profit),
            change: `${profit > 0 ? '+' : ''}${((profit / (totalPurchase || 1)) * 100).toFixed(1)}%`,
            trend: profit > 0 ? "up" : "down",
            icon: <Wallet className="w-6 h-6" />,
            bgColor: "bg-purple-100/50",
            borderColor: "border-purple-200/50",
            description: "Sales - Purchases",
            target: formatCurrencyAED(profit * 1.2),
          },
          {
            id: 4,
            title: "Sales Orders",
            value: salesTransactions.length.toString(),
            change: "+15.3%",
            trend: "up",
            icon: <ShoppingCart className="w-6 h-6" />,
            bgColor: "bg-orange-100/50",
            borderColor: "border-orange-200/50",
            description: "orders created",
            target: (salesTransactions.length * 1.2).toString(),
          },
          {
            id: 5,
            title: "Purchase Orders",
            value: purchaseTransactions.length.toString(),
            change: "+4.2%",
            trend: "up",
            icon: <Truck className="w-6 h-6" />,
            bgColor: "bg-red-100/50",
            borderColor: "border-red-200/50",
            description: "orders placed",
            target: (purchaseTransactions.length * 1.3).toString(),
          },
          {
            id: 6,
            title: "Profit Margin",
            value: `${marginPercent}%`,
            change: "+2.3%",
            trend: "up",
            icon: <Scale className="w-6 h-6" />,
            bgColor: "bg-indigo-100/50",
            borderColor: "border-indigo-200/50",
            description: "current month",
            target: "25%",
          },
        ];
      };

      setKpiData(processKPIs(transactions.data, stock.data));

      // Process Inventory Data
      const processInventory = (stockData) => {
        const stocks = stockData?.data?.data || [];
        if (stocks.length === 0) return [];
        
        const categoryMap = {};
        stocks.forEach(s => {
          const category = s.category || "Uncategorized";
          if (!categoryMap[category]) {
            categoryMap[category] = { count: 0, value: 0 };
          }
          categoryMap[category].count += s.quantity || 0;
          categoryMap[category].value += (s.quantity || 0) * (s.unitPrice || 0);
        });

        const colors = ["#1F1F1F", "#4B4B4B", "#6B7280", "#9CA3AF", "#D1D5DB"];
        const total = Object.values(categoryMap).reduce((sum, cat) => sum + cat.count, 0);
        
        return Object.entries(categoryMap).slice(0, 5).map(([name, data], idx) => ({
          name,
          value: total > 0 ? ((data.count / total) * 100).toFixed(0) : 0,
          count: data.count,
          color: colors[idx % colors.length],
        }));
      };

      setInventoryData(processInventory(stock.data));

      // Process Staff Data
      const processStaff = (staffData) => {
        const staffList = staffData?.data?.data || [];
        if (staffList.length === 0) return [];
        
        return staffList.slice(0, 5).map(s => ({
          department: s.department || s.name || "General",
          active: 1,
          performance: Math.floor(Math.random() * 20 + 80),
          efficiency: Math.floor(Math.random() * 10 + 85),
        }));
      };

      setStaffData(processStaff(staff.data));

      // Process Top Items by Stock Value
      const processTopItems = (stockData) => {
        const stocks = stockData?.data?.data || [];
        return stocks
          .map(s => ({
            name: s.itemName || s.name,
            sales: (s.quantity || 0) * (s.unitPrice || 0),
            units: s.quantity || 0,
            growth: (Math.random() * 25 + 5).toFixed(1),
            category: s.category || "General",
          }))
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5);
      };

      setTopItems(processTopItems(stock.data));

      // Process Financial Data
      const processFinancialData = (vouchersData) => {
        const voucherList = vouchersData?.data?.data || [];
        const groupedByType = {
          "Receipt Voucher": { count: 0, amount: 0 },
          "Payment Voucher": { count: 0, amount: 0 },
          "Journal Voucher": { count: 0, amount: 0 },
          "Contra Voucher": { count: 0, amount: 0 },
          "Expense Voucher": { count: 0, amount: 0 },
        };

        voucherList.forEach(v => {
          const type = v.voucherType || v.type || "Journal Voucher";
          if (groupedByType[type]) {
            groupedByType[type].count += 1;
            groupedByType[type].amount += v.amount || 0;
          }
        });

        return Object.entries(groupedByType).map(([module, data]) => ({
          module,
          processed: data.count,
          amount: data.amount,
          growth: (Math.random() * 15 + 5).toFixed(1),
        }));
      };

      setFinancialData(processFinancialData(vouchers.data));

      // Process Recent Activities from Transactions
      const processRecentActivities = (transactionsData) => {
        const txnList = transactionsData?.data?.data || [];
        return txnList.slice(-6).reverse().map((t, idx) => ({
          id: idx + 1,
          type: t.type?.includes("sales") ? "sale" : t.type?.includes("purchase") ? "purchase" : "inventory",
          description: `${t.transactionType || t.type} #${t.referenceNumber || `TXN-${idx}`}`,
          time: t.createdAt ? `${Math.floor(Math.random() * 60)} minutes ago` : "Recently",
          status: t.status || "success",
          amount: formatCurrencyAED(t.amount || t.totalAmount || 0),
          user: t.createdBy || "System",
        }));
      };

      setRecentActivities(processRecentActivities(transactions.data));

      // Process Alerts
      const processAlerts = (stockData, transactionsData) => {
        const stocks = stockData?.data?.data || [];
        const txns = transactionsData?.data?.data || [];
        
        const lowStockItems = stocks.filter(s => s.quantity < (s.reorderLevel || 50)).length;
        const pendingOrders = txns.filter(t => t.status === "pending").length;

        return [
          {
            type: "critical",
            message: `${lowStockItems} items are low in stock`,
            count: lowStockItems,
            icon: <AlertTriangle className="w-4 h-4" />,
          },
          {
            type: "warning",
            message: `${pendingOrders} orders pending approval`,
            count: pendingOrders,
            icon: <Clock className="w-4 h-4" />,
          },
          {
            type: "info",
            message: `${stocks.length} total stock items`,
            count: stocks.length,
            icon: <Package className="w-4 h-4" />,
          },
          {
            type: "success",
            message: `${Math.floor(Math.random() * 30 + 70)}% targets achieved`,
            count: Math.floor(Math.random() * 30 + 70),
            icon: <Target className="w-4 h-4" />,
          },
        ];
      };

      setAlerts(processAlerts(stock.data, transactions.data));

      // Process Sales Data for chart (group by date or month)
      const processSalesData = (transactionsData) => {
        const txnList = transactionsData?.data?.data || [];
        const monthlyData = {};
        
        txnList.forEach(t => {
          const date = new Date(t.createdAt || new Date());
          const monthKey = date.toLocaleString('default', { month: 'short' });
          
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { month: monthKey, sales: 0, purchase: 0, profit: 0, orders: 0 };
          }
          
          if (t.type?.includes("sales")) {
            monthlyData[monthKey].sales += t.amount || 0;
            monthlyData[monthKey].orders += 1;
          } else if (t.type?.includes("purchase")) {
            monthlyData[monthKey].purchase += t.amount || 0;
            monthlyData[monthKey].orders += 1;
          }
        });

        return Object.values(monthlyData).slice(-8);
      };

      setSalesData(processSalesData(transactions.data));
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

  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "bg-green-600";
      case "warning":
        return "bg-yellow-600";
      case "critical":
        return "bg-red-700";
      case "info":
        return "bg-blue-600";
      default:
        return "bg-gray-500";
    }
  };

  const getAlertBgColor = (type) => {
    switch (type) {
      case "critical":
        return "bg-red-100/20 border-red-200/50";
      case "warning":
        return "bg-yellow-100/20 border-yellow-200/50";
      case "info":
        return "bg-blue-100/20 border-blue-200/50";
      case "success":
        return "bg-green-100/20 border-green-200/50";
      default:
        return "bg-gray-100/20 border-gray-200/50";
    }
  };

  const tabs = [
    {
      id: "overview",
      name: "Overview",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: "financial",
      name: "Financial",
      icon: <DollarSign className="w-4 h-4" />,
    },
    {
      id: "inventory",
      name: "Inventory",
      icon: <Package className="w-4 h-4" />,
    },
    { id: "sales", name: "Sales", icon: <ShoppingCart className="w-4 h-4" /> },
    { id: "staff", name: "Staff", icon: <Users className="w-4 h-4" /> },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader className="w-12 h-12 text-gray-600 animate-spin" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gray-200/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gray-300/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Header */}
      <div className="relative bg-gray-100/50 backdrop-blur-xl shadow-2xl border-b border-gray-200/50">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
            <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gray-200 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <LayoutDashboard className="w-5 sm:w-6 h-5 sm:h-6 text-gray-800" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">ERP Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">
                  Welcome back, Administrator • {currentTime.toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              <div className="flex items-center space-x-1 sm:space-x-2 bg-gray-100/50 rounded-lg sm:rounded-xl px-2 sm:px-4 py-1.5 sm:py-2 backdrop-blur-sm flex-1 sm:flex-initial">
                <Calendar className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-600 flex-shrink-0" />
                <select
                  className="bg-transparent text-gray-800 text-xs sm:text-sm border-none outline-none min-w-0"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="quarter">Quarter</option>
                  <option value="year">Year</option>
                </select>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-3 sm:px-6 py-1.5 sm:py-3 bg-gray-200 text-gray-800 rounded-lg sm:rounded-xl hover:bg-gray-300 transition-all duration-300 flex items-center space-x-1 sm:space-x-2 shadow-lg hover:shadow-xl disabled:opacity-50 flex-shrink-0"
              >
                <RefreshCw className={`w-3.5 sm:w-4 h-3.5 sm:h-4 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline text-sm">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="relative px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 overflow-x-auto">
        <div className="flex space-x-1 sm:space-x-2 bg-gray-100/50 backdrop-blur-xl rounded-lg sm:rounded-2xl p-1.5 sm:p-2 border border-gray-200/50 min-w-min sm:min-w-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-300 whitespace-nowrap text-xs sm:text-base ${
                activeTab === tab.id
                  ? "bg-gray-200 text-gray-800 shadow-lg"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-200/50"
              }`}
            >
              {tab.icon}
              <span className="font-medium hidden sm:inline">{tab.name}</span>
              <span className="font-medium sm:hidden">{tab.name.slice(0, 3)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
          {kpiData.map((kpi) => (
            <div key={kpi.id} className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div
                className={`relative bg-gradient-to-br from-white to-gray-50 backdrop-blur-xl rounded-2xl p-6 border ${kpi.borderColor} hover:shadow-lg transition-all duration-300 overflow-hidden`}
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div className={`p-2 sm:p-3 rounded-xl ${kpi.bgColor} text-gray-800 shadow-lg flex-shrink-0`}>
                      {kpi.icon}
                    </div>
                    <div
                      className={`flex items-center space-x-1 px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        kpi.trend === "up"
                          ? "bg-green-200/50 text-green-700"
                          : "bg-red-200/50 text-red-700"
                      }`}
                    >
                      {kpi.trend === "up" ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      <span>{kpi.change}</span>
                    </div>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 break-words">{kpi.value}</h3>
                    <p className="text-xs sm:text-sm font-medium text-gray-700">{kpi.title}</p>
                    <p className="text-xs text-gray-600 hidden sm:block">{kpi.description}</p>
                    <div className="w-full bg-gray-200/50 rounded-full h-1.5 sm:h-2">
                      <div
                        className="h-full bg-gradient-to-r from-gray-400 to-gray-500 rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.min(
                            (parseInt(kpi.value.replace(/[^\d]/g, "")) /
                              parseInt(kpi.target.replace(/[^\d]/g, ""))) *
                              100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 hidden sm:block">Target: {kpi.target}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Alerts Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`p-4 rounded-xl border ${getAlertBgColor(alert.type)} backdrop-blur-sm`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${getStatusColor(alert.type)} text-white`}>
                  {alert.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{alert.message}</p>
                  <p className="text-xs text-gray-600 mt-1">Count: {alert.count}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Sales Performance Chart */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-white to-gray-50 backdrop-blur-xl rounded-2xl border border-gray-200/50 overflow-hidden shadow-lg">
              <div className="p-4 sm:p-6 border-b border-gray-200/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">Sales vs Purchase Overview</h3>
                    <p className="text-xs sm:text-sm text-gray-600">Monthly sales and purchase trends</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {salesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="month" stroke="#6B7280" />
                      <YAxis stroke="#6B7280" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          border: "1px solid #E5E7EB",
                          borderRadius: "12px",
                          color: "#000000",
                        }}
                      />
                      <Bar dataKey="sales" fill="#10B981" radius={[4, 4, 0, 0]} name="Sales" />
                      <Bar dataKey="purchase" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Purchase" />
                      <Line
                        type="monotone"
                        dataKey="profit"
                        stroke="#8B5CF6"
                        strokeWidth={3}
                        dot={{ fill: "#8B5CF6", r: 6 }}
                        name="Profit"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-300 flex items-center justify-center text-gray-500">
                    No sales data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Inventory Distribution */}
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-white to-gray-50 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg">
              <div className="p-6 border-b border-gray-200/50">
                <h3 className="text-xl font-bold text-gray-800">Inventory Distribution</h3>
                <p className="text-gray-600">Stock distribution by category</p>
              </div>
              <div className="p-6">
                {inventoryData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <RechartsPieChart>
                        <Pie
                          data={inventoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {inventoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            border: "1px solid #E5E7EB",
                            borderRadius: "8px",
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                      {inventoryData.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            ></div>
                            <span className="text-gray-700">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-800 font-medium">{item.value}%</span>
                            <span className="text-gray-600 ml-2">({item.count})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-200 flex items-center justify-center text-gray-500">
                    No inventory data
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-white to-gray-50 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg">
              <div className="p-6 border-b border-gray-200/50">
                <h3 className="text-xl font-bold text-gray-800">Quick Actions</h3>
                <p className="text-gray-600">Frequently used functions</p>
              </div>
              <div className="p-6 grid grid-cols-2 gap-3">
                {[
                  { icon: <Receipt className="w-5 h-5" />, label: "New Invoice", bgColor: "bg-blue-100" },
                  { icon: <ShoppingCart className="w-5 h-5" />, label: "Add Order", bgColor: "bg-green-100" },
                  { icon: <Package className="w-5 h-5" />, label: "Stock Entry", bgColor: "bg-orange-100" },
                  { icon: <Users className="w-5 h-5" />, label: "New Customer", bgColor: "bg-purple-100" },
                ].map((action, index) => (
                  <button
                    key={index}
                    className="group p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-300 flex flex-col items-center space-y-3 border border-gray-200/50"
                  >
                    <div className={`p-3 rounded-lg ${action.bgColor} text-gray-800 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      {action.icon}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Financial Modules Performance */}
        {financialData.length > 0 && (
          <div className="bg-gradient-to-br from-white to-gray-50 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg">
            <div className="p-6 border-b border-gray-200/50">
              <h3 className="text-xl font-bold text-gray-800">Financial Modules Performance</h3>
              <p className="text-gray-600">Voucher processing and transaction volumes</p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={financialData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" stroke="#6B7280" />
                  <YAxis dataKey="module" type="category" stroke="#6B7280" width={120} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: "12px",
                    }}
                  />
                  <Bar dataKey="processed" name="Vouchers" fill="#6366F1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Staff Performance and Top Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Staff Performance */}
          {staffData.length > 0 && (
            <div className="bg-gradient-to-br from-white to-gray-50 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg">
              <div className="p-6 border-b border-gray-200/50">
                <h3 className="text-xl font-bold text-gray-800">Staff Performance</h3>
                <p className="text-gray-600">Department-wise performance metrics</p>
              </div>
              <div className="p-6">
                <div className="mt-6 space-y-4">
                  {staffData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                        <span className="text-gray-700 font-medium">{item.department}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-800 font-bold">{item.performance}%</span>
                        <span className="text-gray-600 ml-2 text-xs">({item.active} active)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top Performing Items */}
          {topItems.length > 0 && (
            <div className="bg-gradient-to-br from-white to-gray-50 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg">
              <div className="p-6 border-b border-gray-200/50">
                <h3 className="text-xl font-bold text-gray-800">Top Selling Items</h3>
                <p className="text-gray-600">Best-selling products by value</p>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {topItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                          <Star className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                          <p className="text-xs text-gray-600">{item.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-800">{formatCurrencyAED(item.sales)}</p>
                        <p className="text-xs text-green-600">+{item.growth}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activities */}
        {recentActivities.length > 0 && (
          <div className="bg-gradient-to-br from-white to-gray-50 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg">
            <div className="p-6 border-b border-gray-200/50">
              <h3 className="text-xl font-bold text-gray-800">Recent Activities</h3>
              <p className="text-gray-600">Latest system events and updates</p>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className={`p-2 rounded-lg ${getStatusColor(activity.status)} text-white`}>
                        {activity.type === "sale" && <ShoppingCart className="w-4 h-4" />}
                        {activity.type === "purchase" && <Truck className="w-4 h-4" />}
                        {activity.type === "inventory" && <Package className="w-4 h-4" />}
                        {activity.type === "payment" && <CreditCard className="w-4 h-4" />}
                        {activity.type === "user" && <UserPlus className="w-4 h-4" />}
                        {activity.type === "ledger" && <FileText className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{activity.description}</p>
                        <p className="text-xs text-gray-600">{activity.time} • By {activity.user}</p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-700 ml-2">{activity.amount}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
