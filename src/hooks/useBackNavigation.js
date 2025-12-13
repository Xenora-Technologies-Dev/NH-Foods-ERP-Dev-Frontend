import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Hook to handle back navigation with history awareness
 * Falls back to default routes if no history exists
 */
export const useBackNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Default routes for fallback navigation
  const defaultRoutes = {
    '/dashboard': '/dashboard',
    '/vendor-creation': '/vendor-creation',
    '/customer-creation': '/customer-creation',
    '/stock-item-creation': '/stock-item-creation',
    '/stock-detail': '/stock-item-creation',
    '/unit-setup': '/unit-setup',
    '/staff-records': '/staff-records',
    '/settings': '/settings',
    '/purchase-order': '/purchase-order',
    '/approved-purchase': '/approved-purchase',
    '/sales-order': '/sales-order',
    '/approved-sales': '/approved-sales',
    '/inventory': '/inventory',
    '/purchase-return': '/purchase-return',
    '/sales-return': '/sales-return',
    '/category-management': '/category-management',
    '/receipt-voucher': '/receipt-voucher',
    '/payment-voucher': '/payment-voucher',
    '/journal-voucher': '/journal-voucher',
    '/contra-voucher': '/contra-voucher',
    '/expense-voucher': '/expense-voucher',
    '/debit-accounts': '/debit-accounts',
    '/credit-accounts': '/credit-accounts',
    '/transactions': '/transactions',
    '/transactors': '/transactors',
    '/vat-reports': '/vat-reports',
  };

  const goBack = useCallback(() => {
    // Try to go back using history
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback: go to dashboard
      navigate('/dashboard');
    }
  }, [navigate]);

  const goToPath = useCallback((path) => {
    navigate(path);
  }, [navigate]);

  const goToDashboard = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const getDefaultRoute = useCallback((currentPath) => {
    const pathname = currentPath || location.pathname;
    
    // Check if route has an ID parameter
    const withoutId = pathname.replace(/\/[a-zA-Z0-9]+$/, '');
    
    return defaultRoutes[withoutId] || defaultRoutes[pathname] || '/dashboard';
  }, [location.pathname]);

  return {
    goBack,
    goToPath,
    goToDashboard,
    getDefaultRoute,
    canGoBack: window.history.length > 1,
  };
};

export default useBackNavigation;
