import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Truck, AlertCircle, Mail, CheckCircle2 } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationPending, setVerificationPending] = useState<{ email: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await register(email, password, fullName, phone);
      if (result.requiresVerification) {
        setVerificationPending({ email });
      } else {
        window.location.href = '/customer/dashboard';
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  if (verificationPending) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl text-center animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-inner border border-brand-100">
            <Mail className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900">
              Verify Your Email
            </h1>
            <p className="text-sm text-slate-600">
              We've dispatched a confirmation link to{' '}
              <span className="font-semibold text-slate-900">{verificationPending.email}</span>.
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 text-left space-y-1">
              <p className="font-medium text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Next steps:
              </p>
              <p className="pl-5 text-slate-500">
                1. Open the email from Euroshub Logistics.
              </p>
              <p className="pl-5 text-slate-500">
                2. Click the confirmation link to activate your account.
              </p>
              <p className="pl-5 text-slate-500">
                3. Return to sign in to your customer workspace.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Button
              variant="primary"
              className="w-full font-bold shadow-md shadow-brand-600/20"
              onClick={() => { window.location.href = '/login'; }}
            >
              Go to Sign In
            </Button>
            <Button
              variant="ghost"
              className="w-full text-xs text-slate-500 hover:text-slate-700"
              onClick={() => {
                setVerificationPending(null);
                setEmail('');
                setPassword('');
              }}
            >
              Register a different account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center mx-auto shadow-md shadow-brand-500/20">
            <Truck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Register Customer Account
          </h1>
 <p className="text-xs text-slate-500 ">
 Book shipments, monitor consignments, and reconcile Cash-on-Delivery
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
 label="Full Name / Business Name"
 type="text"
 required
 value={fullName}
 onChange={(e) => setFullName(e.target.value)}
 placeholder="e.g. Asad Enterprises"
 />

 <Input
 label="Primary Contact Phone"
 type="tel"
 required
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 placeholder="03001234567"
 />

 <Input
 label="Email Address"
 type="email"
 required
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="sales@company.pk"
 />

 <Input
 label="Password"
 type="password"
 required
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="Minimum 8 characters"
 helperText="At least 8 characters"
 />

 <Button
 type="submit"
 variant="primary"
 className="w-full font-bold shadow-md shadow-brand-600/20"
 isLoading={loading}
 >
 Complete Registration
 </Button>
 </form>

 <div className="pt-2 text-center text-xs text-slate-500 ">
 Already have an account?{' '}
 <a href="/login" className="font-semibold text-brand-600 hover:underline">
 Sign in
 </a>
 </div>
 </div>
 </div>
 );
};
