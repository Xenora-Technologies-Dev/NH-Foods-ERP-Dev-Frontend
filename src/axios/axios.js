import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://nh-foods-erp-dev-backend.onrender.com/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor to add Bearer token from sessionStorage
axiosInstance.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("accessToken");
    console.log("Request Interceptor - Token:", token); // Debug log
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh and errors
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Only attempt refresh in non-test environments to avoid network calls during unit tests
    if (process.env.NODE_ENV !== 'test' && error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(
          "https://nh-foods-erp-dev-backend.onrender.com/api/v1/refresh-token",
          {},
          { withCredentials: true }
        );
        if (data.success && data.data?.accessToken) {
          const newAccessToken = data.data.accessToken;
          try { sessionStorage.setItem("accessToken", newAccessToken); } catch (e) {}
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axiosInstance(originalRequest);
        } else {
          throw new Error("Invalid refresh token response");
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        try { sessionStorage.removeItem("accessToken"); } catch (e) {}
        // In browser (non-test) redirect to login on refresh failure
        if (typeof window !== 'undefined') {
          window.location.href = "/";
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;