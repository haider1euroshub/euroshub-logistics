import fs from 'fs';
import path from 'path';

const filePath = path.resolve('apps/web/src/pages/AdminConsolePage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace UsersTab definition
const usersTabStart = '// ─── Users Tab ────────────────────────────────────────────────────────────────';
const hubsTabStart = '// ─── Hubs Tab ─────────────────────────────────────────────────────────────────';
const vehiclesTabStart = '// ─── Vehicles Tab ─────────────────────────────────────────────────────────────';
const pricingTabStart = '// ─── Pricing Rules Tab ────────────────────────────────────────────────────────';

const newUsersTab = `// ─── Users Tab ────────────────────────────────────────────────────────────────

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
        apiClient<{ users: UserRow[] }>(\`/api/admin/users?\${params}\`),
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
      await apiClient(\`/api/admin/users/\${u.id}\`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      showToast(\`User \${u.fullName} \${!u.isActive ? 'activated' : 'deactivated'}.\`);
      await fetchUsers();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to update user status.', 'error');
    }
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setEditLoading(true);
    try {
      await apiClient(\`/api/admin/users/\${editUser.id}\`, {
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
      await apiClient(\`/api/admin/users/\${roleModalUser.id}/role\`, {
        method: 'PATCH',
        body: JSON.stringify({
          role: selectedRole,
          hubId: selectedHubId || undefined,
          notes: roleNotes.trim() || undefined,
        }),
      });
      showToast(\`Role and hub updated for \${roleModalUser.fullName}.\`);
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
`;

const newHubsTab = `// ─── Hubs Tab ─────────────────────────────────────────────────────────────────

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
      const data = await apiClient<{ hub: any; activeShipmentsCount: number }>(\`/api/admin/hubs/\${hubId}/details\`);
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
        await apiClient(\`/api/admin/hubs/\${editHub.id}\`, {
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
      await apiClient(\`/api/admin/hubs/\${deleteHubId}\`, { method: 'DELETE' });
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
                            <td className="p-2.5 text-slate-600">{v.type} {v.makeModel ? \`· \${v.makeModel}\` : ''}</td>
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
`;

const newVehiclesTab = `// ─── Vehicles Tab ─────────────────────────────────────────────────────────────

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
        await apiClient(\`/api/admin/vehicles/\${editVehicle.id}\`, {
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
      await apiClient(\`/api/admin/vehicles/\${assignModalVehicle.id}/assign-driver\`, {
        method: 'POST',
        body: JSON.stringify({ driverId: selectedDriverId }),
      });
      showToast(\`Driver assigned to vehicle \${assignModalVehicle.registrationNo}.\`);
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
      await apiClient(\`/api/admin/vehicles/\${v.id}/unassign\`, {
        method: 'POST',
      });
      showToast(\`Driver unassigned from vehicle \${v.registrationNo}.\`);
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
      await apiClient(\`/api/admin/vehicles/\${stationModalVehicle.id}/hub\`, {
        method: 'PATCH',
        body: JSON.stringify({ hubId: selectedStationHubId || null }),
      });
      showToast(\`Stationed hub updated for vehicle \${stationModalVehicle.registrationNo}.\`);
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
                      {d.fullName} ({dp.homeHub?.name || 'No Hub'}) {hasOtherVehicle ? \`[Already on \${dp.vehicle.registrationNo}]\` : ''} {!isSameHub ? '[Different Hub]' : ''}
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
`;

const uIdx = content.indexOf(usersTabStart);
const pIdx = content.indexOf(pricingTabStart);

if (uIdx === -1 || pIdx === -1) {
  console.error('Could not locate markers:', { uIdx, pIdx });
  process.exit(1);
}

const updatedContent = content.slice(0, uIdx) + newUsersTab + '\n' + newHubsTab + '\n' + newVehiclesTab + '\n' + content.slice(pIdx);
fs.writeFileSync(filePath, updatedContent, 'utf8');
console.log('Successfully updated AdminConsolePage.tsx with UsersTab, HubsTab, and VehiclesTab!');
