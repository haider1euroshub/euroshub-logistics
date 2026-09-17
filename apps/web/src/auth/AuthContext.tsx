import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { apiClient } from '../api/client.js';
import { Role } from '@eliteship/shared';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  customerProfile?: { id: string } | null;
  driverProfile?: { id: string; homeHubId?: string } | null;
  hubStaffProfile?: { id: string; hubId: string } | null;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, fullName: string, phone: string) => Promise<{ requiresVerification: boolean; email: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Permanently ensure dark mode is disabled
    document.documentElement.classList.remove('dark');
    try {
      localStorage.removeItem('euroshub_dark');
      localStorage.removeItem('eliteship_dark');
    } catch (e) {
      // ignore
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await apiClient<{ user: UserProfile }>('/api/auth/me');
      setUser(data.user);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Initial auth state check from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        localStorage.setItem('euroshub_auth_token', session.access_token);
        fetchProfile();
      } else {
        const storedToken = localStorage.getItem('euroshub_auth_token') || localStorage.getItem('eliteship_auth_token');
        if (storedToken) {
          fetchProfile();
        } else {
          setLoading(false);
        }
      }
    });

    // 2. Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        localStorage.setItem('euroshub_auth_token', session.access_token);
        fetchProfile();
      } else {
        localStorage.removeItem('euroshub_auth_token');
        localStorage.removeItem('eliteship_auth_token');
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error || !data.session) {
      throw new Error(error?.message || 'Login failed. Please check credentials.');
    }

    localStorage.setItem('euroshub_auth_token', data.session.access_token);
    await fetchProfile();
  };

  const register = async (email: string, pass: string, fullName: string, phone: string) => {
    await apiClient('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass, fullName, phone }),
    });

    try {
      // If project has auto-confirm enabled or session is granted, sign in
      await login(email, pass);
      return { requiresVerification: false, email };
    } catch {
      // If email verification is mandatory in Supabase, sign-in throws 'Email not confirmed'
      return { requiresVerification: true, email };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('euroshub_auth_token');
    localStorage.removeItem('eliteship_auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
