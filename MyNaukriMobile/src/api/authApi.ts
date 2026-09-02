import { apiClient } from './apiClient';

export interface LoginResponse {
  token: string;
  message?: string;
}

export const authApi = {
  login: async (email: string, password: string):Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/Auth/login', { email, password });
    return response.data;
  },
  
  // Example for registration
  // register: async (data: any) => { ... }
};
