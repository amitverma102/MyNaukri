import { apiClient } from './apiClient';

export interface LoginResponse {
  token: string;
  message?: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/Auth/login', { email, password });
    return response.data;
  },
  
  register: async (firstName: string, lastName: string, email: string, password: string): Promise<any> => {
    const response = await apiClient.post('/Auth/register', {
      firstName,
      lastName,
      email,
      password,
      role: 0 // Role.Candidate
    });
    return response.data;
  },

  verifyOtp: async (email: string, otp: string): Promise<any> => {
    const response = await apiClient.post('/Auth/verify-otp', { email, otp });
    return response.data;
  },

  forgotPassword: async (email: string): Promise<any> => {
    const response = await apiClient.post('/Auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (email: string, otp: string, newPassword: string): Promise<any> => {
    const response = await apiClient.post('/Auth/reset-password', { email, otp, newPassword });
    return response.data;
  },

  deleteAccount: async (): Promise<any> => {
    const response = await apiClient.delete('/Auth/account');
    return response.data;
  },
};
