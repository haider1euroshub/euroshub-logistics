import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext.js';
import { apiClient, ApiError } from '../api/client.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Modal } from '../components/ui/Modal.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { Toast } from '../components/ui/Toast.js';
import {
  Warehouse,
  Truck,
  PackageCheck,
  ArrowRight,
  RefreshCw,
  ScanLine,
  Send,
  BarChart3,
  Package,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  UserCheck,
  Copy,
  Check,
  MapPin,
  Phone,
  Banknote,
} from 'lucide-react';
import { formatDateTimePST, formatPKR } from '@eliteship/shared';

interface HubMetrics {
  atHubCount: number;
  incomingInTransitCount: number;
  readyForDriverCount: number;
  outForDeliveryCount: number;
  activeDriversCount: number;
}

interface DestinationHub {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string;
}

interface DispatchableShipment {
  id: string;
  trackingNumber: string;
  senderCity: string;
  destinationCity: string;
  recipientName: string;
  weightKg: number;
  serviceType: string;
  status: string;
  checkedInAt: string;
}

interface DriverOption {
  id: string;
  userId: string;
  fullName: string;
  phone: string | null;
  email: string;
  vehicleRegistration: string | null;
  vehicleModel: string | null;
  vehicleStatus: string;
  activeDeliveriesCount: number;
  isAvailable: boolean;
}

interface DeliveryShipment {
  id: string;
  trackingNumber: string;
  senderName: string;
  senderCity: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverAddressExtra: string | null;
  receiverCity: string;
  serviceType: string;
  paymentType: string;
  codAmount: number | null;
  weightKg: number;
  packageType: string;
  isFragile: boolean;
  status: string;
  deliveryAttempts: number;
  createdAt: string;
}

interface ActiveDelivery {
  id: string;
  trackingNumber: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverCity: string;
  serviceType: string;
  paymentType: string;
  codAmount: number | null;
  weightKg: number;
  status: string;
  driverName: string;
  driverPhone: string | null;
  vehicleRegistration: string | null;
  assignedAt: string;
}

interface InboundShipment {
  id: string;
  trackingNumber: string;
  fromHubName: string;
  fromHubCity: string;
  destinationCity: string;
  recipientName: string;
  weightKg: number;
  serviceType: string;
  dispatchedAt: string | null;
  notes: string | null;
}

type ActivePanel =
  | 'ready-for-delivery'
  | 'active-deliveries'
  | 'dispatch'
  | 'inbound'
  | 'receive'
  | 'metrics';

