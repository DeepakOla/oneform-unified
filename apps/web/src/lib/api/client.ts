import axios, { InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';

// Create a configured axios instance for the API
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  timeout: 10000,
});

// ── Request interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ── Response interceptor: silent token refresh on 401 ────────────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  for (const p of pendingQueue) {
    if (error) {
      p.reject(error);
    } else {
      p.resolve(token!);
    }
  }
  pendingQueue = [];
}

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only attempt refresh on 401, and only once per request
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh if we're already on an auth endpoint
    const url = originalRequest.url ?? '';
    if (url.includes('/api/auth/login') || url.includes('/api/auth/register') || url.includes('/api/auth/refresh')) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      // No refresh token — force logout
      forceLogout();
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise<AxiosResponse>((resolve, reject) => {
        pendingQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            originalRequest._retry = true;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      // Call refresh endpoint (use raw axios to avoid interceptor loop)
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/refresh`,
        { refreshToken },
      );

      const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data.tokens;
      localStorage.setItem('access_token', newAccess);
      localStorage.setItem('refresh_token', newRefresh);

      // Retry the original request with new token
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      processQueue(null, newAccess);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      forceLogout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

function forceLogout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_data');
  if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
    window.location.href = '/login?expired=true';
  }
}
