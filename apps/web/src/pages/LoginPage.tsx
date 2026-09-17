import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Truck, AlertCircle } from 'lucide-react';
import { Role } from '@eliteship/shared';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getRoleDashboard = (role: Role): string => {
    switch (role) {
      case Role.ADMIN: return '/admin';
      case Role.HUB_STAFF: return '/hub/dashboard';
      case Role.DRIVER: return '/driver/dashboard';
      case Role.CUSTOMER: return '/customer/dashboard';
      default: return '/';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      const token = localStorage.getItem('euroshub_auth_token') || localStorage.getItem('eliteship_auth_token');
      const profileResp = await fetch(
        (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000') + '/api/auth/me',
        {
          headers: {
            Authorization: 'Bearer ' + token,
          },
        }
      );
      if (profileResp.ok) {
        const { data } = await profileResp.json();
        window.location.href = getRoleDashboard(data?.user?.role);
      } else {
        window.location.href = '/';
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (/email not confirmed/i.test(msg)) {
        setError('Your email address has not been confirmed yet. Please check your inbox for the verification link before logging in.');
      } else if (/inactive/i.test(msg) || /account_inactive/i.test(msg)) {
        setError('This account has been deactivated. Please contact your system administrator.');
      } else {
        setError(msg || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center mx-auto shadow-md shadow-brand-500/20">
            <Truck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Welcome to Euroshub Logistics
          </h1>
          <p className="text-xs text-slate-500">
            Enter your credentials to access your operating workspace
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@euroshub.com"
          />

          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full font-bold shadow-md shadow-brand-600/20"
            isLoading={loading}
          >
            Sign In
          </Button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500">
          New customer?{' '}
          <a href="/register" className="font-semibold text-brand-600 hover:underline">
            Create an account
          </a>
        </div>
      </div>
    </div>
  );
};
