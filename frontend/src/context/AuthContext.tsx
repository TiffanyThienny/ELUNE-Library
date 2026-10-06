import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User | undefined>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('elune_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('elune_token');
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('elune_token');
      if (storedToken) {
        try {
          const res = await authService.me();
          if (res.success && res.data.user) {
            setUser(res.data.user);
            localStorage.setItem('elune_user', JSON.stringify(res.data.user));
          } else {
            logout();
          }
        } catch (err) {
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authService.login({ email, password });
    if (res.success && res.data) {
      setUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem('elune_token', res.data.token);
      localStorage.setItem('elune_user', JSON.stringify(res.data.user));
      return res.data.user;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await authService.register({ name, email, password });
    if (res.success && res.data) {
      setUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem('elune_token', res.data.token);
      localStorage.setItem('elune_user', JSON.stringify(res.data.user));
    }
  };

  const logout = () => {
    authService.logout().catch(() => {});
    setUser(null);
    setToken(null);
    localStorage.removeItem('elune_token');
    localStorage.removeItem('elune_user');
  };

  const refreshUser = async () => {
    try {
      const res = await authService.me();
      if (res.success && res.data.user) {
        setUser(res.data.user);
        localStorage.setItem('elune_user', JSON.stringify(res.data.user));
      }
    } catch (e) {
      // ignore
    }
  };

  const isAdmin = user?.role === 'ADMIN';
  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAdmin,
        isAuthenticated,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
