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
  Chip,
  Stack,
  Snackbar,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import Layout from '@components/Layout';
import DataTable from '@components/DataTable';
import AssignOwner from '@components/AssignOwner';
import { api } from '@services/api';
import { Account } from '../types';
import { formatCurrency } from '@utils/format';

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
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [loading, setLoading] = React.useState(false);
  const [toast, setToast] = React.useState<{ msg: string; sev: 'success' | 'error' } | null>(null);

  const [openCreate, setOpenCreate] = React.useState(false);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<Account | null>(null);
  const [tabValue, setTabValue] = React.useState(0);

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
  });

  const [acctFilters, setAcctFilters] = React.useState({ search: '', city: '', region: '', country: '' });

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

  const handleEditClick = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      industry: account.industry || '',
      website: account.website || '',
      phoneNumber: account.phoneNumber || '',
      alternatePhoneNumber: (account as any).alternatePhoneNumber || '',
      type: account.type,
      contactPerson: (account as any).contactPerson || '',
      city: (account as any).city || '',
      region: (account as any).region || '',
      country: (account as any).country || '',
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

  const columns = [
    { id: 'name', label: 'Account Name' },
    { id: 'industry', label: 'Industry' },
    { id: 'type', label: 'Type' },
    { id: 'phoneNumber', label: 'Phone' },
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
        <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => handleEditClick(r)}>
          Edit
        </Button>
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
              <TextField label="Country" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} fullWidth />
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
                <TextField label="Country" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} fullWidth />
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
