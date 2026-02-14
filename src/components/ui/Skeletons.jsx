/**
 * Reusable skeleton/shimmer loading components for the ERP system.
 * These replace full-page spinners with content-aware placeholders
 * that match the shape of the real content, providing a smoother UX.
 */
import React from 'react';

// ─── Base Shimmer Effect ──────────────────────────────────
const shimmerClass = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded';

/** Generic skeleton block */
export const SkeletonBlock = ({ className = '', width = 'w-full', height = 'h-4' }) => (
  <div className={`${shimmerClass} ${width} ${height} ${className}`} />
);

/** Skeleton circle (for avatars/icons) */
export const SkeletonCircle = ({ size = 'w-10 h-10', className = '' }) => (
  <div className={`${shimmerClass} ${size} rounded-full ${className}`} />
);

// ─── Stat Card Skeleton ───────────────────────────────────
export const StatCardSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <SkeletonBlock width="w-24" height="h-3" />
          <SkeletonCircle size="w-8 h-8" />
        </div>
        <SkeletonBlock width="w-16" height="h-7" className="mb-2" />
        <SkeletonBlock width="w-32" height="h-3" />
      </div>
    ))}
  </div>
);

// ─── Table Skeleton ───────────────────────────────────────
export const TableSkeleton = ({ rows = 8, columns = 6 }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    {/* Table header */}
    <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBlock key={i} width={i === 0 ? 'w-32' : 'w-24'} height="h-3" />
        ))}
      </div>
    </div>
    {/* Table rows */}
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div key={rowIdx} className={`px-6 py-4 flex gap-4 items-center ${rowIdx % 2 === 1 ? 'bg-gray-50/50' : ''} border-b border-gray-100`}>
        {Array.from({ length: columns }).map((_, colIdx) => (
          <SkeletonBlock
            key={colIdx}
            width={colIdx === 0 ? 'w-32' : colIdx === columns - 1 ? 'w-20' : 'w-24'}
            height="h-4"
          />
        ))}
      </div>
    ))}
  </div>
);

// ─── Search Bar Skeleton ──────────────────────────────────
export const SearchBarSkeleton = () => (
  <div className="flex items-center gap-4 mb-6">
    <SkeletonBlock width="w-80" height="h-10" className="rounded-lg" />
    <SkeletonBlock width="w-24" height="h-10" className="rounded-lg" />
    <SkeletonBlock width="w-24" height="h-10" className="rounded-lg" />
    <div className="flex-1" />
    <SkeletonBlock width="w-32" height="h-10" className="rounded-lg" />
  </div>
);

// ─── Full Page List Skeleton ──────────────────────────────
/** Complete page skeleton matching the typical ERP list page layout */
export const PageListSkeleton = ({ statCards = 4, tableRows = 8, tableColumns = 6 }) => (
  <div className="p-6 min-h-screen bg-gray-50">
    {/* Page header */}
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <SkeletonCircle size="w-10 h-10" />
        <div>
          <SkeletonBlock width="w-48" height="h-6" className="mb-2" />
          <SkeletonBlock width="w-64" height="h-3" />
        </div>
      </div>
      <SkeletonBlock width="w-36" height="h-10" className="rounded-lg" />
    </div>

    {/* Stat cards */}
    <StatCardSkeleton count={statCards} />

    {/* Search/filter bar */}
    <SearchBarSkeleton />

    {/* Table */}
    <TableSkeleton rows={tableRows} columns={tableColumns} />

    {/* Pagination */}
    <div className="mt-6 flex items-center justify-between">
      <SkeletonBlock width="w-48" height="h-4" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} width="w-10" height="h-10" className="rounded-lg" />
        ))}
      </div>
    </div>
  </div>
);

// ─── Card Grid Skeleton ───────────────────────────────────
export const CardGridSkeleton = ({ count = 6, columns = 3 }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-4`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <SkeletonCircle size="w-12 h-12" />
          <div className="flex-1">
            <SkeletonBlock width="w-32" height="h-4" className="mb-2" />
            <SkeletonBlock width="w-24" height="h-3" />
          </div>
        </div>
        <SkeletonBlock height="h-3" className="mb-2" />
        <SkeletonBlock width="w-3/4" height="h-3" className="mb-2" />
        <SkeletonBlock width="w-1/2" height="h-3" />
      </div>
    ))}
  </div>
);

// ─── Form Skeleton ────────────────────────────────────────
export const FormSkeleton = ({ fields = 6 }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <SkeletonBlock width="w-48" height="h-6" className="mb-6" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <SkeletonBlock width="w-24" height="h-3" className="mb-2" />
          <SkeletonBlock height="h-10" className="rounded-lg" />
        </div>
      ))}
    </div>
    <div className="flex justify-end gap-3 mt-6">
      <SkeletonBlock width="w-24" height="h-10" className="rounded-lg" />
      <SkeletonBlock width="w-32" height="h-10" className="rounded-lg" />
    </div>
  </div>
);

// ─── Inline Loading Indicator ─────────────────────────────
/** Subtle top-bar indicator for background refetching (isFetching but not isLoading) */
export const RefetchIndicator = ({ show = false }) => {
  if (!show) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1">
      <div className="h-full bg-blue-500 animate-[loading-bar_1.5s_ease-in-out_infinite] rounded-r-full"
        style={{ width: '30%' }}
      />
      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); width: 30%; }
          50% { transform: translateX(100%); width: 60%; }
          100% { transform: translateX(400%); width: 30%; }
        }
      `}</style>
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────
export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16">
    {Icon && <Icon size={48} className="text-gray-300 mb-4" />}
    <h3 className="text-lg font-semibold text-gray-600 mb-2">{title || 'No data found'}</h3>
    {description && <p className="text-gray-400 text-sm mb-4">{description}</p>}
    {action && action}
  </div>
);

export default {
  SkeletonBlock,
  SkeletonCircle,
  StatCardSkeleton,
  TableSkeleton,
  SearchBarSkeleton,
  PageListSkeleton,
  CardGridSkeleton,
  FormSkeleton,
  RefetchIndicator,
  EmptyState,
};
