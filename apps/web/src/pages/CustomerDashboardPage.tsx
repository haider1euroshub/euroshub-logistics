import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import { apiClient } from '../api/client.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { DataTable, Column } from '../components/ui/DataTable.js';
import { Modal } from '../components/ui/Modal.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { useToast } from '../components/ui/Toast.js';
import {
  Package,
  PackageCheck,
  TruckIcon,
  Download,
  Eye,
  Clock,
  MapPin,
  User,
  Phone,
  Banknote,
  CalendarDays,
  RefreshCw,
  Copy,
  Check,
  Compass,
  Plus,
} from 'lucide-react';
import { ShipmentStatus, formatDateTimePST, formatPKR } from '@eliteship/shared';

interface Shipment {
  id: string;
  trackingNumber: string;
  status: string;
  serviceType: string;
  paymentType: string;
  senderName: string;
  senderCity: string;
  receiverName: string;
  receiverCity: string;
  receiverPhone: string;
  weightKg: number;
  createdAt: string;
  pricingSnapshot?: { totalFee: number };
  payment?: { amountExpected: number; amountCollected: number; status: string };
}

interface DashboardData {
  shipments: Shipment[];
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  total?: number;
}

const STATUS_COLOR: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  CREATED: 'warning',
  PICKUP_SCHEDULED: 'warning',
  PICKED_UP: 'info',
  AT_ORIGIN_HUB: 'info',
  IN_TRANSIT: 'info',
  AT_DESTINATION_HUB: 'info',
  ASSIGNED_TO_DRIVER: 'info',
  OUT_FOR_DELIVERY: 'warning',
  DELIVERED: 'success',
  DELIVERY_FAILED: 'danger',
  RETURNED: 'danger',
  CANCELLED: 'danger',
  RESCHEDULED: 'warning',
};

