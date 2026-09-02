import React, { createContext, useState, useEffect, useContext } from 'react';
import { getToken, saveToken as saveSecureToken, deleteToken as removeSecureToken } from '../storage/secureStorage';
import { apiClient } from '../api/apiClient';
import { jwtDecode } from 'jwt-decode';

export interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'Candidate' | 'Recruiter' | 'InstituteAdministrator' | 'SuperAdministrator';
}

interface AuthContextData {
  isLoading: boolean;
  userToken: string | null;
  userInfo: UserInfo | null;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const decodeUserFromToken = (token: string): UserInfo | null => {
    try {
      const decoded: any = jwtDecode(token);
      return {
        id: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || decoded.sub || '',
        email: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || decoded.email || '',
        firstName: '', // The JWT doesn't contain names by default in this implementation unless added
        lastName: '',
        role: decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || decoded.role || '',
      };
    } catch (e) {
      console.error('Failed to decode token', e);
      return null;
    }
  };

  useEffect(() => {
    const bootstrapAsync = async () => {
      let token;
      try {
        token = await getToken();
        if (token) {
          const user = decodeUserFromToken(token);
          if (user) {
            setUserToken(token);
            setUserInfo(user);
          } else {
            await removeSecureToken(); // invalid token
          }
        }
      } catch (e) {
        console.error('Restoring token failed', e);
      }
      setIsLoading(false);
    };

    bootstrapAsync();
  }, []);

  const signIn = async (token: string) => {
    const user = decodeUserFromToken(token);
    if (user) {
      await saveSecureToken(token);
      setUserToken(token);
      setUserInfo(user);
    }
  };

  const signOut = async () => {
    await removeSecureToken();
    setUserToken(null);
    setUserInfo(null);
  };

  return (
    <AuthContext.Provider value={{ isLoading, userToken, userInfo, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
