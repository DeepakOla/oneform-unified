import axios, { InternalAxiosRequestConfig, AxiosError } from 'axios';

// Create a configured axios instance for the API
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  timeout: 10000,
  withCredentials: true, // Needed if using secure HTTP-only cookies in future
});

// Add an interceptor to insert the JWT token from localStorage into headers
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor to handle 401s globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // If we get a 401 Unauthorized, the token is dead or missing
    if (error.response?.status === 401) {
      // Clear storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
      
      // Only redirect if we're not already on the login page
      // Use window.location instead of React Router to force a hard reset
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);
