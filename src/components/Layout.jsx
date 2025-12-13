import React from "react";
import SidebarPage from "./SideBar.jsx";
import { Outlet, useLocation } from "react-router-dom";
import SystemVersion from "./SystemVersion";
import { ArrowLeft } from "lucide-react";
import { useBackNavigation } from "../hooks/useBackNavigation";

const Layout = () => {
  const location = useLocation();
  const { goBack } = useBackNavigation();
  
  // Don't show back button on dashboard
  const showBackButton = location.pathname !== "/dashboard";

  return (
    <div className="flex min-h-screen w-full flex-col">
      <div className="flex w-full flex-1">
        <div className="hidden sm:block">
          <SidebarPage />
        </div>
        <div className="flex-1 flex flex-col">
          {/* Back navigation bar */}
          {showBackButton && (
            <div className="h-14 bg-white border-b border-gray-200/50 flex items-center px-4 sm:px-6 shadow-sm">
              <button
                onClick={goBack}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-all duration-200"
                aria-label="Go back"
                title="Go back to previous page"
              >
                <ArrowLeft size={18} />
                <span className="text-sm font-medium hidden sm:inline">Back</span>
              </button>
            </div>
          )}
          {/* Main content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#2D2D2D] scrollbar-track-[#121212] pb-12">
            <Outlet />
          </div>
        </div>
      </div>
      <SystemVersion />
    </div>
  );
};

export default Layout;
