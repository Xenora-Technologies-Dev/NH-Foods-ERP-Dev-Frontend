import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Responsive data table component
 * Handles sorting, pagination, and responsive display
 */
export const DataTable = ({
  columns = [],
  data = [],
  onSort,
  sortBy,
  sortOrder = 'asc',
  loading = false,
  emptyMessage = 'No data available',
  rowClassName = '',
  onRowClick,
  compact = false,
  striped = true,
  hover = true
}) => {
  const handleSort = (columnKey) => {
    const newOrder = 
      sortBy === columnKey && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort?.(columnKey, newOrder);
  };

  if (loading) {
    return (
      <div className="w-full h-40 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full py-12 text-center">
        <p className="text-gray-500 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider ${
                  column.sortable ? 'cursor-pointer hover:bg-gray-200/50' : ''
                }`}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-2">
                  <span>{column.label}</span>
                  {column.sortable && (
                    <>
                      {sortBy === column.key ? (
                        sortOrder === 'asc' ? (
                          <ChevronUp size={16} className="text-gray-600" />
                        ) : (
                          <ChevronDown size={16} className="text-gray-600" />
                        )
                      ) : (
                        <div className="w-4 h-4"></div>
                      )}
                    </>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              onClick={() => onRowClick?.(row)}
              className={`
                transition-all duration-200
                ${striped && rowIndex % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}
                ${hover ? 'hover:bg-blue-50/50' : ''}
                ${onRowClick ? 'cursor-pointer' : ''}
                ${rowClassName}
              `}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`
                    px-6 py-4 text-sm
                    ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                    ${column.className || 'text-gray-900'}
                  `}
                >
                  {column.render
                    ? column.render(row[column.key], row)
                    : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Pagination component
 */
export const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  itemsPerPage = 10,
  totalItems = 0
}) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between mt-6 p-4 border-t border-gray-200/50">
      <div className="text-sm text-gray-600">
        Showing {startItem} to {endItem} of {totalItems} results
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Previous
        </button>
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`
              px-3 py-2 rounded-lg border transition
              ${currentPage === page
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default {
  DataTable,
  Pagination
};
