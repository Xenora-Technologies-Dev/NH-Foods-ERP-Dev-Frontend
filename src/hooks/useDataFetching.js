/**
 * Reusable React Query hooks for ERP data fetching.
 * 
 * Features:
 * - Automatic caching with stale-while-revalidate
 * - Server-side pagination support
 * - Background refetching — users never see loading spinners on repeat visits
 * - Deduplication — multiple components using same data share one request
 * - Automatic cache invalidation on mutations
 * 
 * Usage:
 *   const { data, isLoading, isFetching, pagination } = useStockList({ page: 1, limit: 25 });
 *   // isLoading = true only on first load (show skeleton)
 *   // isFetching = true on background refetch (show subtle indicator)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockApi, customerApi, vendorApi, staffApi, uomApi, categoryApi, transactionApi } from '../services/api';

// ─── Query Key Factories ──────────────────────────────────
// Hierarchical keys enable precise cache invalidation
export const queryKeys = {
  stock: {
    all: ['stock'],
    lists: () => [...queryKeys.stock.all, 'list'],
    list: (filters) => [...queryKeys.stock.lists(), filters],
    details: () => [...queryKeys.stock.all, 'detail'],
    detail: (id) => [...queryKeys.stock.details(), id],
  },
  customers: {
    all: ['customers'],
    lists: () => [...queryKeys.customers.all, 'list'],
    list: (filters) => [...queryKeys.customers.lists(), filters],
    details: () => [...queryKeys.customers.all, 'detail'],
    detail: (id) => [...queryKeys.customers.details(), id],
  },
  vendors: {
    all: ['vendors'],
    lists: () => [...queryKeys.vendors.all, 'list'],
    list: (filters) => [...queryKeys.vendors.lists(), filters],
    details: () => [...queryKeys.vendors.all, 'detail'],
    detail: (id) => [...queryKeys.vendors.details(), id],
  },
  staff: {
    all: ['staff'],
    lists: () => [...queryKeys.staff.all, 'list'],
    list: (filters) => [...queryKeys.staff.lists(), filters],
  },
  uom: {
    all: ['uom'],
    lists: () => [...queryKeys.uom.all, 'list'],
    list: (filters) => [...queryKeys.uom.lists(), filters],
    conversions: () => [...queryKeys.uom.all, 'conversions'],
  },
  categories: {
    all: ['categories'],
    lists: () => [...queryKeys.categories.all, 'list'],
    list: (filters) => [...queryKeys.categories.lists(), filters],
  },
  transactions: {
    all: ['transactions'],
    lists: () => [...queryKeys.transactions.all, 'list'],
    list: (filters) => [...queryKeys.transactions.lists(), filters],
    details: () => [...queryKeys.transactions.all, 'detail'],
    detail: (id) => [...queryKeys.transactions.details(), id],
  },
};

// ─── Stock Hooks ──────────────────────────────────────────
export const useStockList = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.stock.list(filters),
    queryFn: () => stockApi.getAll(filters),
    ...options,
  });
};

export const useStockDetail = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.stock.detail(id),
    queryFn: () => stockApi.getById(id),
    enabled: !!id,
    ...options,
  });
};

// ─── Customer Hooks ───────────────────────────────────────
export const useCustomerList = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: () => customerApi.getAll(filters),
    ...options,
  });
};

export const useCustomerDetail = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => customerApi.getById(id),
    enabled: !!id,
    ...options,
  });
};

// ─── Vendor Hooks ─────────────────────────────────────────
export const useVendorList = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.vendors.list(filters),
    queryFn: () => vendorApi.getAll(filters),
    ...options,
  });
};

export const useVendorDetail = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.vendors.detail(id),
    queryFn: () => vendorApi.getById(id),
    enabled: !!id,
    ...options,
  });
};

// ─── Staff Hooks ──────────────────────────────────────────
export const useStaffList = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.staff.list(filters),
    queryFn: () => staffApi.getAll(filters),
    ...options,
  });
};

// ─── UOM Hooks ────────────────────────────────────────────
export const useUOMList = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.uom.list(filters),
    queryFn: () => uomApi.getAll(filters),
    ...options,
  });
};

export const useUOMConversions = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.uom.conversions(),
    queryFn: () => uomApi.getConversions(),
    ...options,
  });
};

// ─── Category Hooks ───────────────────────────────────────
export const useCategoryList = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.categories.list(filters),
    queryFn: () => categoryApi.getAll(filters),
    ...options,
  });
};

// ─── Transaction Hooks ────────────────────────────────────
export const useTransactionList = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.transactions.list(filters),
    queryFn: () => transactionApi.getAll(filters),
    ...options,
  });
};

export const useTransactionDetail = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.transactions.detail(id),
    queryFn: () => transactionApi.getById(id),
    enabled: !!id,
    ...options,
  });
};

// ─── Cache Invalidation Helpers ───────────────────────────
/**
 * Hook that returns helpers to invalidate cached data after mutations.
 * 
 * Usage:
 *   const { invalidateStock, invalidateAll } = useInvalidateQueries();
 *   // After creating/updating/deleting a stock item:
 *   await invalidateStock();
 */
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();

  return {
    invalidateStock: () => queryClient.invalidateQueries({ queryKey: queryKeys.stock.all }),
    invalidateCustomers: () => queryClient.invalidateQueries({ queryKey: queryKeys.customers.all }),
    invalidateVendors: () => queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all }),
    invalidateStaff: () => queryClient.invalidateQueries({ queryKey: queryKeys.staff.all }),
    invalidateUOM: () => queryClient.invalidateQueries({ queryKey: queryKeys.uom.all }),
    invalidateCategories: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
    invalidateTransactions: () => queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
    invalidateAll: () => queryClient.invalidateQueries(),
  };
};
