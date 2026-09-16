import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext.js';
import { apiClient, ApiError } from '../api/client.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Modal } from '../components/ui/Modal.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { Toast } from '../components/ui/Toast.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';
import {
 Truck,
 PackageCheck,
 AlertCircle,
 Clock,
 Banknote,
 MapPin,
 Phone,
 User,
 RefreshCw,
 CheckCircle2,
 XCircle,
 ChevronRight,
 ArrowRight,
} from 'lucide-react';
import { ShipmentStatus, formatDateTimePST, formatPKR } from '@eliteship/shared';

interface Shipment {
 id: string;
 trackingNumber: string;
 status: string;
 receiverName: string;
 receiverPhone: string;
 receiverAddress: string;
 receiverCity: string;
 senderName: string;
 senderCity: string;
 paymentType: string;
 weightKg: number;
 pricingSnapshot?: { totalFee: number };
 payment?: { amountExpected: number; amountCollected: number; status: string };
 createdAt: string;
}

interface DashboardSummary {
 summary: {
 assignedCount: number;
 outForDeliveryCount: number;
 deliveredTodayCount: number;
 failedCount: number;
 codToCollect: number;
 };
 assignedShipments: Shipment[];
 outForDeliveryShipments: Shipment[];
}

type DeliveryAction = 'start' | 'complete' | 'fail' | null;

const STATUS_COLOR: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
 ASSIGNED_TO_DRIVER: 'info',
 OUT_FOR_DELIVERY: 'warning',
 DELIVERED: 'success',
 DELIVERY_FAILED: 'danger',
 RESCHEDULED: 'warning',
};

