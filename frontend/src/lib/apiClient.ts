import axios from "axios";
import { clearAuthToken, getAuthToken } from "@/lib/authToken";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // Allow cookies (for Firebase session cookie set by backend)
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();

  // Keep sending Authorization header if a token
  // is available, but the backend now prefers the
  // long-lived session cookie when present.
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAuthToken();
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        const isAuthRoute = path.startsWith("/auth");
        if (!isAuthRoute) {
          window.location.href = "/auth/login";
        }
      }
    }
    return Promise.reject(error);
  }
);
