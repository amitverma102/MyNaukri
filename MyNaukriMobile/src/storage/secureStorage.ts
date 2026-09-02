import * as SecureStore from 'expo-secure-store';

const JWT_KEY = 'mynaukri_jwt';

export const saveToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(JWT_KEY, token);
  } catch (error) {
    console.error('Error saving token', error);
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(JWT_KEY);
  } catch (error) {
    console.error('Error getting token', error);
    return null;
  }
};

export const deleteToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(JWT_KEY);
  } catch (error) {
    console.error('Error deleting token', error);
  }
};
