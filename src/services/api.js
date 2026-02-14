/**
 * Centralized API service layer for all ERP data fetching.
 * Each method returns a promise — consumed by React Query hooks.
 * 
 * Supports both paginated and non-paginated modes:
 * - With page/limit params → returns { data, pagination }
 * - Without → returns raw array (backward compatible)
 */
import axiosInstance from '../axios/axios';

// ─── Helpers ──────────────────────────────────────────────
const buildParams = (filters = {}) => {
  const params = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params[key] = value;
    }
  });
  return params;
};

// ─── Stock ────────────────────────────────────────────────
export const stockApi = {
  getAll: async (filters = {}) => {
    const { data } = await axiosInstance.get('/stock/stock', {
      params: buildParams(filters),
    });
    // Paginated response
    if (data.pagination) {
      return {
        items: data.data?.stocks || data.data || [],
        pagination: data.pagination,
      };
    }
    // Legacy response
    return {
      items: data.data?.stocks || data.data || [],
      pagination: null,
    };
  },

  getById: async (id) => {
    const { data } = await axiosInstance.get(`/stock/stock/${id}`);
    return data.data?.stock || data.data;
  },
};

// ─── Customers ────────────────────────────────────────────
export const customerApi = {
  getAll: async (filters = {}) => {
    const { data } = await axiosInstance.get('/customers/customers', {
      params: buildParams(filters),
    });
    if (data.pagination) {
      return {
        items: data.data || [],
        pagination: data.pagination,
      };
    }
    return {
      items: data.data || [],
      pagination: null,
    };
  },

  getById: async (id) => {
    const { data } = await axiosInstance.get(`/customers/customers/${id}`);
    return data.data;
  },
};

// ─── Vendors ──────────────────────────────────────────────
export const vendorApi = {
  getAll: async (filters = {}) => {
    const { data } = await axiosInstance.get('/vendors/vendors', {
      params: buildParams(filters),
    });
    if (data.pagination) {
      return {
        items: data.data || [],
        pagination: data.pagination,
      };
    }
    return {
      items: data.data || [],
      pagination: null,
    };
  },

  getById: async (id) => {
    const { data } = await axiosInstance.get(`/vendors/vendors/${id}`);
    return data.data;
  },
};

// ─── Staff ────────────────────────────────────────────────
export const staffApi = {
  getAll: async (filters = {}) => {
    const { data } = await axiosInstance.get('/staff/staff', {
      params: buildParams(filters),
    });
    if (data.pagination) {
      return {
        items: data.data?.staff || data.data || [],
        pagination: data.pagination,
      };
    }
    return {
      items: data.data?.staff || data.data || [],
      pagination: null,
    };
  },
};

// ─── UOM ──────────────────────────────────────────────────
export const uomApi = {
  getAll: async (filters = {}) => {
    const { data } = await axiosInstance.get('/uom/units', {
      params: buildParams(filters),
    });
    if (data.pagination) {
      return {
        items: data.data || [],
        pagination: data.pagination,
      };
    }
    return {
      items: Array.isArray(data.data) ? data.data : [],
      pagination: null,
    };
  },

  getConversions: async () => {
    const { data } = await axiosInstance.get('/uom/conversions');
    return Array.isArray(data.data) ? data.data : [];
  },
};

// ─── Categories ───────────────────────────────────────────
export const categoryApi = {
  getAll: async (filters = {}) => {
    const { data } = await axiosInstance.get('/categories/categories', {
      params: buildParams(filters),
    });
    return {
      items: data.data?.categories || data.data || [],
      pagination: data.pagination || null,
    };
  },
};

// ─── Transactions ─────────────────────────────────────────
export const transactionApi = {
  getAll: async (filters = {}) => {
    const { data } = await axiosInstance.get('/transactions/transactions', {
      params: buildParams(filters),
    });
    return {
      items: data.data?.transactions || data.data || [],
      pagination: data.pagination || null,
    };
  },

  getById: async (id) => {
    const { data } = await axiosInstance.get(`/transactions/transactions/${id}`);
    return data.data;
  },
};
