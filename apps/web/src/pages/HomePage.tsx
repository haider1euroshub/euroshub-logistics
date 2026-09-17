import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Truck,
  Compass,
  Package,
  Calculator,
  MapPin,
  Clock,
  Phone,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Banknote,
  Boxes,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '../api/client.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { formatPKR } from '@eliteship/shared';

interface PublicHub {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface PublicSettings {
  companyName: string;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyAddress?: string | null;
  currency?: string;
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [trackingInput, setTrackingInput] = useState('');
  const [hubs, setHubs] = useState<PublicHub[]>([]);
  const [cities, setCities] = useState<string[]>([
    'Karachi',
    'Lahore',
    'Islamabad',
    'Faisalabad',
    'Multan',
  ]);
  const [settings, setSettings] = useState<PublicSettings>({
    companyName: 'Euroshub Logistics',
    companyPhone: '+92 21 32560001',
    companyEmail: 'support@euroshub.com',
    companyAddress: 'Karachi Logistics Park, Port Qasim, Karachi, Pakistan',
    currency: 'PKR',
  });

  // Rate Estimator State
  const [calcOrigin, setCalcOrigin] = useState('Karachi');
  const [calcDestination, setCalcDestination] = useState('Lahore');
  const [calcWeight, setCalcWeight] = useState(1);
  const [calcService, setCalcService] = useState<'STANDARD' | 'EXPRESS'>('STANDARD');
  const [estimate, setEstimate] = useState<any>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [hubsLoading, setHubsLoading] = useState(true);
  const [hubsError, setHubsError] = useState(false);

