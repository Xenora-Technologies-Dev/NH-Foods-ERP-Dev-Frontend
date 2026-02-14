import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ChevronDown,
  HelpCircle,
  LogOut,
  Settings,
  User,
  Receipt,
  CreditCard,
  FileText,
  ShoppingCart,
  Box,
  Barcode,
  Ruler,
  Users,
  BarChart3,
  Zap,
  DollarSign,
  TrendingUp,
  Calculator,
  Wallet,
  ShoppingBag,
  Truck,
  Warehouse,
  Scale,
  UserPlus,
  ArrowLeftRight,
  UserCheck,
  Briefcase,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";

// Breakpoints matching Tailwind defaults
const BP_MD = 768;
const BP_LG = 1024;

const Sidebar = ({ isMobileOpen, onMobileClose }) => {
  const [expandedSections, setExpandedSections] = useState({});
  // null = auto (follows screen size), true/false = user override
  const [userCollapsed, setUserCollapsed] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const sidebarRef = useRef(null);

  // Responsive state
  const [screenSize, setScreenSize] = useState(() => {
    if (typeof window === "undefined") return "lg";
    if (window.innerWidth < BP_MD) return "sm";
    if (window.innerWidth < BP_LG) return "md";
    return "lg";
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setScreenSize(w < BP_MD ? "sm" : w < BP_LG ? "md" : "lg");
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Determine collapsed state: user override > screen-size default
  const isSidebarCollapsed = useMemo(() => {
    if (screenSize === "sm") return false; // mobile uses drawer, not collapse
    if (userCollapsed !== null) return userCollapsed;
    return screenSize === "md"; // auto-collapse on medium screens
  }, [screenSize, userCollapsed]);

  // Mock user role
  const userRole = "Admin";

  // Navigation structure based on ERP requirements
  const navigationSections = useMemo(() => {
    const sections = [
      {
        key: "financial",
        icon: <DollarSign strokeWidth={1.5} size={22} />,
        text: "Financial Modules",
        children: [
          {
            icon: <Receipt strokeWidth={1.5} size={20} />,
            text: "Receipt Voucher",
            to: "/receipt-voucher",
          },
          {
            icon: <CreditCard strokeWidth={1.5} size={20} />,
            text: "Payment Voucher",
            to: "/payment-voucher",
          },
          {
            icon: <Calculator strokeWidth={1.5} size={20} />,
            text: "Journal Voucher",
            to: "/journal-voucher",
          },
          {
            icon: <Wallet strokeWidth={1.5} size={20} />,
            text: "Contra Voucher",
            to: "/contra-voucher",
          },
          {
            icon: <TrendingUp strokeWidth={1.5} size={20} />,
            text: "Expense Voucher",
            to: "/expense-voucher",
          },
        ].filter((item) => userRole === "Admin" || userRole === "Accountant"),
      },
      {
        key: "accounts",
        icon: <Calculator strokeWidth={1.5} size={22} />,
        text: "Accounts Module",
        children: [
          {
            icon: <ShoppingCart strokeWidth={1.5} size={20} />,
            text: "Debit Accounts",
            to: "/debit-accounts",
          },
          {
            icon: <FileText strokeWidth={1.5} size={20} />,
            text: "Credit Accounts",
            to: "/credit-accounts",
          },
          {
            icon: <ArrowLeftRight strokeWidth={1.5} size={20} />,
            text: "Transactions",
            to: "/transactions",
          },
          {
            icon: <Users strokeWidth={1.5} size={20} />,
            text: "Chart Of Accounts",
            to: "/chart-of-accounts",
          },
          {
            icon: <TrendingUp strokeWidth={1.5} size={20} />,
            text: "Expense Accounts",
            to: "/expense-accounts",
          },
        ].filter((item) => userRole === "Admin" || userRole === "Accountant"),
      },
      {
        key: "vendorModules",
        icon: <Briefcase strokeWidth={1.5} size={22} />,
        text: "Vendor Modules",
        children: [
          {
            icon: <UserPlus strokeWidth={1.5} size={20} />,
            text: "Vendor Creation",
            to: "/vendor-creation",
          },
        ].filter(
          (item) => userRole === "Admin" || userRole === "Purchase Officer"
        ),
      },
      {
        key: "customerModules",
        icon: <UserCheck strokeWidth={1.5} size={22} />,
        text: "Customer Modules",
        children: [
          {
            icon: <UserPlus strokeWidth={1.5} size={20} />,
            text: "Customer Creation",
            to: "/customer-creation",
          },
        ].filter(
          (item) => userRole === "Admin" || userRole === "Sales Executive"
        ),
      },
      {
        key: "salesPurchase",
        icon: <ShoppingBag strokeWidth={1.5} size={22} />,
        text: "Sales & Purchase",
        children: [
          {
            icon: <ShoppingCart strokeWidth={1.5} size={20} />,
            text: "Purchase Order",
            to: "/purchase-order",
          },
          {
            icon: <Truck strokeWidth={1.5} size={20} />,
            text: "Goods Received Note",
            to: "/goods-received-note",
          },
          {
            icon: <ShoppingCart strokeWidth={1.5} size={20} />,
            text: "Purchase Entry",
            to: "/approved-purchase",
          },
          {
            icon: <FileText strokeWidth={1.5} size={20} />,
            text: "Sales Order",
            to: "/sales-order",
          },
          {
            icon: <FileText strokeWidth={1.5} size={20} />,
            text: "Sales Invoice",
            to: "/approved-sales",
          },
          {
            icon: <ArrowLeftRight strokeWidth={1.5} size={20} />,
            text: "Purchase Return",
            to: "/purchase-return",
          },
          {
            icon: <ArrowLeftRight strokeWidth={1.5} size={20} />,
            text: "Sales Return",
            to: "/sales-return",
          },
        ].filter(
          (item) =>
            userRole === "Admin" ||
            userRole === "Purchase Officer" ||
            userRole === "Sales Executive"
        ),
      },
      {
        key: "inventory",
        icon: <Warehouse strokeWidth={1.5} size={22} />,
        text: "Inventory & Stock",
        children: [
          {
            icon: <Barcode strokeWidth={1.5} size={20} />,
            text: "Stock Item Creation",
            to: "/stock-item-creation",
          },
          {
            icon: <Box strokeWidth={1.5} size={20} />,
            text: "Inventory",
            to: "/inventory",
          },
        ].filter(
          (item) => userRole === "Admin" || userRole === "Inventory Manager"
        ),
      },
      {
        key: "unitOfMeasure",
        icon: <Scale strokeWidth={1.5} size={22} />,
        text: "Unit of Measure",
        children: [
          {
            icon: <Ruler strokeWidth={1.5} size={20} />,
            text: "Unit Setup",
            to: "/unit-setup",
          },
        ].filter(
          (item) => userRole === "Admin" || userRole === "Inventory Manager"
        ),
      },
      {
        key: "staff",
        icon: <UserPlus strokeWidth={1.5} size={22} />,
        text: "Staff Management",
        children: [
          {
            icon: <Users strokeWidth={1.5} size={20} />,
            text: "Staff Records",
            to: "/staff-records",
          },
        ].filter((item) => userRole === "Admin" || userRole === "HR"),
      },
      {
        key: "reports",
        icon: <BarChart3 strokeWidth={1.5} size={22} />,
        text: "Reports",
        children: [
          {
            icon: <FileText strokeWidth={1.5} size={20} />,
            text: "VAT Reports",
            to: "/vat-reports",
          },
          {
            icon: <FileText strokeWidth={1.5} size={20} />,
            text: "Trial Balance",
            to: "/trial-balance",
          },
          {
            icon: <FileText strokeWidth={1.5} size={20} />,
            text: "Profit & Loss",
            to: "/profit-loss",
          },
          {
            icon: <FileText strokeWidth={1.5} size={20} />,
            text: "Balance Sheet",
            to: "/balance-sheet",
          },
          {
            icon: <FileText strokeWidth={1.5} size={20} />,
            text: "Statement of Account",
            to: "/statement-of-account",
          },
          {
            icon: <FileText strokeWidth={1.5} size={20} />,
            text: "Item Profitability",
            to: "/item-profitability",
          },
        ].filter(() => userRole === "Admin" || userRole === "Accountant"),
      },
    ];
    return sections.filter((section) => section.children.length > 0);
  }, [userRole]);

  // Auto-expand sections with active children or main section on route change
  useEffect(() => {
    const activeSection = navigationSections.find(
      (section) =>
        section.children.some((child) => child.to === currentPath) ||
        section.to === currentPath
    );
    if (activeSection) {
      setExpandedSections((prev) => ({
        ...prev,
        [activeSection.key]: true,
      }));
    }
  }, [currentPath, navigationSections]);

  const toggleSection = (sectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const toggleSidebar = useCallback(() => {
    if (screenSize === "sm") {
      // On mobile, close the drawer
      onMobileClose?.();
    } else {
      setUserCollapsed((prev) => (prev === null ? screenSize !== "md" : !prev));
    }
  }, [screenSize, onMobileClose]);

  const handleNavigation = useCallback(
    (path) => {
      navigate(path);
      // Close sidebar on mobile after navigation
      if (screenSize === "sm" && onMobileClose) {
        onMobileClose();
      }
    },
    [navigate, screenSize, onMobileClose]
  );

  const handleLogout = (e) => {
    e.preventDefault();
    try {
      const sessionKeys = [
        "accessToken",
        "refreshToken",
        "adminId",
        "loginTime",
        "tokenExpiry",
        "rememberMe",
      ];
      const localKeys = [
        "accessToken",
        "refreshToken",
        "adminId",
        "loginTime",
        "tokenExpiry",
        "rememberMe",
        "userPreferences",
        "theme",
      ];
      sessionKeys.forEach((key) => sessionStorage.removeItem(key));
      localKeys.forEach((key) => localStorage.removeItem(key));
      navigate("/");
    } catch (error) {
      sessionStorage.clear();
      localStorage.clear();
      navigate("/");
    }
  };

  // Whether sidebar is visible (for mobile drawer)
  const isVisible = screenSize !== "sm" || isMobileOpen;

  return (
    <>
      {/* Mobile overlay */}
      {screenSize === "sm" && isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[998] transition-opacity duration-300"
          onClick={onMobileClose}
        />
      )}

      <aside
        ref={sidebarRef}
        className={`
          erp-sidebar
          ${screenSize === "sm"
            ? `fixed top-0 left-0 h-full z-[999] transition-transform duration-300 ease-in-out w-72
               ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`
            : `h-full shrink-0 transition-[width] duration-300 ease-in-out
               ${isSidebarCollapsed ? "w-[68px]" : "w-64"}`
          }
          flex flex-col bg-white text-gray-800 border-r border-gray-200 shadow-sm
        `}
      >
        {/* Header */}
        <div className="flex items-center h-16 px-3 border-b border-gray-100 shrink-0">
          {!isSidebarCollapsed || screenSize === "sm" ? (
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-base font-bold text-gray-900 leading-tight truncate">
                  ERP NEXUS
                </div>
                <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                  Enterprise System
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
                <Zap className="w-5 h-5 text-white" />
              </div>
            </div>
          )}

          {/* Collapse toggle (desktop/tablet only) */}
          {screenSize !== "sm" && (
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-1 shrink-0"
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen size={18} strokeWidth={1.5} />
              ) : (
                <PanelLeftClose size={18} strokeWidth={1.5} />
              )}
            </button>
          )}

          {/* Close button (mobile only) */}
          {screenSize === "sm" && (
            <button
              onClick={onMobileClose}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-1 shrink-0"
              aria-label="Close menu"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* User Profile */}
        {(!isSidebarCollapsed || screenSize === "sm") && (
          <div className="px-3 py-3 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-gray-50">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">
                  Administrator
                </div>
                <div className="text-xs text-gray-400 truncate">
                  admin@company.com
                </div>
              </div>
              <div className="w-2 h-2 bg-emerald-400 rounded-full shrink-0" title="Online"></div>
            </div>
          </div>
        )}

        {/* Collapsed user avatar */}
        {isSidebarCollapsed && screenSize !== "sm" && (
          <div className="flex justify-center py-3 border-b border-gray-100 shrink-0">
            <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center" title="Administrator">
              <User className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 sidebar-scrollbar">
          <nav className="space-y-0.5">
            <SidebarItem
              icon={<LayoutDashboard strokeWidth={1.5} size={20} />}
              text="Dashboard"
              to="/dashboard"
              active={currentPath === "/dashboard"}
              isCollapsed={isSidebarCollapsed && screenSize !== "sm"}
              special={true}
              onClick={() => handleNavigation("/dashboard")}
            />

            <div className="pt-1" />

            {navigationSections.map((section, index) => (
              <SidebarSection
                key={section.key}
                icon={section.icon}
                text={section.text}
                sectionKey={section.key}
                sectionTo={section.to}
                expanded={expandedSections[section.key]}
                onToggle={() => toggleSection(section.key)}
                hasActiveChild={
                  section.children.some((child) => child.to === currentPath) ||
                  section.to === currentPath
                }
                isCollapsed={isSidebarCollapsed && screenSize !== "sm"}
                delay={index * 50}
                children={section.children}
                handleNavigation={handleNavigation}
                currentPath={currentPath}
              />
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-2 space-y-0.5 shrink-0">
          <SidebarItem
            icon={<Settings strokeWidth={1.5} size={20} />}
            text="Settings"
            to="/settings"
            active={currentPath === "/settings"}
            isCollapsed={isSidebarCollapsed && screenSize !== "sm"}
            onClick={() => handleNavigation("/settings")}
          />
          <SidebarItem
            icon={<HelpCircle strokeWidth={1.5} size={20} />}
            text="Help Center"
            to="/help-center"
            active={currentPath === "/help-center"}
            isCollapsed={isSidebarCollapsed && screenSize !== "sm"}
            onClick={() => handleNavigation("/help-center")}
          />
          <button
            onClick={handleLogout}
            type="button"
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 group ${
              isSidebarCollapsed && screenSize !== "sm" ? "justify-center" : ""
            } text-gray-500 hover:bg-red-50 hover:text-red-600`}
            aria-label="Log Out"
            title={isSidebarCollapsed && screenSize !== "sm" ? "Log Out" : ""}
          >
            <LogOut strokeWidth={1.5} size={20} className="shrink-0 group-hover:text-red-500" />
            {(!isSidebarCollapsed || screenSize === "sm") && (
              <span className="text-sm font-medium">Log Out</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

// Sidebar Item Component
const SidebarItem = React.memo(
  ({ icon, text, to, active, isCollapsed, special = false, onClick }) => (
    <button
      className="w-full block cursor-pointer group"
      title={isCollapsed ? text : ""}
      onClick={onClick}
      type="button"
      aria-label={text}
    >
      <div
        className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 ${
          isCollapsed ? "justify-center" : ""
        } ${
          active
            ? special
              ? "bg-indigo-50 text-indigo-700 font-semibold"
              : "bg-indigo-50 text-indigo-700 font-semibold"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
      >
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-600 rounded-r-full" />
        )}
        <span className={`shrink-0 ${active ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600"}`}>
          {icon}
        </span>
        {!isCollapsed && (
          <span className="text-sm truncate">
            {text}
          </span>
        )}
      </div>
    </button>
  )
);

// Sidebar Section Component
const SidebarSection = React.memo(
  ({
    icon,
    text,
    sectionKey,
    sectionTo,
    expanded,
    onToggle,
    hasActiveChild,
    children,
    isCollapsed,
    delay = 0,
    handleNavigation,
    currentPath,
  }) => {
    const handleSectionClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isCollapsed) {
        onToggle();
      } else {
        // In collapsed state, expand the sidebar section
        onToggle();
      }
    };

    return (
      <div className="w-full">
        <button
          onClick={handleSectionClick}
          className={`relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
            isCollapsed ? "justify-center" : ""
          } ${
            hasActiveChild
              ? "bg-indigo-50/60 text-indigo-700"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
          title={isCollapsed ? text : ""}
          type="button"
          aria-label={text}
          aria-expanded={expanded && !isCollapsed}
        >
          <span className={`shrink-0 ${hasActiveChild ? "text-indigo-600" : "text-gray-400"}`}>
            {icon}
          </span>
          {!isCollapsed && (
            <>
              <span className="text-sm font-medium flex-1 truncate text-left">
                {text}
              </span>
              <ChevronDown
                strokeWidth={1.5}
                size={16}
                className={`shrink-0 text-gray-400 transition-transform duration-200 ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </>
          )}
        </button>

        {/* Children dropdown */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            expanded && !isCollapsed ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="ml-5 mt-0.5 space-y-0.5 border-l-2 border-gray-100 pl-3 py-0.5">
            {children.map((child) => (
              <button
                key={child.to}
                className="w-full block cursor-pointer group"
                onClick={() => handleNavigation(child.to)}
                type="button"
                aria-label={child.text}
              >
                <div
                  className={`relative flex items-center gap-2.5 px-2.5 py-[7px] rounded-md transition-all duration-200 ${
                    currentPath === child.to
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  }`}
                >
                  {currentPath === child.to && (
                    <div className="absolute -left-[15px] top-1/2 -translate-y-1/2 w-[2px] h-4 bg-indigo-500 rounded-r-full" />
                  )}
                  <span className={`shrink-0 ${currentPath === child.to ? "text-indigo-500" : "text-gray-400"}`}>
                    {child.icon}
                  </span>
                  <span className="text-sm truncate">
                    {child.text}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

SidebarItem.displayName = "SidebarItem";
SidebarSection.displayName = "SidebarSection";

export default Sidebar;