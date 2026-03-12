/**
 * OneForm Unified Platform — Root App Component
 *
 * Provider stack (outermost first):
 * 1. BrowserRouter        — React Router v7
 * 2. QueryClientProvider  — TanStack Query v5
 * 3. ThemeProvider        — Dark/light mode (system default)
 * 4. AuthProvider         — JWT auth context
 * 5. ToastProvider        — Radix UI toasts
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { lazy, Suspense } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';

// Lazy-loaded module pages (reduces initial bundle size)
const LoginPage = lazy(() => import('@/components/modules/auth/LoginPage.js'));
const RegisterPage = lazy(() => import('@/components/modules/auth/RegisterPage.js'));
const DashboardShell = lazy(() => import('@/components/dashboard/DashboardShell.js'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        const status = (error as { status?: number }).status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

function LoadingFallback() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<div className="flex h-screen items-center justify-center"><h1 className="text-2xl font-bold text-gradient">OneForm — Coming Soon 🚀</h1></div>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected routes — DashboardShell handles auth check */}
              <Route path="/dashboard/*" element={<DashboardShell />} />

              {/* Module dashboards */}
              <Route path="/general/*" element={<DashboardShell />} />
              <Route path="/operator/*" element={<DashboardShell />} />
              <Route path="/business/*" element={<DashboardShell />} />
              <Route path="/admin/*" element={<DashboardShell />} />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>

        {/* TanStack Query Devtools — only in development */}
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </AuthProvider>
  );
}
