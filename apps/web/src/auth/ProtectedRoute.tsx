import React from 'react';
import { useAuth } from './AuthContext.js';
import { Role } from '@eliteship/shared';
import { Skeleton } from '../components/ui/Skeleton.js';

interface ProtectedRouteProps {
 children: React.ReactNode;
 allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
 const { user, loading } = useAuth();

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 ">
 <div className="w-full max-w-md space-y-4">
 <Skeleton className="h-10 w-3/4 mx-auto" />
 <Skeleton className="h-40 w-full" />
 <Skeleton className="h-10 w-1/2 mx-auto" />
 </div>
 </div>
 );
 }

 if (!user) {
 // Redirect to login or return prompt
 return (
 <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
 <div className="max-w-md bg-white p-8 rounded-xl shadow-lg border border-slate-200 space-y-4">
 <h2 className="text-2xl font-bold text-slate-900 ">Authentication Required</h2>
 <p className="text-slate-600 ">
 Please log in with your credentials to access this portal.
 </p>
 <a
 href="/login"
 className="inline-block w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors"
 >
 Go to Login
 </a>
 </div>
 </div>
 );
 }

 if (allowedRoles && !allowedRoles.includes(user.role)) {
 return (
 <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
 <div className="max-w-md bg-white p-8 rounded-xl shadow-lg border border-slate-200 space-y-4">
 <h2 className="text-2xl font-bold text-red-600 ">Access Restricted</h2>
 <p className="text-slate-600 ">
 You do not have permission to view this section with your role ({user.role}).
 </p>
 <a
 href="/"
 className="inline-block py-2 px-4 bg-slate-200 hover:bg-slate-300 font-medium rounded-lg text-slate-800 transition-colors"
 >
 Return to Home
 </a>
 </div>
 </div>
 );
 }

 return <>{children}</>;
};
