import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient, ApiError } from '../api/client.js';
import { Badge } from '../components/ui/Badge.js';
import type { BadgeProps } from '../components/ui/Badge.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { Search, Compass, ShieldCheck, Calendar, MapPin, AlertCircle, Copy, Check } from 'lucide-react';
import { formatDateTimePST } from '@eliteship/shared';

const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  CREATED:            'warning',
  PICKUP_SCHEDULED:   'warning',
  PICKED_UP:          'info',
  AT_ORIGIN_HUB:      'info',
  IN_TRANSIT:         'info',
  AT_DESTINATION_HUB: 'info',
  ASSIGNED_TO_DRIVER: 'info',
  OUT_FOR_DELIVERY:   'warning',
  DELIVERED:          'success',
  DELIVERY_FAILED:    'danger',
  RETURNED:           'danger',
  CANCELLED:          'danger',
  RESCHEDULED:        'warning',
};

export const TrackPage: React.FC = () => {
  const { trackingNumber: routeNumber } = useParams<{ trackingNumber?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryNumber = searchParams.get('number');
  const targetNumber = routeNumber || queryNumber;

  const [trackingNumber, setTrackingNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const fetchTracking = async (numberToFetch: string) => {
    const trimmed = numberToFetch.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await apiClient<any>(`/api/tracking/${encodeURIComponent(trimmed)}`);
      setData(res);
    } catch (err: any) {
      if (err instanceof ApiError && err.statusCode === 404) {
        setError(`No shipment found matching tracking number "${trimmed}". Please check the number and try again.`);
      } else {
        setError(err.message || 'Unable to retrieve tracking information.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (targetNumber) {
      setTrackingNumber(targetNumber);
      fetchTracking(targetNumber);
    }
  }, [targetNumber]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = trackingNumber.trim().toUpperCase();
    if (trimmed) {
      setSearchParams({ number: trimmed });
      fetchTracking(trimmed);
    }
  };

  const copyTracking = () => {
    if (!data?.trackingNumber) return;
    navigator.clipboard.writeText(data.trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Header & Search */}
      <div className="text-center max-w-xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold">
          <Compass className="w-3.5 h-3.5" /> Public Consignment Tracking
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Track Your Shipment
        </h1>
        <p className="text-sm text-slate-500">
          Enter your official tracking identifier (e.g. <span className="font-mono font-bold text-slate-700">ESH-2026-000001</span>) to see live journey updates.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
        <div className="flex gap-2 p-2 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
              placeholder="e.g. ESH-2026-000001"
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 text-sm border-none focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono uppercase tracking-wide"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !trackingNumber.trim()}
            className="py-2.5 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-all shadow-xs disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Track'}
          </button>
        </div>
      </form>

      {/* Loading Skeleton */}
      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 space-y-6 shadow-xs">
          <Skeleton className="h-8 w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-8 rounded-2xl border border-red-200 bg-red-50/75 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <h2 className="text-base font-bold text-red-800">Shipment Lookup Failed</h2>
          <p className="text-sm text-red-700 max-w-md mx-auto leading-relaxed">{error}</p>
        </div>
      )}

      {/* Initial Empty Search State */}
      {!data && !error && !loading && (
        <div className="p-12 rounded-2xl border border-dashed border-slate-200 text-center space-y-3 bg-white">
          <Compass className="w-10 h-10 text-slate-300 mx-auto" />
          <h2 className="text-base font-semibold text-slate-800">Ready to track your parcel</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Input the tracking code provided on your booking receipt or consignment note to see step-by-step milestone progress.
          </p>
        </div>
      )}

      {/* Tracking Result View */}
      {data && !loading && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 p-6 bg-slate-50/75">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Official Tracking Code</span>
              <div className="flex items-center gap-2 mt-0.5">
                <h2 className="text-2xl font-black font-mono text-brand-700 tracking-wide">
                  {data.trackingNumber}
                </h2>
                <button
                  type="button"
                  onClick={copyTracking}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs transition-colors"
                  title="Copy tracking number"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={STATUS_VARIANT[data.status] ?? 'default'} size="md">
                {data.statusLabel || data.status?.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>

          {/* Route Overview */}
          <div className="p-6 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-brand-600" /> Origin City
              </span>
              <p className="font-bold text-slate-900 text-base">{data.originCity}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Destination City
              </span>
              <p className="font-bold text-slate-900 text-base">{data.destinationCity}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-600" /> Service Type
              </span>
              <p className="font-bold text-slate-900 uppercase">{data.serviceType}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600" /> Booking Date
              </span>
              <p className="font-medium text-slate-700 text-xs">
                {formatDateTimePST(data.bookedAt)}
              </p>
            </div>
          </div>

          {/* Vertical Progress Timeline */}
          <div className="p-6 sm:p-8">
            <h2 className="text-base font-bold text-slate-900 mb-6">
              Milestone Progress History
            </h2>

            <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {data.timeline?.map((item: any, idx: number) => {
                const isLatest = idx === data.timeline.length - 1;
                return (
                  <div key={idx} className="relative group">
                    {/* Dot */}
                    <div
                      className={`absolute -left-[27px] sm:-left-[35px] top-1 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isLatest
                          ? 'border-brand-600 bg-brand-600 text-white ring-4 ring-brand-100'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isLatest && <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                    </div>

                    {/* Timeline Item Content */}
                    <div className="space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className={`font-bold text-sm ${isLatest ? 'text-brand-700' : 'text-slate-900'}`}>
                          {item.statusLabel || item.status?.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {formatDateTimePST(item.timestamp)}
                        </span>
                      </div>
                      {item.note && (
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          {item.note}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
