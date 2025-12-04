import React from "react";

// Global sticky footer displaying the ERP system version
// Usage: import and render <SystemVersion /> in your global layout (e.g., Layout.jsx)
// Ensure the main content has bottom padding (e.g., pb-12) to avoid overlap

const SystemVersion = () => {
  return (
    <footer
      role="contentinfo"
      aria-label="ERP System Version"
      className="sticky bottom-0 left-0 w-full bg-white/80 backdrop-blur border-t border-slate-200 text-slate-500 text-xs py-2 z-40"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 flex items-center justify-between text-sm sm:text-base">
        <span className="font-semibold text-slate-600">Version 1.40</span>
        {/* Reserved for future: build number / environment tag */}
        <span className="hidden sm:inline-block" aria-hidden></span>
      </div>
    </footer>
  );
};

export default SystemVersion;
