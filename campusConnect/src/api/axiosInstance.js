import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  // DO NOT set Content-Type here - let browser set it automatically
  // This is critical for FormData to work with proper boundary
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // CRITICAL FIX: Remove Content-Type for FormData to let browser set it with boundary
    // This prevents the Authorization header from being stripped
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      
      // Debug: Log FormData size
      console.log('🔍 Axios sending FormData:');
      let totalSize = 0;
      for (let [key, value] of config.data.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: ${value.name} (${value.size} bytes)`);
          totalSize += value.size;
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }
      console.log(`  Total size: ${totalSize} bytes`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