export const DriverDashboardPage: React.FC = () => {
 const { user } = useAuth();
 const [data, setData] = useState<DashboardSummary | null>(null);
 const [loading, setLoading] = useState(true);
 const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
 const [action, setAction] = useState<DeliveryAction>(null);
 const [actionLoading, setActionLoading] = useState(false);
 const [failNote, setFailNote] = useState('');
 const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

 const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
 setToast({ message, variant });
 };

 const fetchDashboard = useCallback(async () => {
 setLoading(true);
 try {
 const result = await apiClient<DashboardSummary>('/api/driver/dashboard');
 setData(result);
 } catch {
 showToast('Failed to load dashboard data.', 'error');
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => {
 fetchDashboard();
 }, [fetchDashboard]);

 const handleStartDelivery = async (shipment: Shipment) => {
 setActionLoading(true);
 try {
 await apiClient(`/api/driver/shipments/${shipment.id}/start-delivery`, { method: 'POST' });
 showToast(`Shipment ${shipment.trackingNumber} marked as Out for Delivery.`);
 setSelectedShipment(null);
 setAction(null);
 await fetchDashboard();
 } catch (err) {
 showToast(err instanceof ApiError ? err.message : 'Action failed.', 'error');
 } finally {
 setActionLoading(false);
 }
 };

 const handleDeliverShipment = async (shipment: Shipment) => {
 setActionLoading(true);
 try {
 await apiClient(`/api/shipments/${shipment.id}/status`, {
 method: 'PATCH',
 body: JSON.stringify({ toStatus: ShipmentStatus.DELIVERED }),
 });
 showToast(`Shipment ${shipment.trackingNumber} marked DELIVERED. ✓`);
 setSelectedShipment(null);
 setAction(null);
 await fetchDashboard();
 } catch (err) {
 showToast(err instanceof ApiError ? err.message : 'Action failed.', 'error');
 } finally {
 setActionLoading(false);
 }
 };

 const handleFailDelivery = async (shipment: Shipment) => {
 if (!failNote.trim()) {
 showToast('Please provide a failure reason.', 'error');
 return;
 }
 setActionLoading(true);
 try {
 await apiClient(`/api/shipments/${shipment.id}/status`, {
 method: 'PATCH',
 body: JSON.stringify({ toStatus: ShipmentStatus.DELIVERY_FAILED, note: failNote }),
 });
 showToast(`Delivery failed recorded for ${shipment.trackingNumber}.`);
 setSelectedShipment(null);
 setAction(null);
 setFailNote('');
 await fetchDashboard();
 } catch (err) {
 showToast(err instanceof ApiError ? err.message : 'Action failed.', 'error');
 } finally {
 setActionLoading(false);
 }
 };

 const ShipmentCard: React.FC<{ s: Shipment; phase: 'assigned' | 'out' }> = ({ s, phase }) => (
 <div
 onClick={() => { setSelectedShipment(s); setAction(null); }}
 className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-brand-300 hover:shadow-md transition-all cursor-pointer group"
 >
 <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
 phase === 'out'
 ? 'bg-amber-50 '
 : 'bg-brand-50 '
 }`}>
 {phase === 'out'
 ? <Truck className="w-5 h-5 text-amber-600" />
 : <Clock className="w-5 h-5 text-brand-600" />
 }
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="font-mono text-xs font-bold text-brand-700 ">{s.trackingNumber}</span>
 <Badge variant={STATUS_COLOR[s.status] || 'default'} size="sm">
 {s.status.replace(/_/g, ' ')}
 </Badge>
 {s.paymentType === 'COD' && (
 <Badge variant="warning" size="sm">COD</Badge>
 )}
 </div>
 <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">{s.receiverName}</p>
 <p className="text-xs text-slate-500 truncate">{s.receiverAddress}, {s.receiverCity}</p>
 </div>
 {s.paymentType === 'COD' && s.payment && (
 <div className="text-right hidden sm:block shrink-0">
 <p className="text-xs text-slate-500">Collect</p>
 <p className="font-mono font-bold text-sm text-amber-700 ">
 {formatPKR(s.payment.amountExpected)}
 </p>
 </div>
 )}
 <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 transition-colors" />
 </div>
 );

 return (
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
 {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}

 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-slate-900 ">Driver Workspace</h1>
 <p className="text-sm text-slate-500 mt-0.5">
 Welcome, {user?.fullName}. Manage your delivery runs below.
 </p>
 </div>
 <Button variant="ghost" size="sm" onClick={fetchDashboard} disabled={loading}>
 <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
 Refresh
 </Button>
 </div>

 {/* Summary Cards */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
 {loading
 ? Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white ">
 <Skeleton className="h-7 w-10 mb-2" />
 <Skeleton className="h-4 w-24" />
 </div>
 ))
 : [
 { label: 'Assigned', value: data?.summary.assignedCount ?? 0, icon: Clock, color: 'text-brand-600', bg: 'bg-brand-50 ' },
 { label: 'Out for Delivery', value: data?.summary.outForDeliveryCount ?? 0, icon: Truck, color: 'text-amber-600', bg: 'bg-amber-50 ' },
 { label: 'Delivered Today', value: data?.summary.deliveredTodayCount ?? 0, icon: PackageCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 ' },
 { label: 'Failed', value: data?.summary.failedCount ?? 0, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 ' },
 ].map((stat) => (
 <div key={stat.label} className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
 <div className={`p-2.5 rounded-xl ${stat.bg}`}>
 <stat.icon className={`w-5 h-5 ${stat.color}`} />
 </div>
 <div>
 <p className="text-xl font-bold text-slate-900 ">{stat.value}</p>
 <p className="text-xs text-slate-500">{stat.label}</p>
 </div>
 </div>
 ))
 }
 </div>

 {/* COD banner */}
 {data && data.summary.codToCollect > 0 && (
 <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 ">
 <Banknote className="w-5 h-5 text-amber-600 shrink-0" />
 <p className="text-sm text-amber-800 ">
 <strong>COD to collect today:</strong>{' '}
 <span className="font-mono font-bold">{formatPKR(data.summary.codToCollect)}</span>
 </p>
 </div>
 )}

 {/* Assigned shipments */}
 <section className="space-y-3">
 <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
 <Clock className="w-4 h-4" /> Assigned — Ready for Pick-up
 <span className="ml-1 text-xs font-normal text-slate-400">({data?.summary.assignedCount ?? 0})</span>
 </h2>
 {loading
 ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
 : data?.assignedShipments.length === 0
 ? <p className="text-sm text-slate-400 italic pl-2">No shipments assigned to you.</p>
 : data?.assignedShipments.map((s) => <ShipmentCard key={s.id} s={s} phase="assigned" />)
 }
 </section>

 {/* Out for delivery */}
 <section className="space-y-3">
 <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
 <Truck className="w-4 h-4" /> Out for Delivery — Active Runs
 <span className="ml-1 text-xs font-normal text-slate-400">({data?.summary.outForDeliveryCount ?? 0})</span>
 </h2>
 {loading
 ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
 : data?.outForDeliveryShipments.length === 0
 ? <p className="text-sm text-slate-400 italic pl-2">No active delivery runs.</p>
 : data?.outForDeliveryShipments.map((s) => <ShipmentCard key={s.id} s={s} phase="out" />)
 }
 </section>

 {/* Shipment Action Modal */}
 {selectedShipment && (
 <Modal
 isOpen={!!selectedShipment}
 onClose={() => { setSelectedShipment(null); setAction(null); setFailNote(''); }}
 title={`Shipment — ${selectedShipment.trackingNumber}`}
 size="md"
 >
 <div className="space-y-4">
 <div className="flex items-center gap-2 flex-wrap">
 <Badge variant={STATUS_COLOR[selectedShipment.status] || 'default'}>
 {selectedShipment.status.replace(/_/g, ' ')}
 </Badge>
 {selectedShipment.paymentType === 'COD' && <Badge variant="warning">COD</Badge>}
 </div>

 {/* Receiver details */}
 <div className="p-4 rounded-xl bg-slate-50 space-y-2">
 <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Delivery Address</h4>
 <div className="flex items-center gap-2 text-sm text-slate-900 ">
 <User className="w-4 h-4 text-slate-400 shrink-0" />
 {selectedShipment.receiverName}
 </div>
 <div className="flex items-center gap-2 text-sm text-slate-600 ">
 <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
 {selectedShipment.receiverAddress}, {selectedShipment.receiverCity}
 </div>
 <div className="flex items-center gap-2 text-sm text-slate-600 ">
 <Phone className="w-4 h-4 text-slate-400 shrink-0" />
 {selectedShipment.receiverPhone}
 </div>
 </div>

 {/* COD */}
 {selectedShipment.paymentType === 'COD' && selectedShipment.payment && (
 <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 ">
 <Banknote className="w-5 h-5 text-amber-600 shrink-0" />
 <div>
 <p className="text-xs font-semibold text-amber-700 ">Collect on Delivery</p>
 <p className="font-mono font-bold text-lg text-amber-800 ">
 {formatPKR(selectedShipment.payment.amountExpected)}
 </p>
 </div>
 </div>
 )}

 {/* Failure note input */}
 {action === 'fail' && (
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ">
 Failure Reason <span className="text-red-500">*</span>
 </label>
 <textarea
 value={failNote}
 onChange={(e) => setFailNote(e.target.value)}
 placeholder="e.g. Receiver not available, address not found..."
 rows={3}
 className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 resize-none"
 />
 </div>
 )}

 {/* Action Buttons */}
 <div className="flex flex-wrap gap-2 pt-1">
 {selectedShipment.status === ShipmentStatus.ASSIGNED_TO_DRIVER && action !== 'fail' && (
 <Button
 variant="primary"
 onClick={() => handleStartDelivery(selectedShipment)}
 disabled={actionLoading}
 className="flex-1"
 >
 <Truck className="w-4 h-4 mr-1.5" />
 {actionLoading ? 'Processing...' : 'Start Delivery Run'}
 </Button>
 )}

 {selectedShipment.status === ShipmentStatus.OUT_FOR_DELIVERY && action === null && (
 <>
 <Button
 variant="primary"
 onClick={() => setAction('complete')}
 className="flex-1"
 >
 <CheckCircle2 className="w-4 h-4 mr-1.5" /> Mark Delivered
 </Button>
 <Button
 variant="danger"
 onClick={() => setAction('fail')}
 className="flex-1"
 >
 <XCircle className="w-4 h-4 mr-1.5" /> Report Failure
 </Button>
 </>
 )}

 {action === 'complete' && (
 <>
 <Button
 variant="primary"
 onClick={() => handleDeliverShipment(selectedShipment)}
 disabled={actionLoading}
 className="flex-1"
 >
 <CheckCircle2 className="w-4 h-4 mr-1.5" />
 {actionLoading ? 'Recording...' : 'Confirm Delivery'}
 </Button>
 <Button variant="ghost" onClick={() => setAction(null)}>Cancel</Button>
 </>
 )}

 {action === 'fail' && (
 <>
 <Button
 variant="danger"
 onClick={() => handleFailDelivery(selectedShipment)}
 disabled={actionLoading || !failNote.trim()}
 className="flex-1"
 >
 <XCircle className="w-4 h-4 mr-1.5" />
 {actionLoading ? 'Recording...' : 'Record Failure'}
 </Button>
 <Button variant="ghost" onClick={() => setAction(null)}>Cancel</Button>
 </>
 )}

 <Button
 variant="ghost"
 onClick={() => { setSelectedShipment(null); setAction(null); setFailNote(''); }}
 >
 Close
 </Button>
 </div>
 </div>
 </Modal>
 )}
 </div>
 );
};
