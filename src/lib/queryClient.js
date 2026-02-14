import { QueryClient } from '@tanstack/react-query';

/**
 * Global QueryClient configuration for the ERP system.
 * 
 * Strategy: Stale-While-Revalidate (SWR)
 * - Data is cached and served instantly on re-visit
 * - Background refetch happens silently after staleTime
 * - Users see data immediately, never wait for loading on repeat visits
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 2 minutes — no refetch during this window
      staleTime: 2 * 60 * 1000,
      // Cache persists for 10 minutes after component unmount
      gcTime: 10 * 60 * 1000,
      // Retry failed requests up to 2 times with exponential backoff
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Refetch on window focus (user returns to tab)
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect automatically 
      refetchOnReconnect: 'always',
      // Keep previous data visible while fetching new page
      placeholderData: (previousData) => previousData,
    },
    mutations: {
      retry: 1,
    },
  },
});

export default queryClient;
