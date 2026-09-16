import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient, ApiError } from '../api/client.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { DataTable, Column } from '../components/ui/DataTable.js';
import { Modal } from '../components/ui/Modal.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Toast } from '../components/ui/Toast.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';
import {
 Users,
 Warehouse,
 Truck,
 DollarSign,
 BarChart3,
 Settings,
 ClipboardList,
 RefreshCw,
 Plus,
 Pencil,
 Trash2,
 Download,
 ToggleLeft,
 ToggleRight,
 ShieldCheck,
 TrendingUp,
 Package,
 PackageCheck,
 AlertCircle,
 Eye,
 UserCheck,
 UserX,
 MapPin,
 AlertTriangle,
 UserCog,
} from 'lucide-react';
import {
  Role,
  ServiceType,
  formatPKR,
  formatDateTimePST,
  formatDatePST,
  fractionToPercent,
  percentToFraction,
  formatPercent,
  PricingRule,
} from '@eliteship/shared';
import {
 BarChart,
 Bar,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 Legend,
 PieChart,
 Pie,
 Cell,
 ResponsiveContainer,
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserRow {
 id: string;
 fullName: string;
 email: string;
 phone?: string;
 role: Role;
 isActive: boolean;
 createdAt: string;
 driverProfile?: {
   id: string;
   homeHubId?: string;
   homeHub?: { id: string; name: string; city: string };
   vehicle?: { id: string; registrationNo: string; type: string };
 } | null;
 hubStaffProfile?: {
   id: string;
   hubId: string;
   hub?: { id: string; name: string; city: string };
 } | null;
 customerProfile?: { id: string; _count?: { shipments: number } } | null;
}

interface Hub {
 id: string;
 name: string;
 code: string;
 city: string;
 address: string;
 phone?: string | null;
 latitude?: number | null;
 longitude?: number | null;
 isActive: boolean;
 _count?: { staff: number; drivers: number; vehicles: number };
}

interface Vehicle {
 id: string;
 registrationNo: string;
 type: string;
 makeModel?: string | null;
 status: string;
 currentMileage?: number | null;
 notes?: string | null;
 hubId?: string | null;
 hub?: { id: string; name: string; city: string } | null;
 driverId?: string | null;
 driver?: {
   id: string;
   user: { fullName: string; phone?: string; email: string };
   homeHub?: { id: string; name: string } | null;
 } | null;
}

interface ReportSummary {
 period: { from: string; to: string };
 metrics: {
 totalCreated: number;
 inTransit: number;
 outForDelivery: number;
 delivered: number;
 failed: number;
 returned: number;
 activeDrivers: number;
 activeHubs: number;
 successRate: number;
 codPending: number;
 codCollected: number;
 totalRevenue: number;
 };
}

interface AuditLog {
 id: string;
 actorUserId: string;
 actorRole: string;
 action: string;
 entityType: string;
 entityId: string;
 createdAt: string;
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
 { id: 'reports', label: 'Reports', icon: BarChart3 },
 { id: 'users', label: 'Users', icon: Users },
 { id: 'hubs', label: 'Hubs', icon: Warehouse },
 { id: 'vehicles', label: 'Vehicles', icon: Truck },
 { id: 'pricing', label: 'Pricing Rules', icon: DollarSign },
 { id: 'audit', label: 'Audit Log', icon: ClipboardList },
 { id: 'settings', label: 'Settings', icon: Settings },
] as const;

type TabId = typeof TABS[number]['id'];

const VALID_TAB_IDS: readonly string[] = TABS.map((t) => t.id);

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

// ─── Component ────────────────────────────────────────────────────────────────

export const AdminConsolePage: React.FC = () => {
 const { tab } = useParams<{ tab?: string }>();
 const navigate = useNavigate();

 // Validate tab parameter or fallback to 'reports'
 const activeTab: TabId = (tab && VALID_TAB_IDS.includes(tab)) ? (tab as TabId) : 'reports';

 // If URL has an invalid tab param, redirect cleanly to /admin/reports
 useEffect(() => {
 if (tab && !VALID_TAB_IDS.includes(tab)) {
 navigate('/admin/reports', { replace: true });
 }
 }, [tab, navigate]);

 const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

 const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
 setToast({ message, variant });
 };

 const handleTabChange = (id: TabId) => {
   navigate(`/admin/${id}`);
 };

 return (
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
 {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}

 {/* Header */}
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-brand-50 rounded-xl">
 <ShieldCheck className="w-6 h-6 text-brand-600" />
 </div>
 <div>
 <h1 className="text-2xl font-bold text-slate-900 ">Admin Console</h1>
 <p className="text-sm text-slate-500 ">
 Full system control — users, hubs, vehicles, pricing, reports, and settings.
 </p>
 </div>
 </div>

 {/* Tab bar */}
 <div className="flex gap-0.5 overflow-x-auto border-b border-slate-200 ">
 {TABS.map((t) => (
 <button
 key={t.id}
 onClick={() => handleTabChange(t.id)}
 className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
 activeTab === t.id
 ? 'border-brand-600 text-brand-700 '
 : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
 }`}
 >
 <t.icon className="w-4 h-4" />
 {t.label}
 </button>
 ))}
 </div>

 {/* Tab content */}
 <div>
 {activeTab === 'reports' && <ReportsTab showToast={showToast} />}
 {activeTab === 'users' && <UsersTab showToast={showToast} />}
 {activeTab === 'hubs' && <HubsTab showToast={showToast} />}
 {activeTab === 'vehicles' && <VehiclesTab showToast={showToast} />}
 {activeTab === 'pricing' && <PricingTab showToast={showToast} />}
 {activeTab === 'audit' && <AuditTab showToast={showToast} />}
 {activeTab === 'settings' && <SettingsTab showToast={showToast} />}
 </div>
 </div>
 );
};

// ─── Reports Tab ──────────────────────────────────────────────────────────────

const ReportsTab: React.FC<{ showToast: (m: string, v?: 'success' | 'error') => void }> = ({ showToast }) => {
 const [summary, setSummary] = useState<ReportSummary | null>(null);
 const [charts, setCharts] = useState<any>(null);
 const [range, setRange] = useState('month');
 const [loading, setLoading] = useState(true);
 const [exporting, setExporting] = useState(false);

 const fetchData = useCallback(async () => {
 setLoading(true);
 try {
 const [s, c] = await Promise.all([
 apiClient<ReportSummary>(`/api/reports/summary?range=${range}`),
 apiClient<any>('/api/reports/charts'),
 ]);
 setSummary(s);
 setCharts(c);
 } catch {
 showToast('Failed to load report data.', 'error');
 } finally {
 setLoading(false);
 }
 }, [range]);

 useEffect(() => { fetchData(); }, [fetchData]);

 const handleExport = async () => {
 setExporting(true);
 try {
 const blob = await apiClient<Blob>('/api/reports/export');
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = 'euroshub-report.csv';
 a.click();
 URL.revokeObjectURL(url);
 } catch {
 showToast('Export failed.', 'error');
 } finally {
 setExporting(false);
 }
 };

 const m = summary?.metrics;

 return (
 <div className="space-y-6">
 {/* Controls */}
 <div className="flex flex-wrap items-center gap-3 justify-between">
 <div className="flex gap-1 p-1 rounded-xl bg-slate-100 ">
 {['today', 'week', 'month'].map((r) => (
 <button
 key={r}
 onClick={() => setRange(r)}
 className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
 range === r
 ? 'bg-white text-brand-700 shadow-sm'
 : 'text-slate-500 '
 }`}
 >
 {r}
 </button>
 ))}
 </div>
 <div className="flex gap-2">
 <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
 <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
 </Button>
 <Button variant="secondary" size="sm" onClick={handleExport} disabled={exporting}>
 <Download className="w-4 h-4 mr-1.5" /> {exporting ? 'Exporting...' : 'Export CSV'}
 </Button>
 </div>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
 {[
 { label: 'Total Created', value: m?.totalCreated ?? 0, icon: Package, color: 'text-brand-600', bg: 'bg-brand-50 ' },
 { label: 'Delivered', value: m?.delivered ?? 0, icon: PackageCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 ' },
 { label: 'In Transit', value: m?.inTransit ?? 0, icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50 ' },
 { label: 'Failed', value: m?.failed ?? 0, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 ' },
 { label: 'Success Rate', value: `${m?.successRate ?? 0}%`, icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50 ' },
 { label: 'Total Revenue', value: formatPKR(m?.totalRevenue ?? 0), icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50 ' },
 ].map((card) => (
 <div key={card.label} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-white shadow-sm text-center">
 {loading ? (
 <>
 <Skeleton className="h-10 w-10 rounded-xl" />
 <Skeleton className="h-6 w-16" />
 <Skeleton className="h-3 w-20" />
 </>
 ) : (
 <>
 <div className={`p-2.5 rounded-xl ${card.bg}`}>
 <card.icon className={`w-5 h-5 ${card.color}`} />
 </div>
 <p className="text-lg font-bold text-slate-900 ">{card.value}</p>
 <p className="text-xs text-slate-500 leading-tight">{card.label}</p>
 </>
 )}
 </div>
 ))}
 </div>

 {/* COD row */}
 {m && (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 ">
 <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">COD Pending Collection</p>
 <p className="font-mono text-2xl font-bold text-amber-800 ">{formatPKR(m.codPending)}</p>
 </div>
 <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 ">
 <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">COD Collected</p>
 <p className="font-mono text-2xl font-bold text-emerald-800 ">{formatPKR(m.codCollected)}</p>
 </div>
 </div>
 )}

 {/* Charts */}
 {charts && !loading && (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Status Breakdown Pie */}
 <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
 <h3 className="text-sm font-semibold text-slate-700 mb-4">Status Breakdown (Last 30 days)</h3>
 <ResponsiveContainer width="100%" height={240}>
 <PieChart>
 <Pie
 data={charts.statusBreakdown}
 dataKey="count"
 nameKey="status"
 cx="50%"
 cy="50%"
 outerRadius={90}
 label={({ status, percent }) => `${(status || '').slice(0, 8)}… ${(percent * 100).toFixed(0)}%`}
 labelLine={false}
 >
 {charts.statusBreakdown.map((_: any, i: number) => (
 <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
 ))}
 </Pie>
 <Tooltip formatter={(v: any, name: any) => [v, name]} />
 </PieChart>
 </ResponsiveContainer>
 </div>

 {/* City Breakdown Bar */}
 <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
 <h3 className="text-sm font-semibold text-slate-700 mb-4">Top Destination Cities</h3>
 <ResponsiveContainer width="100%" height={240}>
 <BarChart data={charts.cityBreakdown} margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
 <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
 <XAxis dataKey="city" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
 <YAxis tick={{ fontSize: 11 }} />
 <Tooltip />
 <Bar dataKey="count" name="Shipments" fill="#3b82f6" radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>

 {/* Driver Performance */}
 {charts.driverPerformance?.length > 0 && (
 <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
 <h3 className="text-sm font-semibold text-slate-700 mb-4">Driver Performance (Completed vs Failed)</h3>
 <ResponsiveContainer width="100%" height={220}>
 <BarChart data={charts.driverPerformance}>
 <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
 <XAxis dataKey="name" tick={{ fontSize: 11 }} />
 <YAxis tick={{ fontSize: 11 }} />
 <Tooltip />
 <Legend />
 <Bar dataKey="completed" name="Delivered" fill="#10b981" radius={[4, 4, 0, 0]} />
 <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 )}
 </div>
 )}
 </div>
 );
};

// ─── Users Tab ────────────────────────────────────────────────────────────────

const UsersTab: React.FC<{ showToast: (m: string, v?: 'success' | 'error') => void }> = ({ showToast }) => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Role & Hub Change modal state
  const [roleModalUser, setRoleModalUser] = useState<UserRow | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>(Role.CUSTOMER);
  const [selectedHubId, setSelectedHubId] = useState<string>('');
  const [roleNotes, setRoleNotes] = useState<string>('');
  const [roleSaving, setRoleSaving] = useState(false);

  const PAGE_SIZE = 15;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.set('role', roleFilter);
      const [usersRes, hubsRes] = await Promise.all([
        apiClient<{ users: UserRow[] }>(`/api/admin/users?${params}`),
        apiClient<{ hubs: Hub[] }>('/api/admin/hubs'),
      ]);
      setUsers(usersRes.users);
      setHubs(hubsRes.hubs);
    } catch {
      showToast('Failed to load users or hubs.', 'error');
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter((u) =>
    search
      ? u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      : true
  );
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleToggleActive = async (u: UserRow) => {
    try {
      await apiClient(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      showToast(`User ${u.fullName} ${!u.isActive ? 'activated' : 'deactivated'}.`);
      await fetchUsers();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to update user status.', 'error');
    }
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setEditLoading(true);
    try {
      await apiClient(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ fullName: editUser.fullName, phone: editUser.phone }),
      });
      showToast('User contact details updated.');
      setEditUser(null);
      await fetchUsers();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Update failed.', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const openRoleModal = (u: UserRow) => {
    setRoleModalUser(u);
    setSelectedRole(u.role);
    setSelectedHubId(u.hubStaffProfile?.hubId || u.driverProfile?.homeHubId || '');
    setRoleNotes('');
  };

  const handleRoleSave = async () => {
    if (!roleModalUser) return;
    if ((selectedRole === Role.HUB_STAFF || selectedRole === Role.DRIVER) && !selectedHubId) {
      showToast('An operational hub must be selected for this role.', 'error');
      return;
    }

    setRoleSaving(true);
    try {
      await apiClient(`/api/admin/users/${roleModalUser.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({
          role: selectedRole,
          hubId: selectedHubId || undefined,
          notes: roleNotes.trim() || undefined,
        }),
      });
      showToast(`Role and hub updated for ${roleModalUser.fullName}.`);
      setRoleModalUser(null);
      await fetchUsers();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to update user role.', 'error');
    } finally {
      setRoleSaving(false);
    }
  };

  const columns: Column<UserRow>[] = [
    {
      key: 'fullName',
      header: 'Name & Email',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm">{row.fullName}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
          {row.phone && <p className="text-[11px] text-slate-400 font-mono">{row.phone}</p>}
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => {
        let variant: 'danger' | 'info' | 'success' | 'default' = 'default';
        if (row.role === Role.ADMIN) variant = 'danger';
        else if (row.role === Role.DRIVER) variant = 'info';
        else if (row.role === Role.HUB_STAFF) variant = 'success';
        return <Badge variant={variant} size="sm">{row.role}</Badge>;
      },
    },
    {
      key: 'assignment',
      header: 'Assigned Hub',
      render: (row) => {
        const hub = row.hubStaffProfile?.hub || row.driverProfile?.homeHub;
        if (hub) {
          return (
            <div className="text-xs">
              <span className="font-medium text-slate-800">{hub.name}</span>
              <span className="text-slate-400 block text-[11px]">{hub.city}</span>
            </div>
          );
        }
        if (row.customerProfile) {
          return <span className="text-xs text-slate-500">{row.customerProfile._count?.shipments ?? 0} shipments</span>;
        }
        return <span className="text-xs text-slate-400">—</span>;
      },
    },
    {
      key: 'vehicle',
      header: 'Assigned Vehicle',
      render: (row) => {
        if (row.role === Role.DRIVER) {
          const v = row.driverProfile?.vehicle;
          return v ? (
            <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {v.registrationNo}
            </span>
          ) : (
            <span className="text-xs text-amber-600 font-medium">Unassigned</span>
          );
        }
        return <span className="text-xs text-slate-400">—</span>;
      },
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.isActive ? 'success' : 'danger'} size="sm">
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (row) => (
        <span className="text-xs text-slate-500">{formatDateTimePST(new Date(row.createdAt))}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex gap-1 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); openRoleModal(row); }}
            className="p-1.5 rounded text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            title="Change Role & Hub Assignment"
          >
            <UserCog className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setEditUser(row); }}
            className="p-1.5 rounded text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            title="Edit Contact Info"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleActive(row); }}
            className="p-1.5 rounded text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            title={row.isActive ? 'Deactivate User' : 'Activate User'}
          >
            {row.isActive ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
          </button>
        </div>
      ),
    },
  ];

  const activeHubs = hubs.filter((h) => h.isActive);

  return (
    <div className="space-y-4">
      <DataTable<UserRow>
        columns={columns}
        data={paged}
        total={filtered.length}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        isLoading={loading}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search by name, email..."
        emptyTitle="No users found"
        emptyDescription="Try changing the search query or role filter."
        filterSlot={
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none"
          >
            <option value="">All Roles</option>
            {Object.values(Role).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        }
      />

      {/* Edit Contact Details Modal */}
      {editUser && (
        <Modal isOpen onClose={() => setEditUser(null)} title="Edit User Contact Details" size="sm">
          <div className="space-y-4">
            <Input
              label="Full Name"
              value={editUser.fullName}
              onChange={(e) => setEditUser({ ...editUser, fullName: e.target.value })}
            />
            <Input
              label="Phone Number"
              value={editUser.phone || ''}
              onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
              placeholder="+92 300 1234567"
            />
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="ghost" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleEditSave} disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Role & Hub Assignment Modal */}
      {roleModalUser && (
        <Modal isOpen onClose={() => setRoleModalUser(null)} title="Change Role & Hub Assignment" size="md">
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p><span className="font-semibold text-slate-800">User:</span> {roleModalUser.fullName} ({roleModalUser.email})</p>
              <p><span className="font-semibold text-slate-800">Current Role:</span> <Badge size="sm">{roleModalUser.role}</Badge></p>
            </div>

            {roleModalUser.role === Role.ADMIN && selectedRole !== Role.ADMIN && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Demoting Administrator</p>
                  <p>You are demoting an administrator. The system will prevent this change if this is the last remaining active administrator.</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">New System Role *</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as Role)}
                className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value={Role.CUSTOMER}>CUSTOMER — Shipper / Parcel Bookings</option>
                <option value={Role.HUB_STAFF}>HUB_STAFF — Hub Inbound, Dispatch, Driver Assignments</option>
                <option value={Role.DRIVER}>DRIVER — Courier Workspace & Route Deliveries</option>
                <option value={Role.ADMIN}>ADMIN — Full System Administration</option>
              </select>
            </div>

            {(selectedRole === Role.HUB_STAFF || selectedRole === Role.DRIVER) && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {selectedRole === Role.HUB_STAFF ? 'Assigned Operational Hub *' : 'Home Base Hub *'}
                </label>
                <select
                  value={selectedHubId}
                  onChange={(e) => setSelectedHubId(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  required
                >
                  <option value="">-- Select Hub --</option>
                  {activeHubs.map((h) => (
                    <option key={h.id} value={h.id}>{h.name} ({h.city} - {h.code})</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedRole === Role.HUB_STAFF
                    ? 'Staff member will have permission to process dispatches and deliveries at this hub.'
                    : 'Driver will be stationed at this hub and assigned delivery routes.'}
                </p>
              </div>
            )}

            <Input
              label="Audit Note (Optional)"
              value={roleNotes}
              onChange={(e) => setRoleNotes(e.target.value)}
              placeholder="Reason for role change or hub transfer"
            />

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setRoleModalUser(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleRoleSave} disabled={roleSaving}>
                {roleSaving ? 'Saving...' : 'Apply Role & Hub'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── Hubs Tab ─────────────────────────────────────────────────────────────────

const HubsTab: React.FC<{ showToast: (m: string, v?: 'success' | 'error') => void }> = ({ showToast }) => {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editHub, setEditHub] = useState<Partial<Hub> | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Operational Roster Modal state
  const [rosterHubId, setRosterHubId] = useState<string | null>(null);
  const [rosterData, setRosterData] = useState<{ hub: any; activeShipmentsCount: number } | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [deleteHubId, setDeleteHubId] = useState<string | null>(null);

  const fetchHubs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient<{ hubs: Hub[] }>('/api/admin/hubs');
      setHubs(r.hubs);
    } catch {
      showToast('Failed to load hubs.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHubs(); }, [fetchHubs]);

  const fetchRoster = async (hubId: string) => {
    setRosterHubId(hubId);
    setRosterLoading(true);
    try {
      const data = await apiClient<{ hub: any; activeShipmentsCount: number }>(`/api/admin/hubs/${hubId}/details`);
      setRosterData(data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load hub roster.', 'error');
      setRosterHubId(null);
    } finally {
      setRosterLoading(false);
    }
  };

  const filtered = hubs.filter((h) =>
    search
      ? h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.city.toLowerCase().includes(search.toLowerCase()) ||
        h.code?.toLowerCase().includes(search.toLowerCase())
      : true
  );
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => {
    setEditHub({ name: '', code: '', city: '', address: '', phone: '', latitude: null, longitude: null, isActive: true });
    setModalOpen(true);
  };

  const openEdit = (hub: Hub) => {
    setEditHub({ ...hub });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editHub?.name || !editHub.city || !editHub.code || !editHub.address) {
      showToast('Name, code, city, and address are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: editHub.name.trim(),
        code: editHub.code.trim().toUpperCase(),
        city: editHub.city.trim(),
        address: editHub.address.trim(),
        phone: editHub.phone?.trim() || null,
        latitude: editHub.latitude ? Number(editHub.latitude) : null,
        longitude: editHub.longitude ? Number(editHub.longitude) : null,
        isActive: editHub.isActive ?? true,
      };

      if (editHub.id) {
        await apiClient(`/api/admin/hubs/${editHub.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        showToast('Hub updated successfully.');
      } else {
        await apiClient('/api/admin/hubs', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        showToast('Hub created successfully.');
      }
      setModalOpen(false);
      setEditHub(null);
      await fetchHubs();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHub = async () => {
    if (!deleteHubId) return;
    try {
      await apiClient(`/api/admin/hubs/${deleteHubId}`, { method: 'DELETE' });
      showToast('Hub deleted successfully.');
      setDeleteHubId(null);
      await fetchHubs();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Cannot delete hub.', 'error');
    }
  };

  const columns: Column<Hub>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (r) => (
        <span className="font-mono font-bold text-xs text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
          {r.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Hub Name',
      sortable: true,
      render: (r) => <span className="font-semibold text-sm text-slate-900">{r.name}</span>,
    },
    { key: 'city', header: 'City' },
    {
      key: 'address',
      header: 'Address & Phone',
      render: (r) => (
        <div className="text-xs text-slate-500 max-w-[220px]">
          <p className="truncate" title={r.address}>{r.address}</p>
          {r.phone && <p className="text-[11px] text-slate-400 font-mono">{r.phone}</p>}
        </div>
      ),
    },
    {
      key: 'staff',
      header: 'Assigned Capacity',
      render: (r) => (
        <span className="text-xs text-slate-600 font-medium">
          {r._count?.staff ?? 0} staff · {r._count?.drivers ?? 0} drivers · {r._count?.vehicles ?? 0} vehicles
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (r) => <Badge variant={r.isActive ? 'success' : 'danger'} size="sm">{r.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); fetchRoster(r.id); }}
            className="p-1.5 rounded text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            title="View Operational Roster"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(r); }}
            className="p-1.5 rounded text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            title="Edit Hub Details"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteHubId(r.id); }}
            className="p-1.5 rounded text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete Hub"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Operational Hub
        </Button>
      </div>
      <DataTable<Hub>
        columns={columns} data={paged} total={filtered.length}
        page={page} pageSize={PAGE_SIZE} onPageChange={setPage}
        isLoading={loading} searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search hubs by name, city, or code..."
        emptyTitle="No hubs configured" emptyDescription="Add your first operational hub to expand your delivery network."
      />

      {/* Edit Hub Modal */}
      {modalOpen && editHub && (
        <Modal isOpen onClose={() => { setModalOpen(false); setEditHub(null); }} title={editHub.id ? 'Edit Operational Hub' : 'Create Operational Hub'} size="sm">
          <div className="space-y-4">
            <Input label="Hub Name *" value={editHub.name || ''} onChange={(e) => setEditHub({ ...editHub, name: e.target.value })} placeholder="e.g. Peshawar Northern Hub" required />
            <Input label="Hub Code * (e.g. PEW-01)" value={editHub.code || ''} onChange={(e) => setEditHub({ ...editHub, code: e.target.value.toUpperCase() })} placeholder="PEW-01" required maxLength={10} />
            <Input label="City *" value={editHub.city || ''} onChange={(e) => setEditHub({ ...editHub, city: e.target.value })} placeholder="Peshawar" required />
            <Input label="Address *" value={editHub.address || ''} onChange={(e) => setEditHub({ ...editHub, address: e.target.value })} placeholder="Plot 45, Industrial Area, Peshawar" required />
            <Input label="Contact Phone" value={editHub.phone || ''} onChange={(e) => setEditHub({ ...editHub, phone: e.target.value })} placeholder="+92-91-5800001" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Latitude (Optional)" type="number" step="0.0001" value={editHub.latitude != null ? String(editHub.latitude) : ''} onChange={(e) => setEditHub({ ...editHub, latitude: e.target.value ? Number(e.target.value) : null })} placeholder="34.0151" />
              <Input label="Longitude (Optional)" type="number" step="0.0001" value={editHub.longitude != null ? String(editHub.longitude) : ''} onChange={(e) => setEditHub({ ...editHub, longitude: e.target.value ? Number(e.target.value) : null })} placeholder="71.5249" />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer pt-1">
              <input type="checkbox" checked={editHub.isActive ?? true} onChange={(e) => setEditHub({ ...editHub, isActive: e.target.checked })} className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500" />
              Active in operational network
            </label>
            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <Button variant="ghost" onClick={() => { setModalOpen(false); setEditHub(null); }}>Cancel</Button>
              <Button variant="primary" onClick={handleSave} disabled={saving || !editHub.name || !editHub.code || !editHub.city || !editHub.address}>
                {saving ? 'Saving...' : editHub.id ? 'Save Changes' : 'Create Hub'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Hub Operational Roster Modal */}
      {rosterHubId && (
        <Modal isOpen onClose={() => { setRosterHubId(null); setRosterData(null); }} title="Hub Operational Roster & Capacity" size="lg">
          {rosterLoading || !rosterData ? (
            <div className="py-12 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
              Loading operational roster...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Hub Overview Banner */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{rosterData.hub.name}</h3>
                    <span className="font-mono text-xs px-2 py-0.5 bg-brand-100 text-brand-700 font-bold rounded">
                      {rosterData.hub.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{rosterData.hub.address}, {rosterData.hub.city}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-center">
                    <p className="text-xs text-blue-600 font-semibold uppercase">Active Shipments</p>
                    <p className="text-xl font-bold text-blue-900">{rosterData.activeShipmentsCount}</p>
                  </div>
                </div>
              </div>

              {/* Staff Roster */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-brand-600" /> Assigned Hub Staff ({rosterData.hub.staff?.length || 0})
                </h4>
                {rosterData.hub.staff?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg">No staff currently assigned to this hub.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Name</th>
                          <th className="p-2.5">Email</th>
                          <th className="p-2.5">Phone</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rosterData.hub.staff.map((s: any) => (
                          <tr key={s.id}>
                            <td className="p-2.5 font-medium text-slate-800">{s.user?.fullName}</td>
                            <td className="p-2.5 text-slate-500">{s.user?.email}</td>
                            <td className="p-2.5 font-mono text-slate-500">{s.user?.phone || '—'}</td>
                            <td className="p-2.5"><Badge size="sm" variant={s.user?.isActive ? 'success' : 'danger'}>{s.user?.isActive ? 'Active' : 'Inactive'}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Drivers Roster */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-600" /> Assigned Drivers ({rosterData.hub.drivers?.length || 0})
                </h4>
                {rosterData.hub.drivers?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg">No drivers currently stationed at this hub.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Driver</th>
                          <th className="p-2.5">Phone</th>
                          <th className="p-2.5">Assigned Vehicle</th>
                          <th className="p-2.5">Active Deliveries</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rosterData.hub.drivers.map((d: any) => (
                          <tr key={d.id}>
                            <td className="p-2.5 font-medium text-slate-800">{d.user?.fullName}</td>
                            <td className="p-2.5 font-mono text-slate-500">{d.user?.phone || '—'}</td>
                            <td className="p-2.5">
                              {d.vehicle ? (
                                <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  {d.vehicle.registrationNo} ({d.vehicle.type})
                                </span>
                              ) : (
                                <span className="text-xs text-amber-600 font-medium">No vehicle</span>
                              )}
                            </td>
                            <td className="p-2.5 font-semibold text-slate-800">{d.assignments?.length ?? 0}</td>
                            <td className="p-2.5"><Badge size="sm" variant={d.user?.isActive ? 'success' : 'danger'}>{d.user?.isActive ? 'Active' : 'Inactive'}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Stationed Vehicles */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                  <Warehouse className="w-4 h-4 text-purple-600" /> Stationed Fleet Vehicles ({rosterData.hub.vehicles?.length || 0})
                </h4>
                {rosterData.hub.vehicles?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg">No fleet vehicles currently stationed at this hub.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Reg. No</th>
                          <th className="p-2.5">Type & Model</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Assigned Driver</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rosterData.hub.vehicles.map((v: any) => (
                          <tr key={v.id}>
                            <td className="p-2.5 font-mono font-semibold text-slate-800">{v.registrationNo}</td>
                            <td className="p-2.5 text-slate-600">{v.type} {v.makeModel ? `· ${v.makeModel}` : ''}</td>
                            <td className="p-2.5"><Badge size="sm" variant={v.status === 'AVAILABLE' ? 'success' : 'default'}>{v.status}</Badge></td>
                            <td className="p-2.5 text-slate-600">{v.driver?.user?.fullName || <span className="text-slate-400">Unassigned</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <Button variant="secondary" onClick={() => { setRosterHubId(null); setRosterData(null); }}>Close</Button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Confirm Delete Hub Dialog */}
      {deleteHubId && (
        <ConfirmDialog
          isOpen
          title="Delete Operational Hub"
          message="Are you sure you want to delete this hub? This will only succeed if no historical shipments or personnel are linked to it."
          confirmLabel="Delete Hub"
          variant="danger"
          onConfirm={handleDeleteHub}
          onClose={() => setDeleteHubId(null)}
        />
      )}
    </div>
  );
};

// ─── Vehicles Tab ─────────────────────────────────────────────────────────────

const VehiclesTab: React.FC<{ showToast: (m: string, v?: 'success' | 'error') => void }> = ({ showToast }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Add / Edit vehicle modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Partial<Vehicle> | null>(null);
  const [saving, setSaving] = useState(false);

  // Assign Driver modal
  const [assignModalVehicle, setAssignModalVehicle] = useState<Vehicle | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [assignSaving, setAssignSaving] = useState(false);

  // Station at Hub modal
  const [stationModalVehicle, setStationModalVehicle] = useState<Vehicle | null>(null);
  const [selectedStationHubId, setSelectedStationHubId] = useState<string>('');
  const [stationSaving, setStationSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, hRes, dRes] = await Promise.all([
        apiClient<{ vehicles: Vehicle[] }>('/api/admin/vehicles'),
        apiClient<{ hubs: Hub[] }>('/api/admin/hubs'),
        apiClient<{ users: UserRow[] }>('/api/admin/users?role=DRIVER'),
      ]);
      setVehicles(vRes.vehicles);
      setHubs(hRes.hubs);
      setDrivers(dRes.users.filter((u) => u.isActive && u.driverProfile));
    } catch {
      showToast('Failed to load vehicles or fleet data.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = vehicles.filter((v) =>
    search
      ? v.registrationNo.toLowerCase().includes(search.toLowerCase()) ||
        v.type.toLowerCase().includes(search.toLowerCase()) ||
        (v.hub?.name && v.hub.name.toLowerCase().includes(search.toLowerCase())) ||
        (v.driver?.user.fullName && v.driver.user.fullName.toLowerCase().includes(search.toLowerCase()))
      : true
  );
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAddModal = () => {
    setEditVehicle({
      registrationNo: '',
      type: 'MOTORCYCLE',
      makeModel: '',
      status: 'AVAILABLE',
      notes: '',
      hubId: '',
    });
    setModalOpen(true);
  };

  const handleSaveVehicle = async () => {
    if (!editVehicle?.registrationNo || !editVehicle.type) {
      showToast('Registration number and vehicle type are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const body = {
        registrationNo: editVehicle.registrationNo.trim().toUpperCase(),
        type: editVehicle.type.trim(),
        makeModel: editVehicle.makeModel?.trim() || null,
        status: editVehicle.status || 'AVAILABLE',
        currentMileage: editVehicle.currentMileage ? Number(editVehicle.currentMileage) : null,
        notes: editVehicle.notes?.trim() || null,
        hubId: editVehicle.hubId || null,
      };

      if (editVehicle.id) {
        await apiClient(`/api/admin/vehicles/${editVehicle.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        showToast('Vehicle details updated.');
      } else {
        await apiClient('/api/admin/vehicles', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        showToast('Vehicle created successfully.');
      }
      setModalOpen(false);
      setEditVehicle(null);
      await fetchData();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to save vehicle.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openAssignModal = (v: Vehicle) => {
    setAssignModalVehicle(v);
    setSelectedDriverId(v.driver?.id || '');
  };

  const handleAssignDriver = async () => {
    if (!assignModalVehicle || !selectedDriverId) {
      showToast('Please select a driver to assign.', 'error');
      return;
    }
    setAssignSaving(true);
    try {
      await apiClient(`/api/admin/vehicles/${assignModalVehicle.id}/assign-driver`, {
        method: 'POST',
        body: JSON.stringify({ driverId: selectedDriverId }),
      });
      showToast(`Driver assigned to vehicle ${assignModalVehicle.registrationNo}.`);
      setAssignModalVehicle(null);
      await fetchData();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Assignment failed.', 'error');
    } finally {
      setAssignSaving(false);
    }
  };

  const handleUnassignDriver = async (v: Vehicle) => {
    try {
      await apiClient(`/api/admin/vehicles/${v.id}/unassign`, {
        method: 'POST',
      });
      showToast(`Driver unassigned from vehicle ${v.registrationNo}.`);
      await fetchData();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to unassign driver.', 'error');
    }
  };

  const openStationModal = (v: Vehicle) => {
    setStationModalVehicle(v);
    setSelectedStationHubId(v.hubId || '');
  };

  const handleStationHub = async () => {
    if (!stationModalVehicle) return;
    setStationSaving(true);
    try {
      await apiClient(`/api/admin/vehicles/${stationModalVehicle.id}/hub`, {
        method: 'PATCH',
        body: JSON.stringify({ hubId: selectedStationHubId || null }),
      });
      showToast(`Stationed hub updated for vehicle ${stationModalVehicle.registrationNo}.`);
      setStationModalVehicle(null);
      await fetchData();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to update stationed hub.', 'error');
    } finally {
      setStationSaving(false);
    }
  };

  const columns: Column<Vehicle>[] = [
    {
      key: 'registrationNo',
      header: 'Reg. No.',
      render: (r) => (
        <div>
          <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {r.registrationNo}
          </span>
          {r.makeModel && <p className="text-[11px] text-slate-400 mt-0.5">{r.makeModel}</p>}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (r) => <Badge variant="default" size="sm">{r.type}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        let variant: 'success' | 'info' | 'danger' | 'default' = 'default';
        if (r.status === 'AVAILABLE') variant = 'success';
        else if (r.status === 'ASSIGNED' || r.status === 'IN_USE') variant = 'info';
        else if (r.status === 'INACTIVE' || r.status === 'MAINTENANCE') variant = 'danger';
        return <Badge variant={variant} size="sm">{r.status}</Badge>;
      },
    },
    {
      key: 'hub',
      header: 'Stationed Hub',
      render: (r) => {
        if (r.hub) {
          return (
            <div>
              <span className="text-xs font-semibold text-slate-800">{r.hub.name}</span>
              <span className="text-[11px] text-slate-400 block">{r.hub.city}</span>
            </div>
          );
        }
        return <span className="text-xs text-amber-600 italic">Not Stationed</span>;
      },
    },
    {
      key: 'driver',
      header: 'Assigned Driver',
      render: (r) => {
        if (r.driver?.user) {
          return (
            <div>
              <span className="text-xs font-semibold text-slate-800">{r.driver.user.fullName}</span>
              {r.driver.user.phone && <span className="text-[11px] text-slate-400 block font-mono">{r.driver.user.phone}</span>}
            </div>
          );
        }
        return <span className="text-xs text-slate-400 italic">Unassigned</span>;
      },
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); openAssignModal(r); }}
            className="p-1.5 rounded text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            title="Assign / Change Driver"
          >
            <Users className="w-4 h-4" />
          </button>
          {r.driverId && (
            <button
              onClick={(e) => { e.stopPropagation(); handleUnassignDriver(r); }}
              className="p-1.5 rounded text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Unassign Driver"
            >
              <UserX className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); openStationModal(r); }}
            className="p-1.5 rounded text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
            title="Station at Hub"
          >
            <MapPin className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setEditVehicle({ ...r }); setModalOpen(true); }}
            className="p-1.5 rounded text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            title="Edit Details"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const activeHubs = hubs.filter((h) => h.isActive);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" size="sm" onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Fleet Vehicle
        </Button>
      </div>

      <DataTable<Vehicle>
        columns={columns}
        data={paged}
        total={filtered.length}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        isLoading={loading}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search vehicles by reg no, type, hub, or driver..."
        emptyTitle="No vehicles found"
        emptyDescription="Add fleet vehicles to assign to operational hubs and drivers."
      />

      {/* Add / Edit Vehicle Modal */}
      {modalOpen && editVehicle && (
        <Modal isOpen onClose={() => { setModalOpen(false); setEditVehicle(null); }} title={editVehicle.id ? 'Edit Vehicle' : 'Add Fleet Vehicle'} size="sm">
          <div className="space-y-4">
            <Input
              label="Registration No. *"
              value={editVehicle.registrationNo || ''}
              onChange={(e) => setEditVehicle({ ...editVehicle, registrationNo: e.target.value.toUpperCase() })}
              placeholder="e.g. LHR-5678"
              required
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Vehicle Type *</label>
              <select
                value={editVehicle.type || ''}
                onChange={(e) => setEditVehicle({ ...editVehicle, type: e.target.value })}
                className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                {['MOTORCYCLE', 'VAN', 'PICKUP', 'TRUCK', 'CAR'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <Input
              label="Make / Model"
              value={editVehicle.makeModel || ''}
              onChange={(e) => setEditVehicle({ ...editVehicle, makeModel: e.target.value })}
              placeholder="e.g. Honda CD 70 or Suzuki Bolan"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select
                value={editVehicle.status || 'AVAILABLE'}
                onChange={(e) => setEditVehicle({ ...editVehicle, status: e.target.value })}
                className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="IN_USE">IN_USE</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Stationed Hub</label>
              <select
                value={editVehicle.hubId || ''}
                onChange={(e) => setEditVehicle({ ...editVehicle, hubId: e.target.value })}
                className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="">-- Unstationed / Any Hub --</option>
                {activeHubs.map((h) => (
                  <option key={h.id} value={h.id}>{h.name} ({h.city})</option>
                ))}
              </select>
            </div>
            <Input
              label="Notes"
              value={editVehicle.notes || ''}
              onChange={(e) => setEditVehicle({ ...editVehicle, notes: e.target.value })}
              placeholder="e.g. Assigned to express city parcel runs"
            />
            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <Button variant="ghost" onClick={() => { setModalOpen(false); setEditVehicle(null); }}>Cancel</Button>
              <Button variant="primary" onClick={handleSaveVehicle} disabled={saving || !editVehicle.registrationNo || !editVehicle.type}>
                {saving ? 'Saving...' : editVehicle.id ? 'Save Changes' : 'Create Vehicle'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign Driver Modal */}
      {assignModalVehicle && (
        <Modal isOpen onClose={() => setAssignModalVehicle(null)} title="Assign Driver to Vehicle" size="sm">
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p><span className="font-semibold text-slate-800">Vehicle:</span> {assignModalVehicle.registrationNo} ({assignModalVehicle.type})</p>
              <p>
                <span className="font-semibold text-slate-800">Stationed Hub:</span>{' '}
                {assignModalVehicle.hub?.name || 'Unstationed'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Active Driver *</label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="">-- Choose Driver --</option>
                {drivers.map((d) => {
                  const dp = d.driverProfile;
                  const isSameHub = !assignModalVehicle.hubId || dp?.homeHubId === assignModalVehicle.hubId;
                  const hasOtherVehicle = dp?.vehicle && dp.vehicle.id !== assignModalVehicle.id;
                  return (
                    <option key={dp.id} value={dp.id} disabled={hasOtherVehicle}>
                      {d.fullName} ({dp.homeHub?.name || 'No Hub'}) {hasOtherVehicle ? `[Already on ${dp.vehicle.registrationNo}]` : ''} {!isSameHub ? '[Different Hub]' : ''}
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Drivers must have a matching home hub if the vehicle is stationed at a specific hub.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setAssignModalVehicle(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleAssignDriver} disabled={assignSaving || !selectedDriverId}>
                {assignSaving ? 'Assigning...' : 'Confirm Assignment'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Station at Hub Modal */}
      {stationModalVehicle && (
        <Modal isOpen onClose={() => setStationModalVehicle(null)} title="Station Vehicle at Hub" size="sm">
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p><span className="font-semibold text-slate-800">Vehicle:</span> {stationModalVehicle.registrationNo}</p>
              <p><span className="font-semibold text-slate-800">Current Station:</span> {stationModalVehicle.hub?.name || 'Unstationed'}</p>
              {stationModalVehicle.driver && (
                <p className="text-amber-700 font-medium">
                  Assigned to driver {stationModalVehicle.driver.user.fullName}. If moved to another hub, driver will be automatically unassigned.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Operational Hub</label>
              <select
                value={selectedStationHubId}
                onChange={(e) => setSelectedStationHubId(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="">-- No Hub (Unstationed) --</option>
                {activeHubs.map((h) => (
                  <option key={h.id} value={h.id}>{h.name} ({h.city} - {h.code})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setStationModalVehicle(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleStationHub} disabled={stationSaving}>
                {stationSaving ? 'Saving...' : 'Update Stationed Hub'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── Pricing Rules Tab ────────────────────────────────────────────────────────

interface RuleFormState {
  id?: string;
  originZone: string;
  destinationZone: string;
  serviceType: ServiceType;
  baseFee: string;
  perKgFee: string;
  codFeeFlat: string;
  codFeePercent: string;
  effectiveFrom: string;
  effectiveTo: string;
  isActive: boolean;
}

const DEFAULT_RULE_FORM: RuleFormState = {
  originZone: 'ANY',
  destinationZone: 'ANY',
  serviceType: ServiceType.STANDARD,
  baseFee: '220',
  perKgFee: '60',
  codFeeFlat: '40',
  codFeePercent: '1.5',
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: '',
  isActive: true,
};

const PricingTab: React.FC<{ showToast: (m: string, v?: 'success' | 'error') => void }> = ({ showToast }) => {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [hubCities, setHubCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState<RuleFormState>(DEFAULT_RULE_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const [pricingRes, hubsRes] = await Promise.all([
        apiClient<{ rules: PricingRule[] }>('/api/admin/pricing-rules'),
        apiClient<{ hubs: Hub[] }>('/api/admin/hubs').catch(() => ({ hubs: [] })),
      ]);
      setRules(pricingRes.rules);
      if (hubsRes.hubs && hubsRes.hubs.length > 0) {
        const cities = Array.from(new Set(hubsRes.hubs.map((h) => h.city.trim()))).sort();
        setHubCities(['ANY', ...cities]);
      } else {
        setHubCities(['ANY', 'Karachi', 'Lahore', 'Islamabad', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Rawalpindi']);
      }
    } catch {
      showToast('Failed to load pricing rules.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const filtered = rules.filter((r) =>
    search
      ? r.originZone.toLowerCase().includes(search.toLowerCase()) ||
        r.destinationZone.toLowerCase().includes(search.toLowerCase()) ||
        r.serviceType.toLowerCase().includes(search.toLowerCase())
      : true
  );
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreateModal = () => {
    setRuleForm({
      ...DEFAULT_RULE_FORM,
      effectiveFrom: new Date().toISOString().slice(0, 10),
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (r: PricingRule) => {
    setRuleForm({
      id: r.id,
      originZone: r.originZone,
      destinationZone: r.destinationZone,
      serviceType: r.serviceType as ServiceType,
      baseFee: String(r.baseFee ?? 0),
      perKgFee: String(r.perKgFee ?? 0),
      codFeeFlat: String(r.codFeeFlat ?? 0),
      codFeePercent: String(fractionToPercent(r.codFeePercent)),
      effectiveFrom: r.effectiveFrom
        ? new Date(r.effectiveFrom).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      effectiveTo: r.effectiveTo ? new Date(r.effectiveTo).toISOString().slice(0, 10) : '',
      isActive: r.isActive ?? true,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!ruleForm.originZone.trim()) errors.originZone = 'Origin zone or city is required.';
    if (!ruleForm.destinationZone.trim()) errors.destinationZone = 'Destination zone or city is required.';

    const baseFeeNum = Number(ruleForm.baseFee);
    if (isNaN(baseFeeNum) || baseFeeNum < 0) errors.baseFee = 'Base fee must be a non-negative whole number.';

    const perKgNum = Number(ruleForm.perKgFee);
    if (isNaN(perKgNum) || perKgNum < 0) errors.perKgFee = 'Per-kg fee must be non-negative.';

    const codFlatNum = Number(ruleForm.codFeeFlat);
    if (isNaN(codFlatNum) || codFlatNum < 0) errors.codFeeFlat = 'COD flat fee must be non-negative.';

    const codPercentNum = Number(ruleForm.codFeePercent);
    if (isNaN(codPercentNum) || codPercentNum < 0 || codPercentNum > 100) {
      errors.codFeePercent = 'COD percentage must be between 0% and 100%.';
    }

    if (!ruleForm.effectiveFrom) errors.effectiveFrom = 'Effective from date is required.';
    if (ruleForm.effectiveTo && ruleForm.effectiveFrom && ruleForm.effectiveTo < ruleForm.effectiveFrom) {
      errors.effectiveTo = 'Effective to date cannot precede effective from date.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = {
        originZone: ruleForm.originZone.trim(),
        destinationZone: ruleForm.destinationZone.trim(),
        serviceType: ruleForm.serviceType,
        baseFee: Math.round(Number(ruleForm.baseFee)),
        perKgFee: Math.round(Number(ruleForm.perKgFee)),
        codFeeFlat: Math.round(Number(ruleForm.codFeeFlat)),
        codFeePercent: percentToFraction(Number(ruleForm.codFeePercent)),
        effectiveFrom: new Date(ruleForm.effectiveFrom).toISOString(),
        effectiveTo: ruleForm.effectiveTo ? new Date(ruleForm.effectiveTo).toISOString() : null,
        isActive: ruleForm.isActive,
      };

      if (ruleForm.id) {
        await apiClient(`/api/admin/pricing-rules/${ruleForm.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        showToast('Pricing rule updated successfully.');
      } else {
        await apiClient('/api/admin/pricing-rules', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('Pricing rule created successfully.');
      }
      setModalOpen(false);
      await fetchRules();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiClient(`/api/admin/pricing-rules/${deleteId}`, { method: 'DELETE' });
      showToast('Pricing rule deleted.');
      setDeleteId(null);
      await fetchRules();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Delete failed.', 'error');
    }
  };

  const columns: Column<PricingRule>[] = [
    {
      key: 'serviceType',
      header: 'Service',
      render: (r) => (
        <Badge variant={r.serviceType === 'EXPRESS' ? 'warning' : 'default'} size="sm">
          {r.serviceType}
        </Badge>
      ),
    },
    {
      key: 'originZone',
      header: 'Route',
      render: (r) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
          <span className={r.originZone === 'ANY' ? 'text-amber-600 font-mono' : 'text-slate-900'}>
            {r.originZone}
          </span>
          <span className="text-slate-400">→</span>
          <span className={r.destinationZone === 'ANY' ? 'text-amber-600 font-mono' : 'text-slate-900'}>
            {r.destinationZone}
          </span>
        </div>
      ),
    },
    {
      key: 'baseFee',
      header: 'Base (1st kg)',
      render: (r) => <span className="font-mono text-sm font-semibold text-slate-900">{formatPKR(r.baseFee)}</span>,
    },
    {
      key: 'perKgFee',
      header: 'Extra / kg',
      render: (r) => <span className="font-mono text-sm text-slate-700">{formatPKR(r.perKgFee)}</span>,
    },
    {
      key: 'codFeeFlat',
      header: 'COD Handling',
      render: (r) => (
        <span className="font-mono text-xs text-slate-700">
          {formatPKR(r.codFeeFlat)} + {formatPercent(r.codFeePercent)}
        </span>
      ),
    },
    {
      key: 'effectiveFrom',
      header: 'Effective Window',
      render: (r) => (
        <div className="text-[11px] text-slate-600 space-y-0.5">
          <div>From: {formatDatePST(r.effectiveFrom)}</div>
          <div className="text-slate-400">To: {r.effectiveTo ? formatDatePST(r.effectiveTo) : 'Indefinite'}</div>
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (r) => (
        <Badge variant={r.isActive ? 'success' : 'danger'} size="sm">
          {r.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(r);
            }}
            className="p-1.5 rounded text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            title="Edit Pricing Rule"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(r.id);
            }}
            className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete Pricing Rule"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-slate-900">Tariff & Rate Matrix</h2>
          <p className="text-xs text-slate-500">
            Authoritative base freight, extra-kg surcharge, and COD fee calculation rules.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Rule
        </Button>
      </div>

      <DataTable<PricingRule>
        columns={columns}
        data={paged}
        total={filtered.length}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        isLoading={loading}
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search origin, destination, or service..."
        emptyTitle="No pricing rules"
        emptyDescription="Create rules to configure shipment freight calculations."
      />

      {modalOpen && (
        <Modal
          isOpen
          onClose={() => setModalOpen(false)}
          title={ruleForm.id ? 'Edit Pricing Rule' : 'Create Pricing Rule'}
          size="md"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Service Type *
                </label>
                <select
                  value={ruleForm.serviceType}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, serviceType: e.target.value as ServiceType })
                  }
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value={ServiceType.STANDARD}>STANDARD</option>
                  <option value={ServiceType.EXPRESS}>EXPRESS</option>
                </select>
              </div>
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ruleForm.isActive}
                    onChange={(e) => setRuleForm({ ...ruleForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                  />
                  Active Rule
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Origin Zone / City *
                </label>
                <select
                  value={ruleForm.originZone}
                  onChange={(e) => setRuleForm({ ...ruleForm, originZone: e.target.value })}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  {hubCities.map((c) => (
                    <option key={c} value={c}>
                      {c === 'ANY' ? 'ANY (Wildcard)' : c}
                    </option>
                  ))}
                </select>
                {formErrors.originZone && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.originZone}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Destination Zone / City *
                </label>
                <select
                  value={ruleForm.destinationZone}
                  onChange={(e) => setRuleForm({ ...ruleForm, destinationZone: e.target.value })}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  {hubCities.map((c) => (
                    <option key={c} value={c}>
                      {c === 'ANY' ? 'ANY (Wildcard)' : c}
                    </option>
                  ))}
                </select>
                {formErrors.destinationZone && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.destinationZone}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label="Base Fee (PKR) *"
                  type="number"
                  min="0"
                  value={ruleForm.baseFee}
                  onChange={(e) => setRuleForm({ ...ruleForm, baseFee: e.target.value })}
                  placeholder="220"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">Covers first billable kg</p>
                {formErrors.baseFee && (
                  <p className="text-xs text-red-500 mt-0.5">{formErrors.baseFee}</p>
                )}
              </div>
              <div>
                <Input
                  label="Per-kg Fee (PKR) *"
                  type="number"
                  min="0"
                  value={ruleForm.perKgFee}
                  onChange={(e) => setRuleForm({ ...ruleForm, perKgFee: e.target.value })}
                  placeholder="60"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">Per additional whole kg</p>
                {formErrors.perKgFee && (
                  <p className="text-xs text-red-500 mt-0.5">{formErrors.perKgFee}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label="COD Flat Handling Fee (PKR) *"
                  type="number"
                  min="0"
                  value={ruleForm.codFeeFlat}
                  onChange={(e) => setRuleForm({ ...ruleForm, codFeeFlat: e.target.value })}
                  placeholder="40"
                />
                {formErrors.codFeeFlat && (
                  <p className="text-xs text-red-500 mt-0.5">{formErrors.codFeeFlat}</p>
                )}
              </div>
              <div>
                <Input
                  label="COD Percentage Fee (%) *"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={ruleForm.codFeePercent}
                  onChange={(e) => setRuleForm({ ...ruleForm, codFeePercent: e.target.value })}
                  placeholder="1.5"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">e.g. 1.5 for 1.5%, 2 for 2%</p>
                {formErrors.codFeePercent && (
                  <p className="text-xs text-red-500 mt-0.5">{formErrors.codFeePercent}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label="Effective From *"
                  type="date"
                  value={ruleForm.effectiveFrom}
                  onChange={(e) => setRuleForm({ ...ruleForm, effectiveFrom: e.target.value })}
                />
                {formErrors.effectiveFrom && (
                  <p className="text-xs text-red-500 mt-0.5">{formErrors.effectiveFrom}</p>
                )}
              </div>
              <div>
                <Input
                  label="Effective To (Optional)"
                  type="date"
                  value={ruleForm.effectiveTo}
                  onChange={(e) => setRuleForm({ ...ruleForm, effectiveTo: e.target.value })}
                />
                <p className="text-[11px] text-slate-400 mt-0.5">Leave blank for open-ended</p>
                {formErrors.effectiveTo && (
                  <p className="text-xs text-red-500 mt-0.5">{formErrors.effectiveTo}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : ruleForm.id ? 'Save Changes' : 'Create Rule'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Pricing Rule?"
        message="This action cannot be undone. Rules tied to existing shipments are permanently locked and cannot be deleted — deactivate the rule instead."
        confirmLabel="Delete Rule"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

// ─── Audit Log Tab ────────────────────────────────────────────────────────────

const AuditTab: React.FC<{ showToast: (m: string, v?: 'success' | 'error') => void }> = ({ showToast }) => {
 const [logs, setLogs] = useState<AuditLog[]>([]);
 const [total, setTotal] = useState(0);
 const [page, setPage] = useState(1);
 const [loading, setLoading] = useState(true);

 const fetchLogs = useCallback(async () => {
 setLoading(true);
 try {
 const r = await apiClient<{ logs: AuditLog[]; pagination: { total: number } }>(`/api/admin/audit-logs?page=${page}`);
 setLogs(r.logs);
 setTotal(r.pagination.total);
 } catch {
 showToast('Failed to load audit logs.', 'error');
 } finally {
 setLoading(false);
 }
 }, [page]);

 useEffect(() => { fetchLogs(); }, [fetchLogs]);

 const columns: Column<AuditLog>[] = [
 {
 key: 'createdAt',
 header: 'Timestamp',
 render: (r) => <span className="text-xs font-mono text-slate-500 whitespace-nowrap">{formatDateTimePST(new Date(r.createdAt))}</span>,
 },
 {
 key: 'actorRole',
 header: 'Actor',
 render: (r) => (
 <div>
 <Badge variant={r.actorRole === 'ADMIN' ? 'danger' : 'default'} size="sm">{r.actorRole}</Badge>
 </div>
 ),
 },
 {
 key: 'action',
 header: 'Action',
 render: (r) => <span className="font-mono text-xs font-semibold text-brand-700 ">{r.action}</span>,
 },
 {
 key: 'entityType',
 header: 'Entity',
 render: (r) => <span className="text-xs text-slate-600 ">{r.entityType}</span>,
 },
 {
 key: 'entityId',
 header: 'Entity ID',
 render: (r) => <span className="font-mono text-xs text-slate-400 truncate block max-w-[140px]" title={r.entityId}>{r.entityId}</span>,
 },
 ];

 return (
 <DataTable<AuditLog>
 columns={columns} data={logs} total={total}
 page={page} pageSize={30} onPageChange={setPage}
 isLoading={loading}
 emptyTitle="No audit logs" emptyDescription="Administrative actions will appear here."
 />
 );
};

// ─── Settings Tab ─────────────────────────────────────────────────────────────

const SettingsTab: React.FC<{ showToast: (m: string, v?: 'success' | 'error') => void }> = ({ showToast }) => {
 const [settings, setSettings] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);

 useEffect(() => {
 apiClient<{ settings: any }>('/api/admin/settings')
 .then((r) => setSettings(r.settings || {}))
 .catch(() => setSettings({}))
 .finally(() => setLoading(false));
 }, []);

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 setSaving(true);
 try {
 await apiClient('/api/admin/settings', {
 method: 'PATCH',
 body: JSON.stringify(settings),
 });
 showToast('Settings saved successfully.');
 } catch {
 showToast('Failed to save settings.', 'error');
 } finally {
 setSaving(false);
 }
 };

 if (loading) {
 return (
 <div className="space-y-4 max-w-lg">
 {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
 </div>
 );
 }

 return (
 <form onSubmit={handleSave} className="max-w-lg space-y-6">
 <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
 <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
 Company Public Information
 </h3>
 <div className="space-y-3">
 <Input
 label="Company Name *"
 value={settings?.companyName || ''}
 onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
 placeholder="Euroshub Logistics"
 required
 />
 <Input
 label="Customer Support Phone"
 value={settings?.companyPhone || ''}
 onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
 placeholder="+92 21 32560001"
 />
 <Input
 label="Customer Support Email"
 type="email"
 value={settings?.companyEmail || ''}
 onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
 placeholder="support@euroshub.com"
 />
 <Input
 label="Head Office / Operations Address"
 value={settings?.companyAddress || ''}
 onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
 placeholder="Karachi Logistics Park, Port Qasim, Karachi"
 />
 </div>
 </div>

 <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
 <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
 Operational System Parameters
 </h3>
 <div className="space-y-3">
 <div>
 <Input
 label="Consignment Tracking Prefix (2-6 uppercase letters)"
 value={settings?.trackingPrefix || 'ESH'}
 onChange={(e) => setSettings({ ...settings, trackingPrefix: e.target.value.toUpperCase() })}
 placeholder="ESH"
 maxLength={6}
 required
 />
 <p className="text-[11px] text-slate-500 mt-1">
 Used when generating new tracking numbers (e.g. {settings?.trackingPrefix || 'ESH'}-2026-XXXXXX).
 </p>
 </div>
 <div>
 <Input
 label="Max Driver Delivery Attempts (1 to 10)"
 type="number"
 value={String(settings?.maxDeliveryAttempts || 3)}
 onChange={(e) => setSettings({ ...settings, maxDeliveryAttempts: Number(e.target.value) })}
 min={1}
 max={10}
 required
 />
 <p className="text-[11px] text-slate-500 mt-1">
 Parcels exceeding this threshold automatically trigger delivery failure review.
 </p>
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1">
 Base System Currency
 </label>
 <input
 type="text"
 disabled
 value={settings?.currency || 'PKR'}
 className="w-full text-sm px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 font-mono font-bold"
 />
 </div>
 </div>
 </div>

 <Button type="submit" variant="primary" size="lg" className="w-full h-11 font-semibold" disabled={saving}>
 {saving ? 'Saving Settings...' : 'Save Configuration'}
 </Button>
 </form>
 );
};
