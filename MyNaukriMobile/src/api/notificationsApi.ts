import { apiClient } from './apiClient';

export const notificationsApi = {
  registerDeviceToken: async (token: string, platform: string): Promise<void> => {
    await apiClient.post('/Notifications/device-token', { token, platform });
  },

  unregisterDeviceToken: async (token: string): Promise<void> => {
    await apiClient.delete(`/Notifications/device-token?token=${encodeURIComponent(token)}`);
  },
};
