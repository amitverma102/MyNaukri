import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://mynaukri-backend.greendune-87ffa7a1.centralus.azurecontainerapps.io';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      const isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/';
      
      if (!isLoginRequest && !isLoginPage) {
        // Clear token and redirect to login if unauthorized
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_role');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