export const HubDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<HubMetrics | null>(null);
  const [availableHubs, setAvailableHubs] = useState<DestinationHub[]>([]);
  const [dispatchableShipments, setDispatchableShipments] = useState<DispatchableShipment[]>([]);
  const [deliveryShipments, setDeliveryShipments] = useState<DeliveryShipment[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([]);
  const [inboundShipments, setInboundShipments] = useState<InboundShipment[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<ActivePanel>('ready-for-delivery');
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Driver Assignment Modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<DeliveryShipment | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Receive form
  const [receiveTracking, setReceiveTracking] = useState('');
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receiveSaving, setReceiveSaving] = useState(false);

  // Dispatch form
  const [dispatchTracking, setDispatchTracking] = useState('');
  const [dispatchToHubId, setDispatchToHubId] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatchSaving, setDispatchSaving] = useState(false);

  const hubId = user?.hubStaffProfile?.hubId;

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    setToast({ message, variant });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchData = useCallback(async () => {
    if (!hubId) return;
    setLoading(true);
    try {
      const [
        metricsRes,
        hubsRes,
        dispatchableRes,
        deliveryRes,
        activeDelivRes,
        inboundRes,
        driversRes,
      ] = await Promise.all([
        apiClient<{ metrics: HubMetrics }>(`/api/hubs/${hubId}/dashboard`),
        apiClient<{ hubs: DestinationHub[] }>('/api/hubs/available-destinations'),
        apiClient<{ shipments: DispatchableShipment[] }>(`/api/hubs/${hubId}/dispatchable-shipments`),
        apiClient<{ shipments: DeliveryShipment[] }>(`/api/hubs/${hubId}/delivery-shipments`),
        apiClient<{ shipments: ActiveDelivery[] }>(`/api/hubs/${hubId}/active-deliveries`),
        apiClient<{ shipments: InboundShipment[] }>(`/api/hubs/${hubId}/inbound-shipments`),
        apiClient<{ drivers: DriverOption[] }>(`/api/hubs/${hubId}/drivers`),
      ]);

      setMetrics(metricsRes.metrics);
      setAvailableHubs(hubsRes.hubs || []);
      setDispatchableShipments(dispatchableRes.shipments || []);
      setDeliveryShipments(deliveryRes.shipments || []);
      setActiveDeliveries(activeDelivRes.shipments || []);
      setInboundShipments(inboundRes.shipments || []);
      setDrivers(driversRes.drivers || []);
    } catch {
      showToast('Failed to load hub operational data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [hubId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReceive = async (e?: React.FormEvent, directTracking?: string) => {
    if (e) e.preventDefault();
    const tracking = (directTracking || receiveTracking).trim().toUpperCase();
    if (!tracking) return;
    setReceiveSaving(true);
    try {
      await apiClient(`/api/hubs/${hubId}/receive`, {
        method: 'POST',
        body: JSON.stringify({
          trackingNumber: tracking,
          notes: receiveNotes.trim() || undefined,
        }),
      });
      showToast(`Shipment ${tracking} checked in successfully.`);
      setReceiveTracking('');
      setReceiveNotes('');
      await fetchData();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Check-in failed.', 'error');
    } finally {
      setReceiveSaving(false);
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchTracking.trim() || !dispatchToHubId) return;
    setDispatchSaving(true);
    try {
      await apiClient(`/api/hubs/${hubId}/dispatch`, {
        method: 'POST',
        body: JSON.stringify({
          trackingNumber: dispatchTracking.trim().toUpperCase(),
          toHubId: dispatchToHubId,
          notes: dispatchNotes.trim() || undefined,
        }),
      });
      showToast(`Shipment ${dispatchTracking.toUpperCase()} dispatched successfully.`);
      setDispatchTracking('');
      setDispatchToHubId('');
      setDispatchNotes('');
      await fetchData();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Dispatch failed.', 'error');
    } finally {
      setDispatchSaving(false);
    }
  };

  const openAssignModal = (shipment: DeliveryShipment) => {
    setSelectedShipment(shipment);
    setSelectedDriverId(drivers[0]?.id || '');
    setAssignNotes('');
    setAssignModalOpen(true);
  };

  const handleAssignDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment || !selectedDriverId) {
      showToast('Please select an active driver.', 'error');
      return;
    }

    setAssignSubmitting(true);
    try {
      await apiClient(`/api/hubs/${hubId}/assign-driver`, {
        method: 'POST',
        body: JSON.stringify({
          shipmentId: selectedShipment.id,
          driverId: selectedDriverId,
          notes: assignNotes.trim() || undefined,
        }),
      });

      showToast(`Driver assigned successfully to ${selectedShipment.trackingNumber}.`);
      setAssignModalOpen(false);
      setSelectedShipment(null);
      await fetchData();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Driver assignment failed.', 'error');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const metricCards = [
    {
      label: 'Ready for Delivery',
      value: deliveryShipments.length,
      icon: ClipboardList,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Active Deliveries',
      value: activeDeliveries.length,
      icon: Truck,
      color: 'text-brand-600',
      bg: 'bg-brand-50',
    },
    {
      label: 'Parcels to Dispatch',
      value: dispatchableShipments.length,
      icon: Send,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Inbound En Route',
      value: inboundShipments.length,
      icon: Package,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Available Drivers',
      value: drivers.filter((d) => d.isAvailable).length,
      icon: UserCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Warehouse className="w-6 h-6 text-brand-600" />
            Hub Operations Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Operator: <span className="font-semibold text-slate-800">{user?.fullName}</span> — Active Hub:{' '}
            <code className="text-xs font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
              {hubId ?? 'Not Assigned'}
            </code>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin text-brand-600' : ''}`} />
            Refresh Operational Data
          </Button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white">
                <Skeleton className="h-7 w-10 mb-2" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))
          : metricCards.map((card) => (
              <div
                key={card.label}
                className="flex flex-col items-center sm:items-start gap-1 p-4 rounded-xl border border-slate-200 bg-white shadow-xs"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs text-slate-500 font-semibold">{card.label}</span>
                  <div className={`p-1.5 rounded-lg ${card.bg}`}>
                    <card.icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              </div>
            ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1.5 p-1 rounded-xl bg-slate-100 overflow-x-auto">
        {[
          {
            id: 'ready-for-delivery' as const,
            label: `Ready for Delivery (${deliveryShipments.length})`,
            icon: ClipboardList,
          },
          {
            id: 'active-deliveries' as const,
            label: `Active Deliveries (${activeDeliveries.length})`,
            icon: Truck,
          },
          {
            id: 'dispatch' as const,
            label: `Ready to Dispatch (${dispatchableShipments.length})`,
            icon: Send,
          },
          {
            id: 'inbound' as const,
            label: `Inbound En Route (${inboundShipments.length})`,
            icon: Package,
          },
          { id: 'receive' as const, label: 'Check-In Parcel', icon: ScanLine },
          { id: 'metrics' as const, label: 'Pipeline Flow', icon: BarChart3 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePanel(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activePanel === tab.id
                ? 'bg-white text-brand-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* PANEL 1: Ready for Delivery (Driver Assignment) */}
      {activePanel === 'ready-for-delivery' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-600" />
                Parcels Ready for Driver Assignment
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Parcels physically checked in at this destination hub ready for final-mile handover.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 self-start sm:self-auto">
              {deliveryShipments.length} Awaiting Driver
            </span>
          </div>

          {deliveryShipments.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No parcels currently awaiting driver assignment</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Incoming parcels checked in at this destination hub will automatically appear here for final-mile assignment.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 bg-slate-50/50">
                    <th className="py-2.5 px-3">Tracking #</th>
                    <th className="py-2.5 px-3">Receiver & Destination</th>
                    <th className="py-2.5 px-3">Service & Payment</th>
                    <th className="py-2.5 px-3">Weight</th>
                    <th className="py-2.5 px-3">Current Status</th>
                    <th className="py-2.5 px-3 text-right">Handover Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deliveryShipments.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-brand-700 text-xs bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                            {s.trackingNumber}
                          </span>
                          <button
                            onClick={() => copyToClipboard(s.trackingNumber, s.id)}
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                            title="Copy Tracking #"
                          >
                            {copiedId === s.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          Booked: {formatDateTimePST(s.createdAt)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-800 text-xs">{s.receiverName}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                          {s.receiverAddress}, {s.receiverCity}
                        </p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3 shrink-0 text-slate-400" />
                          {s.receiverPhone}
                        </p>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              s.serviceType === 'EXPRESS'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {s.serviceType}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              s.paymentType === 'COD'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {s.paymentType}
                          </span>
                        </div>
                        {s.paymentType === 'COD' && s.codAmount && (
                          <span className="text-xs font-bold text-purple-700 block mt-1">
                            Collect: {formatPKR(s.codAmount)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-xs font-medium">
                        {s.weightKg} kg
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={
                            s.status === 'DELIVERY_FAILED'
                              ? 'danger'
                              : s.status === 'RESCHEDULED'
                              ? 'warning'
                              : 'info'
                          }
                          size="sm"
                        >
                          {s.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openAssignModal(s)}
                          className="font-semibold text-xs shadow-xs"
                        >
                          <UserCheck className="w-3.5 h-3.5 mr-1" />
                          Assign Driver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PANEL 2: Active Deliveries */}
      {activePanel === 'active-deliveries' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-brand-600" />
                Active Driver Deliveries
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Shipments currently dispatched with drivers for final delivery.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-100 text-brand-800 self-start sm:self-auto">
              {activeDeliveries.length} Active Runs
            </span>
          </div>

          {activeDeliveries.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl">
              <PackageCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No shipments currently out with drivers</p>
              <p className="text-xs text-slate-400 mt-1">
                Assign drivers from the "Ready for Delivery" tab to begin delivery runs.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 bg-slate-50/50">
                    <th className="py-2.5 px-3">Tracking #</th>
                    <th className="py-2.5 px-3">Assigned Driver</th>
                    <th className="py-2.5 px-3">Receiver & Destination</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">COD to Collect</th>
                    <th className="py-2.5 px-3">Assigned At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeDeliveries.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-brand-700 text-xs">
                        {s.trackingNumber}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-800 text-xs">{s.driverName}</p>
                        {s.vehicleRegistration && (
                          <p className="text-[11px] text-slate-500">
                            Vehicle: <span className="font-mono">{s.vehicleRegistration}</span>
                          </p>
                        )}
                        {s.driverPhone && (
                          <p className="text-[11px] text-slate-500">{s.driverPhone}</p>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-slate-800 text-xs">{s.receiverName}</p>
                        <p className="text-[11px] text-slate-500 truncate max-w-xs">{s.receiverAddress}</p>
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={s.status === 'OUT_FOR_DELIVERY' ? 'warning' : 'info'}
                          size="sm"
                        >
                          {s.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        {s.paymentType === 'COD' && s.codAmount ? (
                          <span className="font-mono font-bold text-purple-700 text-xs">
                            {formatPKR(s.codAmount)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Prepaid</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500">
                        {formatDateTimePST(s.assignedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PANEL 3: Ready to Dispatch (Inter-Hub) */}
      {activePanel === 'dispatch' && (
        <div className="space-y-6">
          {/* Dispatch Form Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-8">
            <div className="max-w-xl mx-auto space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-50 rounded-xl shrink-0">
                  <Send className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Dispatch Parcel to Next Hub</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Select an active destination hub. This initiates transit tracking and updates customer status immediately.
                  </p>
                </div>
              </div>

              <form onSubmit={handleDispatch} className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Tracking Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={dispatchTracking}
                    onChange={(e) => setDispatchTracking(e.target.value.toUpperCase())}
                    placeholder="e.g. EHB-2026-000001"
                    className="w-full font-mono text-sm px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 uppercase tracking-wide"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Tip: Select a parcel directly from the "Parcels Awaiting Dispatch" table below.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Destination Hub <span className="text-red-500">*</span>
                  </label>
                  {availableHubs.length > 0 ? (
                    <select
                      value={dispatchToHubId}
                      onChange={(e) => setDispatchToHubId(e.target.value)}
                      required
                      className="w-full text-sm px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    >
                      <option value="">— Select Destination Hub —</option>
                      {availableHubs.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} — {h.city} ({h.code})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      No other active destination hubs are currently configured in the network.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Transit Notes / Vehicle (Optional)
                  </label>
                  <textarea
                    value={dispatchNotes}
                    onChange={(e) => setDispatchNotes(e.target.value)}
                    placeholder="e.g. Dispatched on Route 4 via Vehicle KHI-882"
                    rows={2}
                    className="w-full text-sm px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={dispatchSaving || !dispatchTracking.trim() || !dispatchToHubId}
                  className="w-full h-11 text-base font-semibold"
                >
                  {dispatchSaving ? 'Dispatching to Transit...' : 'Dispatch Shipment to Hub'}
                </Button>
              </form>
            </div>
          </div>

          {/* Ready to Dispatch Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Parcels Awaiting Hub Dispatch</h3>
                <p className="text-xs text-slate-500">
                  Parcels checked in at this origin hub ready for inter-hub transfer.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {dispatchableShipments.length} Available
              </span>
            </div>

            {dispatchableShipments.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No parcels currently awaiting dispatch</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Parcels checked in via the "Check-In Parcel" tab will automatically appear here for onward transfer.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 bg-slate-50/50">
                      <th className="py-2.5 px-3">Tracking #</th>
                      <th className="py-2.5 px-3">Destination</th>
                      <th className="py-2.5 px-3">Recipient</th>
                      <th className="py-2.5 px-3">Weight</th>
                      <th className="py-2.5 px-3">Service</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dispatchableShipments.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/75 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-brand-700 text-xs">
                          {s.trackingNumber}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800">
                          {s.destinationCity}
                        </td>
                        <td className="py-3 px-3 text-slate-600 text-xs">
                          {s.recipientName}
                        </td>
                        <td className="py-3 px-3 text-slate-600 text-xs">
                          {s.weightKg} kg
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              s.serviceType === 'EXPRESS'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {s.serviceType}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setDispatchTracking(s.trackingNumber);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded transition-colors"
                          >
                            Select <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PANEL 4: Inbound En Route */}
      {activePanel === 'inbound' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                Inbound Shipments En Route
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Shipments dispatched from other network hubs currently heading towards this hub.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 self-start sm:self-auto">
              {inboundShipments.length} En Route
            </span>
          </div>

          {inboundShipments.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No incoming parcels currently in transit</p>
              <p className="text-xs text-slate-400 mt-1">
                Parcels dispatched from other hubs toward this facility will appear here for arrival check-in.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 bg-slate-50/50">
                    <th className="py-2.5 px-3">Tracking #</th>
                    <th className="py-2.5 px-3">Origin Hub</th>
                    <th className="py-2.5 px-3">Destination City</th>
                    <th className="py-2.5 px-3">Recipient</th>
                    <th className="py-2.5 px-3">Dispatched At</th>
                    <th className="py-2.5 px-3 text-right">Arrival Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inboundShipments.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-brand-700 text-xs">
                        {s.trackingNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-800 text-xs font-medium">
                        {s.fromHubName} ({s.fromHubCity})
                      </td>
                      <td className="py-3 px-3 text-slate-800 text-xs font-semibold">
                        {s.destinationCity}
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-xs">
                        {s.recipientName}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500">
                        {s.dispatchedAt ? formatDateTimePST(s.dispatchedAt) : 'Pending'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={receiveSaving}
                          onClick={() => handleReceive(undefined, s.trackingNumber)}
                          className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                        >
                          <ScanLine className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Confirm Arrival
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PANEL 5: Check-In Parcel (Manual Scan) */}
      {activePanel === 'receive' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-8">
          <div className="max-w-xl mx-auto space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-brand-50 rounded-xl shrink-0">
                <ScanLine className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Parcel Arrival Check-In</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Scan barcode or enter tracking number. If this is the destination hub, the parcel automatically transitions to Ready for Delivery.
                </p>
              </div>
            </div>

            <form onSubmit={handleReceive} className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Shipment Tracking Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={receiveTracking}
                  onChange={(e) => setReceiveTracking(e.target.value.toUpperCase())}
                  placeholder="e.g. EHB-2026-000001"
                  className="w-full font-mono text-sm px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 uppercase tracking-wide"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Arrival Inspection Notes (Optional)
                </label>
                <textarea
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  placeholder="e.g. Received in good condition, seal intact..."
                  rows={3}
                  className="w-full text-sm px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={receiveSaving || !receiveTracking.trim()}
                className="w-full h-11 text-base font-semibold"
              >
                {receiveSaving ? 'Processing Check-In...' : 'Confirm Parcel Arrival'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* PANEL 6: Pipeline Overview */}
      {activePanel === 'metrics' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand-600" />
              Logistics Pipeline Status Flow
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Authoritative state machine milestones and hub responsibilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              {
                step: '1',
                title: 'Origin Check-In',
                status: 'AT_ORIGIN_HUB',
                desc: 'Parcel received from customer pickup',
              },
              {
                step: '2',
                title: 'Inter-Hub Transit',
                status: 'IN_TRANSIT',
                desc: 'Freight line between distribution hubs',
              },
              {
                step: '3',
                title: 'Destination Arrival',
                status: 'AT_DESTINATION_HUB',
                desc: 'Checked in at target city hub',
              },
              {
                step: '4',
                title: 'Driver Assignment',
                status: 'ASSIGNED_TO_DRIVER',
                desc: 'Handed over to local delivery courier',
              },
              {
                step: '5',
                title: 'Final Delivery',
                status: 'DELIVERED',
                desc: 'Customer signature & COD settlement',
              },
            ].map((item) => (
              <div key={item.step} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center mb-2">
                  {item.step}
                </span>
                <p className="text-sm font-bold text-slate-900">{item.title}</p>
                <code className="text-[10px] font-mono text-brand-700 bg-brand-50 px-1 py-0.5 rounded border border-brand-200 inline-block my-1">
                  {item.status}
                </code>
                <p className="text-xs text-slate-500 leading-snug">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ASSIGN DRIVER MODAL */}
      {assignModalOpen && selectedShipment && (
        <Modal
          isOpen={assignModalOpen}
          onClose={() => {
            if (!assignSubmitting) {
              setAssignModalOpen(false);
              setSelectedShipment(null);
            }
          }}
          title="Assign Delivery Driver"
          size="lg"
        >
          <form onSubmit={handleAssignDriver} className="space-y-4">
            {/* Shipment Summary Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-brand-700 bg-brand-100/70 px-2.5 py-0.5 rounded border border-brand-200">
                  {selectedShipment.trackingNumber}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700 uppercase">
                    {selectedShipment.serviceType}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      selectedShipment.paymentType === 'COD'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {selectedShipment.paymentType}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-700 space-y-1 pt-1 border-t border-slate-200">
                <p>
                  <strong className="text-slate-900">Recipient:</strong> {selectedShipment.receiverName} (
                  {selectedShipment.receiverPhone})
                </p>
                <p>
                  <strong className="text-slate-900">Destination Address:</strong>{' '}
                  {selectedShipment.receiverAddress}, {selectedShipment.receiverCity}
                </p>
                <p>
                  <strong className="text-slate-900">Package Weight:</strong> {selectedShipment.weightKg} kg
                </p>
                {selectedShipment.paymentType === 'COD' && selectedShipment.codAmount && (
                  <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 font-medium flex items-center justify-between mt-2">
                    <span className="flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-purple-700" />
                      Cash on Delivery to Collect:
                    </span>
                    <span className="font-mono font-bold text-sm">
                      {formatPKR(selectedShipment.codAmount)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Driver Selector */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Select Active Hub Driver <span className="text-red-500">*</span>
              </label>
              {drivers.length > 0 ? (
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  required
                  className="w-full text-sm px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="">— Select Driver —</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.vehicleRegistration || 'Vehicle Pending'}) —{' '}
                      {d.isAvailable ? 'Available' : 'Busy'} ({d.activeDeliveriesCount} active deliveries)
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  No active drivers are currently registered for this hub. Please assign drivers in the Admin Console.
                </div>
              )}
            </div>

            {/* Delivery Instructions */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Special Delivery Instructions (Optional)
              </label>
              <textarea
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder="e.g. Call customer before arrival; fragile goods inside"
                rows={2}
                className="w-full text-sm px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAssignModalOpen(false)}
                disabled={assignSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={assignSubmitting || !selectedDriverId || drivers.length === 0}
              >
                {assignSubmitting ? 'Assigning Driver...' : 'Confirm Assignment'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
