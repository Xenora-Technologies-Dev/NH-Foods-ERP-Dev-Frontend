import React, { useState, useEffect } from "react";
import SidebarPage from "./SideBar.jsx";
import { Outlet, useLocation } from "react-router-dom";
import SystemVersion from "./SystemVersion";
import { ArrowLeft, Menu } from "lucide-react";
import { useBackNavigation } from "../hooks/useBackNavigation";

const BP_MD = 768;

const Layout = () => {
  const location = useLocation();
  const { goBack } = useBackNavigation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < BP_MD : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < BP_MD);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Don't show back button on dashboard
  const showBackButton = location.pathname !== "/dashboard";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* Mobile hamburger button */}
      {isMobile && !mobileMenuOpen && (
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="fixed top-3 left-3 z-[997] p-2.5 bg-white rounded-lg shadow-md border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all active:scale-95"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Sidebar */}
      <SidebarPage
        isMobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Back navigation bar */}
        {showBackButton && (
          <div className={`h-12 bg-white border-b border-gray-200 flex items-center px-4 shrink-0 ${isMobile ? "pl-14" : ""}`}>
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 active:scale-95"
              aria-label="Go back"
              title="Go back to previous page"
            >
              <ArrowLeft size={16} strokeWidth={1.5} />
              <span className="text-sm font-medium">Back</span>
            </button>
          </div>
        )}
        {/* Main content */}
        <div className="flex-1 overflow-y-auto pb-10">
          <Outlet />
        </div>
        {/* Version footer */}
        <SystemVersion />
      </div>
    </div>
  );
};

export default Layout;
