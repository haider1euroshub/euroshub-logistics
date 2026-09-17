import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext.js';
import { apiClient, ApiError } from '../api/client.js';
import { Badge } from '../components/ui/Badge.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { Button } from '../components/ui/Button.js';
import { Modal } from '../components/ui/Modal.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { useToast } from '../components/ui/Toast.js';
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
  FileText,
  AlertTriangle,
} from 'lucide-react';
import {
  ShipmentStatus,
  FailureReason,
  FAILURE_REASON_LABELS,
  formatDateTimePST,
  formatPKR,
} from '@eliteship/shared';

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
  payment?: { amountExpected: number; amountCollected?: number | null; status: string };
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



export const DriverDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [action, setAction] = useState<DeliveryAction>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Delivery completion form state
  const [recipientName, setRecipientName] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [cashCollectedConfirmed, setCashCollectedConfirmed] = useState(false);
  const [amountCollected, setAmountCollected] = useState<number>(0);
  const [discrepancyNote, setDiscrepancyNote] = useState('');

  // Failure form state
  const [failureReason, setFailureReason] = useState<FailureReason>(FailureReason.CUSTOMER_UNAVAILABLE);
  const [failNote, setFailNote] = useState('');

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await apiClient<DashboardSummary>('/api/driver/dashboard');
      setData(result);
    } catch {
      toast('Failed to load dashboard data.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const openShipmentModal = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setAction(null);
    setRecipientName(shipment.receiverName);
    setDeliveryNote('');
    setCashCollectedConfirmed(false);
    setAmountCollected(shipment.payment?.amountExpected ?? 0);
    setDiscrepancyNote('');
    setFailureReason(FailureReason.CUSTOMER_UNAVAILABLE);
    setFailNote('');
  };

  const closeModal = () => {
    if (actionLoading) return;
    setSelectedShipment(null);
    setAction(null);
  };

  const handleStartDelivery = async (shipment: Shipment) => {
    setActionLoading(true);
    try {
      await apiClient(`/api/driver/shipments/${shipment.id}/start-delivery`, { method: 'POST' });
      toast(`Shipment ${shipment.trackingNumber} is now Out for Delivery.`, 'success');
      closeModal();
      await fetchDashboard(true);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Action failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliverShipment = async (shipment: Shipment) => {
    const isCod = shipment.paymentType === 'COD';
    const expected = shipment.payment?.amountExpected ?? 0;
    const collected = Number(amountCollected);

    if (isCod) {
      if (!cashCollectedConfirmed) {
        toast('Please explicitly confirm cash collection before completing delivery.', 'error');
        return;
      }
      if (isNaN(collected) || collected < 0) {
        toast('Please enter a valid non-negative collected cash amount.', 'error');
        return;
      }
      if (collected !== expected && !discrepancyNote.trim() && !deliveryNote.trim()) {
        toast(`Collected amount (Rs. ${collected}) differs from expected (Rs. ${expected}). A discrepancy note is required.`, 'error');
        return;
      }
    }

    setActionLoading(true);
    try {
      await apiClient(`/api/shipments/${shipment.id}/deliver`, {
        method: 'POST',
        body: JSON.stringify({
          recipientName: recipientName.trim() || shipment.receiverName,
          note: deliveryNote.trim() || undefined,
          ...(isCod ? {
            amountCollected: collected,
            discrepancyNote: collected !== expected ? (discrepancyNote.trim() || deliveryNote.trim() || 'Discrepancy reported') : undefined,
          } : {}),
        }),
      });

      toast(`Shipment ${shipment.trackingNumber} successfully marked DELIVERED.`, 'success');
      closeModal();
      await fetchDashboard(true);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Delivery confirmation failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFailDelivery = async (shipment: Shipment) => {
    if (failureReason === FailureReason.OTHER && (!failNote.trim() || failNote.trim().length < 3)) {
      toast('Please provide a descriptive note when failure reason is OTHER.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await apiClient(`/api/driver/shipments/${shipment.id}/fail`, {
        method: 'POST',
        body: JSON.stringify({
          reason: failureReason,
          note: failNote.trim() || undefined,
        }),
      });

      toast(`Delivery attempt failure recorded for ${shipment.trackingNumber}.`, 'info');
      closeModal();
      await fetchDashboard(true);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Recording failure failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const ShipmentCard: React.FC<{ s: Shipment; phase: 'assigned' | 'out' }> = ({ s, phase }) => (
    <div
      onClick={() => openShipmentModal(s)}
      className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-brand-300 hover:shadow-md transition-all cursor-pointer group"
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          phase === 'out' ? 'bg-amber-50' : 'bg-brand-50'
        }`}
      >
        {phase === 'out' ? (
          <Truck className="w-5 h-5 text-amber-600" />
        ) : (
          <Clock className="w-5 h-5 text-brand-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-brand-700">{s.trackingNumber}</span>
          <StatusBadge status={s.status} size="sm" />
          {s.paymentType === 'COD' ? (
            <Badge variant="warning" size="sm">
              COD
            </Badge>
          ) : (
            <Badge variant="success" size="sm">
              PREPAID
            </Badge>
          )}
        </div>
        <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">{s.receiverName}</p>
        <p className="text-xs text-slate-500 truncate">
          {s.receiverAddress}, {s.receiverCity}
        </p>
      </div>
      {s.paymentType === 'COD' && s.payment && (
        <div className="text-right hidden sm:block shrink-0">
          <p className="text-xs text-slate-500">Collect Cash</p>
          <p className="font-mono font-bold text-sm text-amber-700">
            {formatPKR(s.payment.amountExpected)}
          </p>
        </div>
      )}
      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 transition-colors" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Driver Workspace</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Welcome, {user?.fullName}. Manage your delivery runs and COD settlements.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => fetchDashboard(false)} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white">
                <Skeleton className="h-7 w-10 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))
          : [
              {
                label: 'Assigned',
                value: data?.summary.assignedCount ?? 0,
                icon: Clock,
                color: 'text-brand-600',
                bg: 'bg-brand-50',
              },
              {
                label: 'Out for Delivery',
                value: data?.summary.outForDeliveryCount ?? 0,
                icon: Truck,
                color: 'text-amber-600',
                bg: 'bg-amber-50',
              },
              {
                label: 'Delivered Today',
                value: data?.summary.deliveredTodayCount ?? 0,
                icon: PackageCheck,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
              },
              {
                label: 'Failed',
                value: data?.summary.failedCount ?? 0,
                icon: AlertCircle,
                color: 'text-red-600',
                bg: 'bg-red-50',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white shadow-xs"
              >
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              </div>
            ))}
      </div>

      {/* COD banner */}
      {data && data.summary.codToCollect > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <Banknote className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>COD to collect today:</strong>{' '}
            <span className="font-mono font-bold">{formatPKR(data.summary.codToCollect)}</span>
          </p>
        </div>
      )}

      {/* Assigned shipments */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Assigned — Ready for Pick-up
          <span className="ml-1 text-xs font-normal text-slate-400">
            ({data?.summary.assignedCount ?? 0})
          </span>
        </h2>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : data?.assignedShipments.length === 0 ? (
          <p className="text-sm text-slate-400 italic pl-2">No shipments assigned to you.</p>
        ) : (
          data?.assignedShipments.map((s) => <ShipmentCard key={s.id} s={s} phase="assigned" />)
        )}
      </section>

      {/* Out for delivery */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
          <Truck className="w-4 h-4" /> Out for Delivery — Active Runs
          <span className="ml-1 text-xs font-normal text-slate-400">
            ({data?.summary.outForDeliveryCount ?? 0})
          </span>
        </h2>
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : data?.outForDeliveryShipments.length === 0 ? (
          <p className="text-sm text-slate-400 italic pl-2">No active delivery runs.</p>
        ) : (
          data?.outForDeliveryShipments.map((s) => <ShipmentCard key={s.id} s={s} phase="out" />)
        )}
      </section>

      {/* Shipment Action Modal */}
      {selectedShipment && (
        <Modal
          isOpen={!!selectedShipment}
          onClose={closeModal}
          title={`Shipment — ${selectedShipment.trackingNumber}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={selectedShipment.status} size="md" />
              {selectedShipment.paymentType === 'COD' ? (
                <Badge variant="warning">COD</Badge>
              ) : (
                <Badge variant="success">PREPAID</Badge>
              )}
            </div>

            {/* Receiver details */}
            <div className="p-4 rounded-xl bg-slate-50 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Delivery Address
              </h4>
              <div className="flex items-center gap-2 text-sm text-slate-900">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                {selectedShipment.receiverName}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(selectedShipment.receiverAddress + ', ' + selectedShipment.receiverCity)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-600 hover:underline transition-colors"
                  title="Open in Maps"
                >
                  {selectedShipment.receiverAddress}, {selectedShipment.receiverCity}
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <a
                  href={`tel:${selectedShipment.receiverPhone}`}
                  className="font-medium text-brand-600 hover:underline"
                  title="Call Customer"
                >
                  {selectedShipment.receiverPhone}
                </a>
              </div>
            </div>

            {/* Payment Summary */}
            {selectedShipment.paymentType === 'COD' && selectedShipment.payment ? (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                <Banknote className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-700">Cash on Delivery Required</p>
                  <p className="font-mono font-bold text-lg text-amber-800">
                    {formatPKR(selectedShipment.payment.amountExpected)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-emerald-700">Prepaid Consignment</p>
                  <p className="text-xs text-emerald-800">
                    No cash collection is due from the recipient.
                  </p>
                </div>
              </div>
            )}

            {/* COMPLETE DELIVERY FORM */}
            {action === 'complete' && (
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3.5">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Confirm Handover & Payment
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Received By (Name)
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Recipient's full name"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                {/* COD Specific Confirmation */}
                {selectedShipment.paymentType === 'COD' && (
                  <div className="p-3 bg-white rounded-lg border border-amber-200 space-y-3">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cashCollectedConfirmed}
                        onChange={(e) => setCashCollectedConfirmed(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                      />
                      <span className="text-xs text-slate-800 font-semibold leading-snug">
                        I confirm that cash was physically collected from customer
                      </span>
                    </label>

                    {cashCollectedConfirmed && (
                      <div className="space-y-2 pt-1 border-t border-slate-100">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Amount Collected (PKR)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={amountCollected}
                            onChange={(e) => setAmountCollected(Number(e.target.value))}
                            className="w-full font-mono text-sm px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                          />
                        </div>

                        {Number(amountCollected) !== (selectedShipment.payment?.amountExpected ?? 0) && (
                          <div className="p-2.5 bg-red-50 rounded-lg border border-red-200 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-red-700 font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Discrepancy Note Required
                            </div>
                            <input
                              type="text"
                              value={discrepancyNote}
                              onChange={(e) => setDiscrepancyNote(e.target.value)}
                              placeholder="Reason for difference in collected amount..."
                              className="w-full text-xs px-2.5 py-1.5 rounded border border-red-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500"
                              required
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Delivery Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    placeholder="e.g. Left with office reception"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            {/* FAILURE REPORT FORM */}
            {action === 'fail' && (
              <div className="p-4 rounded-xl bg-red-50/60 border border-red-200 space-y-3">
                <h4 className="text-sm font-bold text-red-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  Record Delivery Failure
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Failure Reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value as FailureReason)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                  >
                    {Object.values(FailureReason).map((reason) => (
                      <option key={reason} value={reason}>
                        {FAILURE_REASON_LABELS[reason] || reason}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Notes {failureReason === FailureReason.OTHER && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    value={failNote}
                    onChange={(e) => setFailNote(e.target.value)}
                    placeholder="Provide details about the failed attempt..."
                    rows={2}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              {selectedShipment.status === ShipmentStatus.ASSIGNED_TO_DRIVER && action === null && (
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
                    disabled={
                      actionLoading ||
                      (selectedShipment.paymentType === 'COD' && !cashCollectedConfirmed)
                    }
                    className="flex-1"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    {actionLoading ? 'Recording...' : 'Confirm Delivery'}
                  </Button>
                  <Button variant="ghost" onClick={() => setAction(null)}>
                    Back
                  </Button>
                </>
              )}

              {action === 'fail' && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => handleFailDelivery(selectedShipment)}
                    disabled={
                      actionLoading ||
                      (failureReason === FailureReason.OTHER && !failNote.trim())
                    }
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    {actionLoading ? 'Recording...' : 'Record Failure'}
                  </Button>
                  <Button variant="ghost" onClick={() => setAction(null)}>
                    Back
                  </Button>
                </>
              )}

              <Button variant="ghost" onClick={closeModal}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