export const CustomerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const { toast } = useToast();
  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    toast(message, variant);
  };

  const copyTracking = (num: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    showToast(`Tracking number ${num} copied to clipboard.`);
    setTimeout(() => setCopiedNumber(null), 2500);
  };

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '10',
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const result = await apiClient<DashboardData>(`/api/shipments?${params}`);
      setData(result);
    } catch {
      showToast('Failed to load your shipments.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const handleDownloadLabel = async (shipmentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const blob = await apiClient<Blob>(`/api/shipments/${shipmentId}/label`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consignment-note-${shipmentId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Could not download consignment note.', 'error');
    }
  };

  const totalShipments = data?.pagination?.total ?? data?.total ?? 0;

  const columns: Column<Shipment>[] = [
    {
      key: 'trackingNumber',
      header: 'Tracking Number',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <span className="font-mono font-bold text-brand-700 text-xs tracking-wider bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
            {row.trackingNumber}
          </span>
          <button
            type="button"
            onClick={(e) => copyTracking(row.trackingNumber, e)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Copy tracking number"
          >
            {copiedNumber === row.trackingNumber ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Current Status',
      render: (row) => (
        <Badge variant={STATUS_COLOR[row.status] || 'default'} size="sm">
          {row.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'receiverName',
      header: 'Destination & Recipient',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm">{row.receiverName}</p>
          <p className="text-xs text-slate-500">
            {row.senderCity} → <span className="font-medium text-slate-700">{row.receiverCity}</span>
          </p>
        </div>
      ),
    },
    {
      key: 'serviceType',
      header: 'Service',
      render: (row) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
          {row.serviceType}
        </span>
      ),
    },
    {
      key: 'totalFee',
      header: 'Freight (PKR)',
      render: (row) => (
        <span className="font-mono text-sm font-semibold text-slate-800">
          {formatPKR(row.pricingSnapshot?.totalFee ?? 0)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Booked Date',
      render: (row) => (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {formatDateTimePST(new Date(row.createdAt))}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => navigate(`/track?number=${row.trackingNumber}`)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
            title="Track live status"
          >
            <Compass className="w-3.5 h-3.5" />
            Track
          </button>
          <button
            type="button"
            onClick={() => setSelectedShipment(row)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="View full shipment details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => handleDownloadLabel(row.id, e)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            title="Download consignment note"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Summary counts
  const shipments = data?.shipments || [];
  const delivered = shipments.filter((s) => s.status === ShipmentStatus.DELIVERED).length;
  const inTransit = shipments.filter((s) =>
    [
      ShipmentStatus.IN_TRANSIT,
      ShipmentStatus.OUT_FOR_DELIVERY,
      ShipmentStatus.AT_DESTINATION_HUB,
    ].includes(s.status as ShipmentStatus)
  ).length;
  const pending = shipments.filter((s) =>
    [
      ShipmentStatus.CREATED,
      ShipmentStatus.PICKUP_SCHEDULED,
      ShipmentStatus.PICKED_UP,
      ShipmentStatus.AT_ORIGIN_HUB,
    ].includes(s.status as ShipmentStatus)
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Shipments</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Signed in as <span className="font-semibold text-slate-700">{user?.fullName}</span>. All your consignment tracking records are permanently archived below.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={fetchShipments} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin text-brand-600' : ''}`} />
            Refresh
          </Button>
          <Link
            to="/create-shipment"
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Book New Shipment
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Shipments', value: totalShipments, icon: Package, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'Active In Transit', value: inTransit, icon: TruckIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Processing / Hub', value: pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Delivered', value: delivered, icon: PackageCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-200 bg-white shadow-xs"
          >
            <div className={`p-3 rounded-xl ${stat.bg} shrink-0`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              {loading ? (
                <Skeleton className="h-6 w-10 mb-1" />
              ) : (
                <p className="text-xl font-bold text-slate-900">{stat.value}</p>
              )}
              <p className="text-xs text-slate-500 font-medium leading-tight">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Shipments Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <DataTable<Shipment>
          columns={columns}
          data={shipments}
          total={totalShipments}
          page={page}
          pageSize={10}
          onPageChange={setPage}
          isLoading={loading}
          searchValue={search}
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
          searchPlaceholder="Search by tracking number, receiver, or city..."
          onRowClick={(row) => setSelectedShipment(row)}
          emptyTitle="No shipments found"
          emptyDescription="You haven't booked any shipments yet or no records match your filter criteria."
          filterSlot={
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">All Shipment Statuses</option>
              {Object.values(ShipmentStatus).map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          }
          cardRender={(row) => (
            <div className="space-y-2.5 p-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                    {row.trackingNumber}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => copyTracking(row.trackingNumber, e)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <Badge variant={STATUS_COLOR[row.status] || 'default'} size="sm">
                  {row.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="text-sm font-semibold text-slate-900">{row.receiverName}</div>
              <div className="text-xs text-slate-500">{row.senderCity} → {row.receiverCity}</div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800">
                  {formatPKR(row.pricingSnapshot?.totalFee ?? 0)}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/track?number=${row.trackingNumber}`)}
                    className="text-brand-600 font-semibold text-xs flex items-center gap-1"
                  >
                    <Compass className="w-3.5 h-3.5" /> Track
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedShipment(row)}
                    className="text-slate-600 font-medium text-xs ml-2"
                  >
                    Details
                  </button>
                </div>
              </div>
            </div>
          )}
        />
      </div>

      {/* Shipment Detail Modal */}
      {selectedShipment && (
        <Modal
          isOpen={!!selectedShipment}
          onClose={() => setSelectedShipment(null)}
          title={`Consignment Details`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            {/* Prominent Tracking Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Tracking Number
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-mono font-extrabold text-brand-700 tracking-wider">
                    {selectedShipment.trackingNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyTracking(selectedShipment.trackingNumber)}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs"
                    title="Copy to clipboard"
                  >
                    {copiedNumber === selectedShipment.trackingNumber ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_COLOR[selectedShipment.status] || 'default'}>
                  {selectedShipment.status.replace(/_/g, ' ')}
                </Badge>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700 uppercase">
                  {selectedShipment.serviceType}
                </span>
              </div>
            </div>

            {/* Route & Parties */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Sender (Origin)</h4>
                <div className="flex items-center gap-2 text-sm text-slate-900 font-medium">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  {selectedShipment.senderName}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  {selectedShipment.senderCity}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Receiver (Destination)</h4>
                <div className="flex items-center gap-2 text-sm text-slate-900 font-medium">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  {selectedShipment.receiverName}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  {selectedShipment.receiverCity}
                </div>
                {selectedShipment.receiverPhone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    {selectedShipment.receiverPhone}
                  </div>
                )}
              </div>
            </div>

            {/* Shipment Financials & Weight */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg border border-slate-200 text-center bg-white">
                <p className="text-xs text-slate-500 mb-1">Freight Fee</p>
                <p className="font-mono font-bold text-slate-900 text-base">
                  {formatPKR(selectedShipment.pricingSnapshot?.totalFee ?? 0)}
                </p>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 text-center bg-white">
                <p className="text-xs text-slate-500 mb-1">Payment Method</p>
                <p className="font-semibold text-sm text-slate-900">{selectedShipment.paymentType}</p>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 text-center bg-white">
                <p className="text-xs text-slate-500 mb-1">Weight</p>
                <p className="font-semibold text-sm text-slate-900">{selectedShipment.weightKg} kg</p>
              </div>
            </div>

            {/* COD Details if applicable */}
            {selectedShipment.paymentType === 'COD' && selectedShipment.payment && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                <Banknote className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-900">Cash on Delivery (COD)</p>
                  <p className="text-amber-800 text-xs mt-0.5">
                    Amount to Collect: <strong>{formatPKR(selectedShipment.payment.amountExpected)}</strong> — Status: <span className="uppercase font-bold">{selectedShipment.payment.status}</span>
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              Booked on {formatDateTimePST(new Date(selectedShipment.createdAt))}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <Button variant="ghost" onClick={() => setSelectedShipment(null)}>
                Close
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => handleDownloadLabel(selectedShipment.id)}
                >
                  <Download className="w-4 h-4 mr-1.5" /> Consignment Note
                </Button>
                <button
                  type="button"
                  onClick={() => navigate(`/track?number=${selectedShipment.trackingNumber}`)}
                  className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-xs transition-colors"
                >
                  <Compass className="w-4 h-4 mr-1.5" /> Live Track
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
