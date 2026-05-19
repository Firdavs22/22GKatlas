import axios from 'axios';
import { API_URL } from './network';

const COOKIE_OPTIONS = 'path=/; SameSite=Lax';

export const api = axios.create({
  baseURL: `${API_URL.replace(/\/+$/, '')}/api`,
  withCredentials: true, // send/receive httpOnly auth cookies + XSRF-TOKEN
});

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Track if we're currently refreshing to prevent multiple simultaneous refresh calls
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  failedQueue = [];
};

export function storeAuthData(data: { token: string; refreshToken: string; user: { role: string } }) {
  localStorage.setItem('token', data.token);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.user));
  document.cookie = `token=${encodeURIComponent(data.token)}; ${COOKIE_OPTIONS}`;
  document.cookie = `role=${encodeURIComponent(data.user.role)}; ${COOKIE_OPTIONS}`;
}

export function clearAuthData() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  document.cookie = `token=; ${COOKIE_OPTIONS}; Max-Age=0`;
  document.cookie = `role=; ${COOKIE_OPTIONS}; Max-Age=0`;
}

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Cookie-based auth comes for free via withCredentials. We keep the
    // Authorization header for back-compat (legacy stored tokens, mobile clients).
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // CSRF: echo XSRF-TOKEN cookie back as X-XSRF-TOKEN header for mutating ops.
    const method = (config.method || 'get').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      const xsrf = readCookie('XSRF-TOKEN');
      if (xsrf) config.headers['X-XSRF-TOKEN'] = xsrf;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    if (!originalRequest) return Promise.reject(err);

    // If 401 and we haven't tried to refresh yet
    if (err.response?.status === 401 && !originalRequest._retry && typeof window !== 'undefined') {
      // Don't try to refresh if this was the refresh request itself or login
      if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
        clearAuthData();
        window.location.href = '/login';
        return Promise.reject(err);
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        clearAuthData();
        window.location.href = '/login';
        return Promise.reject(err);
      }

      try {
        // Refresh works with either the cookie OR the body token; we always send body
        // for safety, but withCredentials carries the cookie too.
        const { data } = await axios.post(
          `${API_URL}/api/auth/refresh`,
          { refreshToken },
          { withCredentials: true },
        );
        storeAuthData(data);

        processQueue(null, data.token);
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearAuthData();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  },
);

export default api;
