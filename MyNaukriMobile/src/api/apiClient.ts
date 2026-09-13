import axios from 'axios';
import { getToken, deleteToken } from '../storage/secureStorage';
import { Platform } from 'react-native';

// Use appropriate localhost mapping for iOS Simulator vs Android Emulator
// For physical devices on the same Wi-Fi, change this to your computer's IP (e.g., http://192.168.1.5:5206/api)
// In production, this would be an environment variable (e.g. process.env.EXPO_PUBLIC_API_URL)
export const API_BASE_URL = 'https://mynaukri-backend.greendune-87ffa7a1.centralus.azurecontainerapps.io/api';


export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach JWT token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 Unauthorized globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Token is invalid or expired, clear it
      await deleteToken();
      // TODO: Dispatch a logout action or use an event emitter to update AuthContext
    }
    return Promise.reject(error);
  }
);
