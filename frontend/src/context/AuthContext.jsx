import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setAuthToken } from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState({ isConnected: false, status: 'checking', message: '' });

  const checkHealthAndSession = useCallback(async () => {
    setLoading(true);
    try {
      const healthRes = await api.get('/health');
      const db = healthRes.data?.database || { isConnected: false, status: 'disconnected' };
      setDbStatus(db);

      if (db.isConnected) {
        try {
          const meRes = await api.get('/auth/me');
          setUser(meRes.data?.user || null);
        } catch {
          setAuthToken(null);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setDbStatus({
        isConnected: false,
        status: 'unreachable',
        message: 'Unable to reach backend API.',
      });
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealthAndSession();
  }, [checkHealthAndSession]);

  const login = async (email, password, selectedRole) => {
    const res = await api.post('/auth/login', { email, password, selectedRole });
    const roleLabels = {
      patient: 'Patient',
      doctor: 'Doctor',
      admin: 'Admin',
    };
    if (selectedRole && res.data?.user?.role !== selectedRole) {
      setAuthToken(null);
      throw new Error(
        `This account is not registered as a ${roleLabels[selectedRole] || selectedRole}. Please select the correct login option.`
      );
    }
    if (res.data?.token) {
      setAuthToken(res.data.token);
    }
    setUser(res.data.user);
    return res.data;
  };

  const register = async (payload) => {
    const res = await api.post('/auth/register', payload);
    if (res.data?.token) {
      setAuthToken(res.data.token);
    }
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAuthToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    const res = await api.get('/auth/me');
    setUser(res.data.user);
    return res.data.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        dbStatus,
        login,
        register,
        logout,
        refreshUser,
        checkHealthAndSession,
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
