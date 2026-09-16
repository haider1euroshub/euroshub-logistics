import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import { NotificationBell } from '../components/NotificationBell.js';
import {
  Truck,
  LogOut,
  Menu,
  X,
  PackagePlus,
  Compass,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react';
import { Role } from '@eliteship/shared';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isRouteActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navLinkClass = (path: string) =>
    isRouteActive(path)
      ? 'px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 font-semibold flex items-center gap-1.5 text-sm transition-colors shadow-xs'
      : 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-brand-600 hover:bg-slate-100 flex items-center gap-1.5 text-sm font-medium transition-colors';

  const mobileNavLinkClass = (path: string) =>
    isRouteActive(path)
      ? 'block py-2 px-3 rounded-lg bg-brand-50 text-brand-700 font-semibold text-sm'
      : 'block py-2 px-3 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-brand-600 font-medium text-sm transition-colors';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                Euroshub
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-brand-100 text-brand-700 tracking-wider">
                  Logistics
                </span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 text-sm font-medium text-slate-600">
            <Link to="/track" className={navLinkClass('/track')}>
              <Compass className="w-4 h-4" /> Track Parcel
            </Link>
            <Link to="/create-shipment" className={navLinkClass('/create-shipment')}>
              <PackagePlus className="w-4 h-4" /> Book Shipment
            </Link>

            {user?.role === Role.CUSTOMER && (
              <Link to="/customer/dashboard" className={navLinkClass('/customer/dashboard')}>
                <LayoutDashboard className="w-4 h-4" /> My Shipments
              </Link>
            )}

            {user?.role === Role.DRIVER && (
              <Link to="/driver/dashboard" className={navLinkClass('/driver/dashboard')}>
                <Truck className="w-4 h-4" /> Driver Workspace
              </Link>
            )}

            {user?.role === Role.HUB_STAFF && (
              <Link to="/hub/dashboard" className={navLinkClass('/hub/dashboard')}>
                <LayoutDashboard className="w-4 h-4" /> Hub Operations
              </Link>
            )}

            {user?.role === Role.ADMIN && (
              <Link to="/admin" className={navLinkClass('/admin')}>
                <ShieldCheck className="w-4 h-4" /> Admin Console
              </Link>
            )}
          </nav>
        </div>

        {/* Right Action Icons & Auth Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* In-app Notification Bell */}
          <NotificationBell />

          {/* User Account / Auth Actions */}
          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {user.fullName}
                </p>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {user.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-sm font-semibold px-3 py-2 text-slate-700 hover:text-slate-900 transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors"
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile menu hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 py-3 space-y-1 shadow-md">
          <Link
            to="/track"
            className={mobileNavLinkClass('/track')}
            onClick={() => setMobileMenuOpen(false)}
          >
            Track Parcel
          </Link>
          <Link
            to="/create-shipment"
            className={mobileNavLinkClass('/create-shipment')}
            onClick={() => setMobileMenuOpen(false)}
          >
            Book Shipment
          </Link>
          {user?.role === Role.CUSTOMER && (
            <Link
              to="/customer/dashboard"
              className={mobileNavLinkClass('/customer/dashboard')}
              onClick={() => setMobileMenuOpen(false)}
            >
              My Shipments
            </Link>
          )}
          {user?.role === Role.DRIVER && (
            <Link
              to="/driver/dashboard"
              className={mobileNavLinkClass('/driver/dashboard')}
              onClick={() => setMobileMenuOpen(false)}
            >
              Driver Workspace
            </Link>
          )}
          {user?.role === Role.HUB_STAFF && (
            <Link
              to="/hub/dashboard"
              className={mobileNavLinkClass('/hub/dashboard')}
              onClick={() => setMobileMenuOpen(false)}
            >
              Hub Operations
            </Link>
          )}
          {user?.role === Role.ADMIN && (
            <Link
              to="/admin"
              className={mobileNavLinkClass('/admin')}
              onClick={() => setMobileMenuOpen(false)}
            >
              Admin Console
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
