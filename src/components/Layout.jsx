import React from "react";
import SidebarPage from "./SideBar.jsx";
import { Outlet } from "react-router-dom";
import SystemVersion from "./SystemVersion";

const Layout = () => {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <div className="flex w-full flex-1">
        <div className="hidden sm:block">
          <SidebarPage />
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#2D2D2D] scrollbar-track-[#121212] pb-12">
          <Outlet />
        </div>
      </div>
      <SystemVersion />
    </div>
  );
};

export default Layout;