  // Load public hubs, cities, and company settings
  useEffect(() => {
    const loadPublicData = async () => {
      setHubsLoading(true);
      setHubsError(false);
      try {
        const [hubData, settingsData] = await Promise.all([
          apiClient<{ hubs: PublicHub[]; cities: string[] }>('/api/hubs/public'),
          apiClient<{ settings: PublicSettings }>('/api/settings/public'),
        ]);

        if (hubData.hubs && hubData.hubs.length > 0) {
          setHubs(hubData.hubs);
        }
        if (hubData.cities && hubData.cities.length > 0) {
          setCities(hubData.cities);
          setCalcOrigin(hubData.cities[0]);
          setCalcDestination(hubData.cities[1] || hubData.cities[0]);
        }
        if (settingsData.settings) {
          setSettings((prev) => ({ ...prev, ...settingsData.settings }));
        }
      } catch {
        setHubsError(true);
      } finally {
        setHubsLoading(false);
      }
    };
    loadPublicData();
  }, []);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingInput.trim()) {
      navigate(`/track?number=${encodeURIComponent(trackingInput.trim().toUpperCase())}`);
    }
  };

  const handleEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEstimating(true);
    try {
      const res = await apiClient<{ estimation: any }>('/api/pricing/estimate', {
        method: 'POST',
        body: JSON.stringify({
          serviceType: calcService,
          originZone: calcOrigin,
          destinationZone: calcDestination,
          weightKg: Number(calcWeight),
          paymentType: 'PREPAID',
        }),
      });
      setEstimate(res.estimation);
    } catch (err: any) {
      alert(err.message || 'Could not compute rate estimate');
    } finally {
      setIsEstimating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between space-y-16">
      {/* 1. Minimal Clean Hero Section */}
      <section className="bg-white border-b border-slate-200 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Headline & Actions */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold">
                <Truck className="w-3.5 h-3.5" /> Nationwide Courier & Logistics Network
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-tight">
                Ship. Track. Deliver.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-xl font-normal leading-relaxed">
                Reliable parcel delivery and express freight across major commercial corridors in Pakistan. Fast bookings, transparent pricing, and instant real-time shipment visibility.
              </p>

              {/* Primary Call to Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/create-shipment"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm transition-colors"
                >
                  Book a Shipment <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/track"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-semibold text-sm transition-colors"
                >
                  <Compass className="w-4 h-4 text-slate-500" /> Track a Shipment
                </Link>
              </div>

              {/* Instant Tracking Search Bar */}
              <form onSubmit={handleTrackSubmit} className="pt-4 max-w-lg">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Instant Consignment Tracking
                </label>
                <div className="flex gap-2 p-1.5 rounded-xl bg-slate-100 border border-slate-200 shadow-2xs">
                  <div className="relative flex-1">
                    <Compass className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={trackingInput}
                      onChange={(e) => setTrackingInput(e.target.value.toUpperCase())}
                      placeholder="Enter Tracking Number (e.g. ESH-2026-000001)"
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-white text-slate-900 placeholder-slate-400 text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 uppercase font-mono tracking-wide"
                    />
                  </div>
                  <button
                    type="submit"
                    className="py-2 px-5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition-colors shrink-0 flex items-center gap-1.5"
                  >
                    Track
                  </button>
                </div>
              </form>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-5 pt-2 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Real-Time Transit Tracking
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Cash on Delivery (COD)
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Verified Hub Check-Ins
                </span>
              </div>
            </div>

            {/* Right: Clean Dynamic Rate Estimator */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-white p-6 sm:p-7 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 mb-4">
                  <div className="p-2 rounded-lg bg-brand-50 text-brand-600">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-slate-900">Quick Rate Estimator</h2>
                    <p className="text-xs text-slate-500">Calculate estimated shipping cost by route and weight</p>
                  </div>
                </div>

                <form onSubmit={handleEstimate} className="space-y-3.5 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Origin City
                      </label>
                      <select
                        value={calcOrigin}
                        onChange={(e) => setCalcOrigin(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      >
                        {cities.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Destination City
                      </label>
                      <select
                        value={calcDestination}
                        onChange={(e) => setCalcDestination(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      >
                        {cities.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Weight (kg)
                      </label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={calcWeight}
                        onChange={(e) => setCalcWeight(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Speed Service
                      </label>
                      <select
                        value={calcService}
                        onChange={(e) => setCalcService(e.target.value as any)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      >
                        <option value="STANDARD">Standard (2-3 Days)</option>
                        <option value="EXPRESS">Express Priority</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isEstimating}
                    className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-colors mt-2"
                  >
                    {isEstimating ? 'Calculating...' : 'Get Instant Quote'}
                  </button>

                  {estimate && (
                    <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Base Freight:</span>
                        <span className="font-semibold text-slate-900">{formatPKR(estimate.baseFee)}</span>
                      </div>
                      {estimate.weightSurcharge > 0 && (
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>Weight Surcharge:</span>
                          <span className="font-semibold text-slate-900">{formatPKR(estimate.weightSurcharge)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-1.5 text-brand-700">
                        <span>Estimated Shipping Cost:</span>
                        <span>{formatPKR(estimate.totalFee)}</span>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 text-center">
                    <Link
                      to="/create-shipment"
                      className="text-xs text-brand-600 hover:text-brand-800 font-semibold"
                    >
                      Ready to send? Proceed to booking &rarr;
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Compact Services Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Logistics Services Built for Businesses & Individuals
          </h2>
          <p className="text-slate-500 text-sm">
            End-to-end transport solutions designed for speed, safety, and operational reliability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Standard Delivery</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cost-effective nationwide delivery across 50+ cities within 2 to 3 business days. Ideal for regular retail and e-commerce shipments.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Express Priority</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Expedited overnight linehaul routing for time-sensitive parcels between major industrial and metropolitan hubs.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Banknote className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Cash on Delivery (COD)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Secure cash collection upon doorstep delivery with instant payment logging and transparent remittance reporting.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Active Regional Hub Network */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-600 mb-1">
                <MapPin className="w-3.5 h-3.5" /> Physical Operational Footprint
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Active Regional Hub Network
              </h2>
              <p className="text-xs text-slate-500">
                Centrally operated distribution centers connected via scheduled linehaul routes.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 w-fit">
              {hubs.length} Active Hubs
            </span>
          </div>

          {hubsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50/75 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              ))}
            </div>
          ) : hubsError && hubs.length === 0 ? (
            <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Hub Network Directory Unavailable</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Unable to load regional distribution hubs right now. Operational hubs continue processing consignments.
              </p>
            </div>
          ) : hubs.length === 0 ? (
            <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <p className="text-sm font-semibold text-slate-700">No Regional Hubs Listed</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {hubs.map((hub) => (
                <div
                  key={hub.id || hub.code}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/75 hover:bg-slate-50 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{hub.city}</span>
                    <span className="font-mono text-[11px] font-extrabold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                      {hub.code}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-700">{hub.name}</p>
                  <p className="text-xs text-slate-500 leading-tight">{hub.address}</p>
                  {hub.phone && (
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
                      <Phone className="w-3 h-3 text-slate-400" /> {hub.phone}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Minimal Professional Footer */}
      <footer className="bg-white border-t border-slate-200 pt-12 pb-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                  <Truck className="h-4 w-4" />
                </div>
                <span className="text-base font-bold text-slate-900">
                  {settings.companyName}
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Nationwide logistics, high-throughput hub operations, parcel dispatch, and real-time shipment visibility across Pakistan.
              </p>
              {settings.companyAddress && (
                <p className="text-xs text-slate-500 flex items-start gap-1.5 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  {settings.companyAddress}
                </p>
              )}
            </div>

            {/* Quick Links */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Quick Links</h4>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li>
                  <Link to="/track" className="hover:text-brand-600 transition-colors">
                    Track Parcel
                  </Link>
                </li>
                <li>
                  <Link to="/create-shipment" className="hover:text-brand-600 transition-colors">
                    Book Shipment
                  </Link>
                </li>
                <li>
                  <Link to="/customer/dashboard" className="hover:text-brand-600 transition-colors">
                    Customer Portal
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-brand-600 transition-colors">
                    Staff & Driver Sign In
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact & Support */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Customer Support</h4>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {settings.companyPhone && (
                  <li className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{settings.companyPhone}</span>
                  </li>
                )}
                {settings.companyEmail && (
                  <li className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{settings.companyEmail}</span>
                  </li>
                )}
                <li className="text-[11px] text-slate-400 pt-1">
                  Operating Hours: Mon - Sat, 9:00 AM - 8:00 PM PST
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <p>&copy; {new Date().getFullYear()} {settings.companyName}. All rights reserved.</p>
            <p>Verified Courier & Freight Logistics Infrastructure.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
