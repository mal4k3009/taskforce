import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('taskforce_token');
    const storedUser = localStorage.getItem('taskforce_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const apiFetch = useCallback(async (url, options = {}) => {
    const headers = { ...options.headers };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
    if (res.status === 401 && !options._silent) {
      logout();
      throw new Error('Session expired');
    }
    return res;
  }, [token]);

  const register = async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Registration failed');
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('taskforce_token', data.access_token);
    localStorage.setItem('taskforce_user', JSON.stringify(data.user));
    return data;
  };

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed');
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('taskforce_token', data.access_token);
    localStorage.setItem('taskforce_user', JSON.stringify(data.user));
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('taskforce_token');
    localStorage.removeItem('taskforce_user');
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    const nonceRes = await apiFetch('/api/auth/nonce');
    const { nonce } = await nonceRes.json();

    let provider = window.ethereum;
    if (provider.providers?.length) {
      provider = provider.providers.find(p => p.isMetaMask) || provider;
    }

    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    const walletAddress = accounts[0];

    const hexNonce = '0x' + Array.from(new TextEncoder().encode(nonce))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const signature = await provider.request({
      method: 'personal_sign',
      params: [hexNonce, walletAddress],
    });

    const res = await apiFetch('/api/auth/connect-wallet', {
      method: 'POST',
      body: JSON.stringify({ wallet_address: walletAddress, signature, nonce }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Wallet connection failed');

    setUser(prev => ({ ...prev, wallet_address: walletAddress }));
    const stored = JSON.parse(localStorage.getItem('taskforce_user') || '{}');
    stored.wallet_address = walletAddress;
    localStorage.setItem('taskforce_user', JSON.stringify(stored));

    return data;
  };

  const disconnectWallet = async () => {
    const res = await apiFetch('/api/auth/disconnect-wallet', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Failed to disconnect wallet');

    setUser(prev => {
      const updated = { ...prev };
      delete updated.wallet_address;
      return updated;
    });
    const stored = JSON.parse(localStorage.getItem('taskforce_user') || '{}');
    delete stored.wallet_address;
    localStorage.setItem('taskforce_user', JSON.stringify(stored));
  };

    const updateProfile = async (full_name, bio) => {
      const res = await apiFetch('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ full_name, bio })
      });
      const updatedUser = await res.json();
      if (!res.ok) throw new Error(updatedUser.detail || 'Failed to update profile');
      
      setUser(updatedUser);
      localStorage.setItem('taskforce_user', JSON.stringify(updatedUser));
      return updatedUser;
    };

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout, connectWallet, disconnectWallet, updateProfile, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
