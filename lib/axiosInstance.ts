import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const axiosInstance = axios.create({
  baseURL: "/", // since using Next.js API routes
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

let currentAccessToken: string | null = null;
let tokenRefreshPromise: Promise<string> | null = null;

// this function is called by the useAuth hook when the token changes

export function setAccessToken(token: string | null) {
  currentAccessToken = token;
}

/**
 * Get the current access token
 */
export function getAccessToken(): string | null {
  return currentAccessToken;
}

/**
 * Refresh the access token using the refresh token cookie
 * Returns a promise that resolves to the new access token
 */
async function refreshAccessToken(): Promise<string> {
  try {
    const response = await axios.post("/api/auth/refresh");
    const newAccessToken = response.data.accessToken;

    // Update the current token
    currentAccessToken = newAccessToken;

    return newAccessToken;
  } catch (error) {
    // If refresh fails, clear the token
    currentAccessToken = null;
    throw error;
  }
}

/**
 * Request interceptor - adds the access token to all requests
 */
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add access token to request headers if available
    if (currentAccessToken && config.headers) {
      config.headers.Authorization = `Bearer ${currentAccessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// handle 401 errors and automatic token refresh

axiosInstance.interceptors.response.use(
  (response) => {
    // If response is successful, just return it
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Check if error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Prevent infinite retry loops
      originalRequest._retry = true;

      // Skip refresh for auth endpoints to prevent infinite loops
      if (
        originalRequest.url?.includes("/api/auth/me") ||
        originalRequest.url?.includes("/api/auth/login") ||
        originalRequest.url?.includes("/api/auth/register") ||
        originalRequest.url?.includes("/api/auth/refresh")
      ) {
        return Promise.reject(error);
      }

      try {
        // If a refresh is already in progress, wait for it
        if (!tokenRefreshPromise) {
          tokenRefreshPromise = refreshAccessToken();
        }

        const newAccessToken = await tokenRefreshPromise;
        tokenRefreshPromise = null;

        // Update the original request with the new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        // Retry the original request with the new token
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear the promise and reject
        tokenRefreshPromise = null;

        // Trigger logout by dispatching a custom event
        // This will be caught by the useAuth hook
        window.dispatchEvent(new Event("auth:token-refresh-failed"));

        return Promise.reject(refreshError);
      }
    }

    // For other errors, just reject
    return Promise.reject(error);
  }
);

export default axiosInstance;
