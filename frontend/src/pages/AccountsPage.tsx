import React from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Typography,
  Chip,
  Stack,
  Snackbar,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import Layout from '@components/Layout';
import DataTable from '@components/DataTable';
import AssignOwner from '@components/AssignOwner';
import ConfirmDialog from '@components/ConfirmDialog';
import SearchableSelect from '@components/SearchableSelect';
import useAuth from '@hooks/useAuth';
import { api } from '@services/api';
import { Account } from '../types';
import { formatCurrency } from '@utils/format';

interface Country {
  id: string;
  code: string;
  name: string;
  region?: string;
}

const statusColor: Record<string, any> = {
  Prospect: 'info',
  Customer: 'success',
  Inactive: 'error',
};

const onboardingStatusColor: Record<string, any> = {
  'Not Started': 'default',
  'In Progress': 'warning',
  Completed: 'success',
  'On Hold': 'error',
};

export default function AccountsPage() {
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('accounts', 'delete');

  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [loading, setLoading] = React.useState(false);
  const [toast, setToast] = React.useState<{ msg: string; sev: 'success' | 'error' } | null>(null);
  const [countries, setCountries] = React.useState<Country[]>([]);

  const [openCreate, setOpenCreate] = React.useState(false);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<Account | null>(null);
  const [tabValue, setTabValue] = React.useState(0);
  const [confirmDelete, setConfirmDelete] = React.useState<{ open: boolean; account: Account | null }>({ open: false, account: null });

  const [formData, setFormData] = React.useState({
    name: '',
    industry: '',
    website: '',
    phoneNumber: '',
    alternatePhoneNumber: '',
    type: 'Prospect' as 'Prospect' | 'Customer' | 'Inactive',
    contactPerson: '',
    city: '',
    region: '',
    country: '',
    email: '',
    remark: '',
    assignedTeamIds: [] as string[],
    assigneeIds: [] as string[],
  });

  const [teams, setTeams] = React.useState<any[]>([]);
  const [orgUsers, setOrgUsers] = React.useState<any[]>([]);
  const [acctFilters, setAcctFilters] = React.useState({ search: '', city: '', region: '', country: '' });

  // Load countries, teams and users on component mount
  React.useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await api.getCountries();
        if (response.data.success && Array.isArray(response.data.data)) {
          setCountries(response.data.data);
        }
      } catch (error) {
        console.error('Error loading countries:', error);
      }
    };
    const loadAssignable = async () => {
      try {
        const [t, u] = await Promise.all([api.getTeams(), api.getUsers(1, 500)]);
        setTeams(t.data.data || []);
        setOrgUsers(u.data.data || []);
      } catch (error) {
        console.error('Error loading teams/users:', error);
      }
    };
    loadCountries();
    loadAssignable();
  }, []);

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name || id;
  const userName = (id: string) => {
    const u = orgUsers.find((x) => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : id;
  };

  const [duplicateWarning, setDuplicateWarning] = React.useState('');

  const [onboardingData, setOnboardingData] = React.useState({
    onboardingStatus: 'Not Started' as const,
    onboardingDate: '',
    onboardingCompletedDate: '',
    onboardingNotes: '',
    contractSignedDate: '',
    goLiveDate: '',
    accountManager: '',
    billingContact: '',
    technicalContact: '',
  });

  const fetchAccounts = React.useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      Object.entries(acctFilters).forEach(([k, v]) => { if (v) params[k] = v; });
      const response = await api.getAccounts(page, pageSize, params);
      if (response.data.success) {
        setAccounts(response.data.data || []);
        setTotal(response.data.meta?.total || 0);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, acctFilters]);

  React.useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const checkDuplicate = React.useCallback((name: string) => {
    if (!name.trim()) {
      setDuplicateWarning('');
      return;
    }

    const isDuplicate = accounts.some(
      (acc) =>
        acc.name.toLowerCase() === name.toLowerCase() &&
        (!editingAccount || acc.id !== editingAccount.id)
    );

    if (isDuplicate) {
      setDuplicateWarning(`Account "${name}" already exists`);
    } else {
      setDuplicateWarning('');
    }
  }, [accounts, editingAccount]);

  const handleAddClick = () => {
    setFormData({
      name: '',
      industry: '',
      website: '',
      phoneNumber: '',
      alternatePhoneNumber: '',
      type: 'Prospect',
      contactPerson: '',
      city: '',
      region: '',
      country: '',
      email: '',
      remark: '',
      assignedTeamIds: [],
      assigneeIds: [],
    });
    setDuplicateWarning('');
    setOpenCreate(true);
  };

  const handleCreateAccount = async () => {
    try {
      await api.createAccount(formData);
      setOpenCreate(false);
      setToast({ msg: 'Account created', sev: 'success' });
      fetchAccounts();
    } catch (error: any) {
      setToast({ msg: error.response?.data?.error || 'Failed to create account', sev: 'error' });
    }
  };

  const handleEditClick = async (account: Account) => {
    setEditingAccount(account);
    // Fetch the full account to get its team assignments (not in the list rows).
    let full: any = account;
    try {
      const res = await api.getAccount(account.id);
      full = res.data.data || account;
    } catch { /* fall back to the list row */ }
    setFormData({
      name: full.name,
      industry: full.industry || '',
      website: full.website || '',
      phoneNumber: full.phoneNumber || '',
      alternatePhoneNumber: full.alternatePhoneNumber || '',
      type: full.type,
      contactPerson: full.contactPerson || '',
      city: full.city || '',
      region: full.region || '',
      country: full.country || '',
      email: full.email || '',
      remark: full.remark || '',
      assignedTeamIds: full.assignedTeamIds || [],
      assigneeIds: full.assigneeIds || [],
    });
    setOnboardingData({
      onboardingStatus: (account.onboardingStatus as any) || 'Not Started',
      onboardingDate: account.onboardingDate ? new Date(account.onboardingDate).toISOString().split('T')[0] : '',
      onboardingCompletedDate: account.onboardingCompletedDate ? new Date(account.onboardingCompletedDate).toISOString().split('T')[0] : '',
      onboardingNotes: account.onboardingNotes || '',
      contractSignedDate: account.contractSignedDate ? new Date(account.contractSignedDate).toISOString().split('T')[0] : '',
      goLiveDate: account.goLiveDate ? new Date(account.goLiveDate).toISOString().split('T')[0] : '',
      accountManager: account.accountManager || '',
      billingContact: account.billingContact || '',
      technicalContact: account.technicalContact || '',
    });
    setTabValue(0);
    setOpenEdit(true);
  };

  const handleUpdateAccount = async () => {
    try {
      await api.updateAccount(editingAccount!.id, {
        ...formData,
        assignedTeamIds: formData.assignedTeamIds,
        assigneeIds: formData.assigneeIds,
        ...onboardingData,
        onboardingDate: onboardingData.onboardingDate ? new Date(onboardingData.onboardingDate) : null,
        onboardingCompletedDate: onboardingData.onboardingCompletedDate ? new Date(onboardingData.onboardingCompletedDate) : null,
        contractSignedDate: onboardingData.contractSignedDate ? new Date(onboardingData.contractSignedDate) : null,
        goLiveDate: onboardingData.goLiveDate ? new Date(onboardingData.goLiveDate) : null,
      });
      setOpenEdit(false);
      setEditingAccount(null);
      setToast({ msg: 'Account updated', sev: 'success' });
      fetchAccounts();
    } catch (error: any) {
      setToast({ msg: error.response?.data?.error || 'Failed to update account', sev: 'error' });
    }
  };

  const handleDeleteAccount = (account: Account) => {
    setConfirmDelete({ open: true, account });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete.account) return;
    try {
      await api.deleteAccount(confirmDelete.account.id);
      setToast({ msg: 'Account deleted', sev: 'success' });
      setConfirmDelete({ open: false, account: null });
      fetchAccounts();
    } catch (error: any) {
      setToast({ msg: error.response?.data?.error || 'Failed to delete account', sev: 'error' });
    }
  };

  const columns = [
    { id: 'name', label: 'Account Name' },
    { id: 'industry', label: 'Industry' },
    { id: 'type', label: 'Type' },
    { id: 'country', label: 'Country' },
    { id: 'phoneNumber', label: 'Phone' },
    {
      id: 'creator',
      label: 'Creator',
      render: (r: Account) => {
        const creatorName = r.creator ? `${r.creator.firstName} ${r.creator.lastName}` : 'Unknown';
        return <Typography variant="body2">{creatorName}</Typography>;
      },
    },
    {
      id: 'onboardingStatus',
      label: 'Onboarding',
      render: (r: Account) => (
        <Chip
          label={r.onboardingStatus || 'Not Started'}
          size="small"
          color={onboardingStatusColor[r.onboardingStatus || 'Not Started'] || 'default'}
        />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (r: Account) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => handleEditClick(r)}>
            Edit
          </Button>
          {canDelete && (
            <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => handleDeleteAccount(r)}>
              Delete
            </Button>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Layout>
      <Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <TextField size="small" label="Search" value={acctFilters.search} onChange={(e) => setAcctFilters({ ...acctFilters, search: e.target.value })} />
          <TextField size="small" label="City" value={acctFilters.city} onChange={(e) => setAcctFilters({ ...acctFilters, city: e.target.value })} />
          <TextField size="small" label="Region" value={acctFilters.region} onChange={(e) => setAcctFilters({ ...acctFilters, region: e.target.value })} />
          <TextField size="small" label="Country" value={acctFilters.country} onChange={(e) => setAcctFilters({ ...acctFilters, country: e.target.value })} />
          <Button onClick={() => setAcctFilters({ search: '', city: '', region: '', country: '' })}>Clear</Button>
        </Box>
        <DataTable
          columns={columns}
          rows={accounts}
          total={total}
          page={page}
          pageSize={pageSize}
          loading={loading}
          title="Accounts"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onAddClick={handleAddClick}
        />

        {/* Create Account Dialog */}
        <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Account</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Account Name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  checkDuplicate(e.target.value);
                }}
                fullWidth
                required
                error={!!duplicateWarning}
                helperText={duplicateWarning}
              />
              <TextField
                label="Industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                fullWidth
              />
              <TextField
                label="Website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                fullWidth
              />
              <TextField
                label="Phone Number"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                fullWidth
              />
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                fullWidth
              />
              <TextField
                label="Remark"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
              <TextField
                label="Alternate Phone Number"
                value={formData.alternatePhoneNumber}
                onChange={(e) => setFormData({ ...formData, alternatePhoneNumber: e.target.value })}
                fullWidth
              />
              <TextField
                label="Type"
                select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                fullWidth
              >
                <MenuItem value="Prospect">Prospect</MenuItem>
                <MenuItem value="Customer">Customer</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </TextField>
              <TextField label="Contact Person" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} fullWidth />
              <TextField label="City" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} fullWidth />
              <TextField label="Region" value={formData.region} onChange={(e) => setFormData({ ...formData, region: e.target.value })} fullWidth />
              <TextField
                label="Country"
                select
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                fullWidth
              >
                <MenuItem value="">-- Select Country --</MenuItem>
                {countries.map((c) => (
                  <MenuItem key={c.id} value={c.name}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
            <Button
              onClick={handleCreateAccount}
              variant="contained"
              disabled={!formData.name.trim() || !!duplicateWarning}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Account Dialog (with onboarding) */}
        <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="md" fullWidth>
          <DialogTitle>Edit Account: {editingAccount?.name}</DialogTitle>
          <DialogContent>
            <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} sx={{ borderBottom: 1, borderColor: 'divider', mt: 1 }}>
              <Tab label="Company Info" />
              <Tab label="Onboarding" />
            </Tabs>

            {/* Company Info Tab */}
            {tabValue === 0 && (
              <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Account Name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    checkDuplicate(e.target.value);
                  }}
                  fullWidth
                  error={!!duplicateWarning}
                  helperText={duplicateWarning}
                />
                <TextField
                  label="Creator"
                  value={editingAccount?.creator ? `${editingAccount.creator.firstName} ${editingAccount.creator.lastName}` : 'Unknown'}
                  fullWidth
                  disabled
                />
                <TextField
                  label="Industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Phone Number"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Alternate Phone Number"
                  value={formData.alternatePhoneNumber}
                  onChange={(e) => setFormData({ ...formData, alternatePhoneNumber: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Type"
                  select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  fullWidth
                >
                  <MenuItem value="Prospect">Prospect</MenuItem>
                  <MenuItem value="Customer">Customer</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                </TextField>
                <TextField label="Contact Person" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} fullWidth />
                <TextField label="City" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} fullWidth />
                <TextField label="Region" value={formData.region} onChange={(e) => setFormData({ ...formData, region: e.target.value })} fullWidth />
                <TextField
                  label="Country"
                  select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  fullWidth
                >
                  <MenuItem value="">-- Select Country --</MenuItem>
                  {countries.map((c) => (
                    <MenuItem key={c.id} value={c.name}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>

                <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 600 }}>Assign account</Typography>
                <Typography variant="caption" color="textSecondary" sx={{ mt: -1 }}>
                  The creator/owner always sees it. Assign to teams (all their members can see it) and/or specific users.
                </Typography>
                <TextField
                  label="Assign to Teams"
                  select
                  fullWidth
                  value={formData.assignedTeamIds}
                  onChange={(e) => setFormData({ ...formData, assignedTeamIds: (typeof e.target.value === 'string' ? [e.target.value] : e.target.value) as any })}
                  SelectProps={{ multiple: true, renderValue: (sel: any) => (sel as string[]).map(teamName).join(', ') || '— None —' }}
                  helperText={teams.length === 0 ? 'No teams yet — create them under User Management → Teams' : 'Every member of a selected team can see this account'}
                >
                  {teams.map((t) => (<MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>))}
                </TextField>
                <TextField
                  label="Assign to Users"
                  select
                  fullWidth
                  value={formData.assigneeIds}
                  onChange={(e) => setFormData({ ...formData, assigneeIds: (typeof e.target.value === 'string' ? [e.target.value] : e.target.value) as any })}
                  SelectProps={{ multiple: true, renderValue: (sel: any) => (sel as string[]).map(userName).join(', ') || '— None —' }}
                  helperText="These specific users can also see this account"
                >
                  {orgUsers.map((u) => (<MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</MenuItem>))}
                </TextField>
              </Box>
            )}

            {/* Onboarding Tab */}
            {tabValue === 1 && (
              <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Onboarding Status"
                  select
                  value={onboardingData.onboardingStatus}
                  onChange={(e) => setOnboardingData({ ...onboardingData, onboardingStatus: e.target.value as any })}
                  fullWidth
                >
                  <MenuItem value="Not Started">Not Started</MenuItem>
                  <MenuItem value="In Progress">In Progress</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="On Hold">On Hold</MenuItem>
                </TextField>
                <TextField
                  label="Onboarding Start Date"
                  type="date"
                  value={onboardingData.onboardingDate}
                  onChange={(e) => setOnboardingData({ ...onboardingData, onboardingDate: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Onboarding Completed Date"
                  type="date"
                  value={onboardingData.onboardingCompletedDate}
                  onChange={(e) => setOnboardingData({ ...onboardingData, onboardingCompletedDate: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Contract Signed Date"
                  type="date"
                  value={onboardingData.contractSignedDate}
                  onChange={(e) => setOnboardingData({ ...onboardingData, contractSignedDate: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Go Live Date"
                  type="date"
                  value={onboardingData.goLiveDate}
                  onChange={(e) => setOnboardingData({ ...onboardingData, goLiveDate: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Account Manager"
                  value={onboardingData.accountManager}
                  onChange={(e) => setOnboardingData({ ...onboardingData, accountManager: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Billing Contact"
                  value={onboardingData.billingContact}
                  onChange={(e) => setOnboardingData({ ...onboardingData, billingContact: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Technical Contact"
                  value={onboardingData.technicalContact}
                  onChange={(e) => setOnboardingData({ ...onboardingData, technicalContact: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Onboarding Notes"
                  value={onboardingData.onboardingNotes}
                  onChange={(e) => setOnboardingData({ ...onboardingData, onboardingNotes: e.target.value })}
                  fullWidth
                  multiline
                  rows={4}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            {editingAccount && (
              <AssignOwner
                module="accounts"
                recordId={editingAccount.id}
                currentOwnerId={(editingAccount as any).ownerId}
                currentAssigneeIds={(editingAccount as any).assigneeIds}
                onAssigned={() => { setOpenEdit(false); fetchAccounts(); }}
              />
            )}
            <Box sx={{ flex: 1 }} />
            <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
            <Button
              onClick={handleUpdateAccount}
              variant="contained"
              disabled={!formData.name.trim() || !!duplicateWarning}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>

        <ConfirmDialog
          open={confirmDelete.open}
          title="Delete Account"
          message={`Delete account "${confirmDelete.account?.name}"? This cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete({ open: false, account: null })}
        />

        <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          {toast ? (
            <Alert severity={toast.sev} onClose={() => setToast(null)}>
              {toast.msg}
            </Alert>
          ) : undefined}
        </Snackbar>
      </Box>
    </Layout>
  );
}
