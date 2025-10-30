import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setToken } from '../lib/api';

interface User {
  id: number;
  email: string;
  display_name: string;
  date_joined: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, displayName: string, password: string, passwordConfirm: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setToken(token);
      // Verify token and get user info
      api.get('/auth/profile/')
        .then(response => {
          setUser(response.data);
        })
        .catch(() => {
          // Token is invalid, clear it
          localStorage.removeItem('token');
          setToken();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login/', { email, password });
      const { access, user: userData } = response.data;
      
      localStorage.setItem('token', access);
      setToken(access);
      setUser(userData);
    } catch (error: any) {
      setLoading(false);
      throw new Error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, displayName: string, password: string, passwordConfirm: string) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register/', {
        email,
        display_name: displayName,
        password,
        password_confirm: passwordConfirm
      });
      const { access, user: userData } = response.data;
      
      localStorage.setItem('token', access);
      setToken(access);
      setUser(userData);
    } catch (error: any) {
      setLoading(false);
      const errorData = error.response?.data;
      if (errorData?.email) {
        throw new Error(errorData.email[0]);
      } else if (errorData?.password) {
        throw new Error(errorData.password[0]);
      } else if (errorData?.non_field_errors) {
        throw new Error(errorData.non_field_errors[0]);
      } else {
        throw new Error('Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken();
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
