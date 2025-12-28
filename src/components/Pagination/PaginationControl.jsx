import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const PaginationControl = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  isLoading = false,
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7; // Show up to 7 page buttons
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    // Adjust start if we're near the end
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // Add first pages if gap exists
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push("...");
      }
    }

    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add last pages if gap exists
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push("...");
      }
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="mt-8 bg-white rounded-xl shadow-md border border-gray-200 p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {/* Left: Info Display */}
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{totalItems}</span> items
            {totalItems > 0 && ` • Showing ${startItem} to ${endItem}`}
          </div>
          
          {/* Items Per Page Selector */}
          <div className="flex items-center space-x-2">
            <label htmlFor="itemsPerPage" className="text-sm font-medium text-gray-700">
              Per page:
            </label>
            <select
              id="itemsPerPage"
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(Number(e.target.value));
              }}
              disabled={isLoading}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Right: Pagination Controls */}
        <div className="flex items-center space-x-2">
          {/* First Page Button */}
          <button
            onClick={() => onPageChange(1)}
            disabled={isLoading || currentPage === 1 || totalPages === 0}
            title="First page"
            className="p-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Previous Button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={isLoading || currentPage === 1 || totalPages === 0}
            title="Previous page"
            className="p-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page Number Buttons */}
          <div className="flex items-center space-x-1">
            {pageNumbers.map((page, idx) => (
              <div key={idx}>
                {page === "..." ? (
                  <span className="px-3 py-2 text-gray-600 text-sm">...</span>
                ) : (
                  <button
                    onClick={() => onPageChange(page)}
                    disabled={isLoading || totalPages === 0}
                    className={`min-w-10 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      page === currentPage
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {page}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Next Button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={isLoading || currentPage === totalPages || totalPages === 0}
            title="Next page"
            className="p-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last Page Button */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={isLoading || currentPage === totalPages || totalPages === 0}
            title="Last page"
            className="p-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom: Page Info */}
      <div className="mt-4 text-center text-sm text-gray-600">
        Page <span className="font-semibold text-gray-900">{totalPages === 0 ? 0 : currentPage}</span> of{" "}
        <span className="font-semibold text-gray-900">{totalPages}</span>
      </div>
    </div>
  );
};

export default PaginationControl;
