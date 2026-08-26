// web/src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { getSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('nexora_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('nexora_token'));
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const statusRes = await authApi.getStatus();
        if (statusRes.data.setupRequired) {
          setSetupRequired(true);
          setLoading(false);
          return;
        }

        if (token) {
          const meRes = await authApi.getMe();
          setUser(meRes.data.user);
          localStorage.setItem('nexora_user', JSON.stringify(meRes.data.user));
          getSocket();
        }
      } catch (err) {
        console.warn('Auth check failed:', err.message);
        localStorage.removeItem('nexora_token');
        localStorage.removeItem('nexora_user');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [token]);

  const login = async (identifier, password) => {
    const res = await authApi.login(identifier, password);
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('nexora_token', newToken);
    localStorage.setItem('nexora_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    getSocket();
    return newUser;
  };

  const register = async (username, email, password) => {
    const res = await authApi.register(username, email, password);
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('nexora_token', newToken);
    localStorage.setItem('nexora_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setSetupRequired(false);
    getSocket();
    return newUser;
  };

  const logout = () => {
    localStorage.removeItem('nexora_token');
    localStorage.removeItem('nexora_user');
    setToken(null);
    setUser(null);
    disconnectSocket();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        setupRequired,
        login,
        register,
        logout,
        isAuthenticated: !!user
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
