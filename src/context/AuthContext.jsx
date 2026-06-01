import React, { createContext, useState, useEffect } from 'react';
import { apiLogin, apiRegister, getTokenUser } from '../lib/db';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ttm_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const payload = await getTokenUser(token);
          if (payload) {
            const storedUser = JSON.parse(localStorage.getItem('ttm_user') || 'null');
            if (storedUser) setUser(storedUser);
          } else {
            logout();
          }
        } catch {
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await apiLogin(email, password);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('ttm_token', res.token);
    localStorage.setItem('ttm_user', JSON.stringify(res.user));
  };

  const register = async (name, email, password, role) => {
    await apiRegister(name, email, password, role);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('ttm_token');
    localStorage.removeItem('ttm_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
