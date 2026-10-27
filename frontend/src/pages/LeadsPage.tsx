import React from 'react';
import { Divider } from '@mui/material';
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
  CircularProgress,
  Grid,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import StaffFilter from '@components/StaffFilter';
import Layout from '@components/Layout';
import DataTable from '@components/DataTable';
import { SortState } from '@components/SortControl';
import AssignOwner from '@components/AssignOwner';
import ConfirmDialog from '@components/ConfirmDialog';
import ProspectingQuestionnaire, { ProspectAnswers, ProspectOptionSets } from '@components/ProspectingQuestionnaire';
import { alpha } from '@mui/material/styles';
import BuyingCommitteeEditor, {
  CommitteeForm,
  committeeError,
  committeeFormFromRows,
  committeePayload,
} from '@components/BuyingCommitteeEditor';
import useAuth from '@hooks/useAuth';
import { api } from '@services/api';
import { Account } from '../types';

interface Country {
  id: string;
  code: string;
  name: string;
  region?: string;
}


export default function LeadsPage() {
  const { hasPermission, user: currentUser } = useAuth();
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
    type: 'Account' as 'Account' | 'On hold',
    contactPerson: '',
    city: '',
    region: '',
    country: '',
    email: '',
    remark: '',
    tier: '',
    assignedTeamIds: [] as string[],
    assigneeIds: [] as string[],
  });

  const [teams, setTeams] = React.useState<any[]>([]);
  const [orgUsers, setOrgUsers] = React.useState<any[]>([]);
  const [countriesError, setCountriesError] = React.useState('');
  const [acctFilters, setAcctFilters] = React.useState({ search: '', city: '', region: '', country: '', ownerId: '' });
  const [acctSort, setAcctSort] = React.useState<SortState>({ sortBy: 'createdAt', sortDir: 'desc' });

  // Buying-committee stakeholder mapping (the 8 fixed roles). Must be
  // complete before a lead can be created against this account.
  const [designations, setDesignations] = React.useState<any[]>([]);
  const [companyTypes, setCompanyTypes] = React.useState<any[]>([]);
  const [stakeholderDialog, setStakeholderDialog] = React.useState<{ open: boolean; account: Account | null }>({ open: false, account: null });
  const [stakeholderForm, setStakeholderForm] = React.useState<CommitteeForm>({});
  const [stakeholderLoading, setStakeholderLoading] = React.useState(false);

  // Load countries, teams and users on mount (in parallel for speed).
  // allSettled, not all: /api/users is Admin/Manager-only, so it 403s for every
  // other role. Promise.all rejects the whole batch on the first rejection, which
  // threw away the countries that had loaded fine — that is why the country
  // dropdown was empty for non-admins and populated for admins.
  React.useEffect(() => {
    Promise.allSettled([
      api.getCountries(),
      api.getTeams(),
      api.getUsers(1, 500),
      api.getDesignations({ isActive: true }),
      api.getCompanyTypes({ isActive: true }),
    ]).then(([c, t, u, d, ct]) => {
      if (c.status === 'fulfilled') {
        const list: Country[] = c.value.data?.data ?? [];
        setCountries([...list].sort((a, b) => a.name.localeCompare(b.name)));
        setCountriesError(list.length ? '' : 'No countries configured — add them in Country Master.');
      } else {
        console.error('Error loading countries:', c.reason);
        setCountries([]);
        setCountriesError('Could not load countries.');
      }

      // Teams and the org user list only label assignments; a user without
      // permission for them still gets a working form.
      setTeams(t.status === 'fulfilled' ? t.value.data?.data ?? [] : []);
      setOrgUsers(u.status === 'fulfilled' ? u.value.data?.data ?? [] : []);
      setDesignations(d.status === 'fulfilled' ? d.value.data?.data ?? [] : []);
      setCompanyTypes(ct.status === 'fulfilled' ? ct.value.data?.data ?? [] : []);
    });
  }, []);

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name || id;
  const userName = (id: string) => {
    const u = orgUsers.find((x) => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : id;
  };

  const [duplicateWarning, setDuplicateWarning] = React.useState('');

  // Prospecting questionnaire answers for the account being edited.
  const [prospectingAnswers, setProspectingAnswers] = React.useState<ProspectAnswers>({});
  const [prospectOptions, setProspectOptions] = React.useState<ProspectOptionSets>({ businessType: [], employeeBand: [] });
  // Options for the multi-select questions come from the Prospect Options master.
  React.useEffect(() => {
    api.getProspectOptions()
      .then((r) => {
        const sets: ProspectOptionSets = { businessType: [], employeeBand: [] };
        for (const o of r.data.data || []) {
          if (!o.isActive) continue;
          if (o.category === 'businessType') sets.businessType.push(o.name);
          else if (o.category === 'employeeBand') sets.employeeBand.push(o.name);
            }
        setProspectOptions(sets);
      })
      .catch((e: any) => setToast({ msg: e.response?.data?.error || 'Could not load prospect options', sev: 'error' }));
  }, []);

  const fetchAccounts = React.useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      Object.entries(acctFilters).forEach(([k, v]) => { if (v) params[k] = v; });
      params.sortBy = acctSort.sortBy;
      params.sortDir = acctSort.sortDir;
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
  }, [page, pageSize, acctFilters, acctSort]);

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
      type: 'Account',
      contactPerson: '',
      city: '',
      region: '',
      country: '',
      email: '',
      remark: '',
      tier: '',
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
      tier: full.tier || '',
      assignedTeamIds: full.assignedTeamIds || [],
      assigneeIds: full.assigneeIds || [],
    });
    setProspectingAnswers((account as any).prospecting?.answers || {});
    setTabValue(0);
    setOpenEdit(true);
  };

  // Saves the account details only. Returns the prospecting progress from the server.
  const saveAccountDetails = async () => {
    const saved = await api.updateAccount(editingAccount!.id, {
      ...formData,
      assignedTeamIds: formData.assignedTeamIds,
      assigneeIds: formData.assigneeIds,
      prospectingAnswers,
    });
    return saved.data.data?.prospecting ?? null;
  };

  // "Save": keeps the details and closes the dialog. Nothing is converted.
  const handleSaveAccount = async () => {
    try {
      await saveAccountDetails();
      fetchAccounts();
      setOpenEdit(false);
      setEditingAccount(null);
      setToast({ msg: 'Account saved', sev: 'success' });
    } catch (error: any) {
      setToast({ msg: error.response?.data?.error || 'Failed to save account', sev: 'error' });
    }
  };

  // "Save as lead": saves the details, then creates the lead from the account's contact.
  const handleSaveAsLead = async () => {
    try {
      const progress = await saveAccountDetails();
      fetchAccounts();
      if (!progress?.complete) {
        setToast({ msg: `Saved, but not ready as a lead. Missing: ${(progress?.missing || []).join(', ')}`, sev: 'error' });
        return;
      }
      const [firstName, ...rest] = (formData.contactPerson || '').trim().split(/\s+/);
      await api.createLead({
        accountId: editingAccount!.id,
        firstName: firstName || formData.name,
        lastName: rest.join(' ') || '-',
        email: formData.email,
        company: formData.name,
        phoneNumber: formData.phoneNumber,
        value: 0,
      });
      setOpenEdit(false);
      setEditingAccount(null);
      setToast({ msg: 'Saved as lead', sev: 'success' });
    } catch (error: any) {
      setToast({ msg: error.response?.data?.error || 'Failed to save as lead', sev: 'error' });
    }
  };

  const handleDeleteAccount = (account: Account) => {
    setConfirmDelete({ open: true, account });
  };

  const openStakeholderDialog = async (account: Account) => {
    setStakeholderDialog({ open: true, account });
    setStakeholderLoading(true);
    try {
      const res = await api.getAccountStakeholders(account.id);
      setStakeholderForm(committeeFormFromRows(res.data.data || []));
    } catch (e: any) {
      setToast({ msg: e.response?.data?.error || 'Failed to load buying committee', sev: 'error' });
      setStakeholderDialog({ open: false, account: null });
    } finally {
      setStakeholderLoading(false);
    }
  };

  const saveStakeholders = async () => {
    if (!stakeholderDialog.account) return;
    const problem = committeeError(stakeholderForm);
    if (problem) {
      setToast({ msg: problem, sev: 'error' });
      return;
    }
    try {
      await api.saveAccountStakeholders(stakeholderDialog.account.id, committeePayload(stakeholderForm));
      setToast({ msg: 'Buying committee saved', sev: 'success' });
      setStakeholderDialog({ open: false, account: null });
    } catch (e: any) {
      setToast({ msg: e.response?.data?.error || 'Failed to save buying committee', sev: 'error' });
    }
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
    { id: 'name', label: 'Account Name', sortKey: 'name' },
    { id: 'industry', label: 'Industry' },
    {
      id: 'type',
      sortKey: 'type',
      label: 'Type',
      render: (r: any) => {
        // The stage follows the account's leads (see backend utils/accountStage.ts).
        const stage: string = r.stage ?? 'Account';
        // Type shows the account stage.
        const label: string = stage;
        const color = label === 'Opportunity' ? 'success' : label === 'Prospect' ? 'primary' : label === 'Qualified' ? 'secondary' : label === 'Lead' ? 'info' : label === 'On hold' ? 'warning' : 'default';
        const chip = <Chip label={label} size="small" color={color as any} variant={label === 'Account' ? 'outlined' : 'filled'} />;
        return chip;
      },
    },
    {
      id: 'tier',
      sortKey: 'tier',
      label: 'Agency Tier',
      // Tier entered in the questionnaire (prospectingAnswers) counts when the account tier is blank.
      render: (r: Account) => { const tier = (r as any).tier || (r as any).prospectingAnswers?.tier; return tier ? <Chip label={tier} size="small" variant="outlined" /> : "-"; },
    },
    { id: 'country', label: 'Country', sortKey: 'country' },
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
      id: 'prospecting',
      label: 'Lead',
      render: (r: any) => {
        const p = r.prospecting;
        if (!p) return '-';
        return p.complete
          ? <Chip label="Qualified" size="small" color="success" />
          : <Stack direction="row" spacing={0.75} alignItems="center"><Box component="span" sx={{ color: "error.main", fontSize: "1.1rem", fontWeight: 700 }}>{p.total - p.answered}Q</Box><Chip label="Pending" size="small" color="error" /></Stack>;
      },
    },
    {
      id: 'prospectedAt',
      label: 'Lead since',
      render: (r: any) => (r.prospectedAt ? new Date(r.prospectedAt).toLocaleString() : '-'),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (r: Account) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => handleEditClick(r)}>
            Edit
          </Button>
          <Button size="small" variant="outlined" onClick={() => openStakeholderDialog(r)}>
            Buying Committee
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
          <Box sx={{ minWidth: 180 }}><StaffFilter value={acctFilters.ownerId} onChange={(v) => setAcctFilters({ ...acctFilters, ownerId: v })} label="Staff (owner)" /></Box>
          <TextField size="small" label="City" value={acctFilters.city} onChange={(e) => setAcctFilters({ ...acctFilters, city: e.target.value })} />
          <TextField size="small" label="Region" value={acctFilters.region} onChange={(e) => setAcctFilters({ ...acctFilters, region: e.target.value })} />
          <TextField size="small" label="Country" value={acctFilters.country} onChange={(e) => setAcctFilters({ ...acctFilters, country: e.target.value })} />
          <Button onClick={() => setAcctFilters({ search: '', city: '', region: '', country: '', ownerId: '' })}>Clear</Button>
        </Box>
        <DataTable
          columns={columns}
          rows={accounts}
          total={total}
          page={page}
          pageSize={pageSize}
          loading={loading}
          title="Leads"
          sort={acctSort}
          onSortChange={setAcctSort}
          getRowSx={(r: any) => (r.prospecting?.complete ? { bgcolor: (t: any) => alpha(t.palette.success.main, 0.12) } : undefined)}
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
                <MenuItem value="Account">Account</MenuItem>
                <MenuItem value="On hold">On hold</MenuItem>
              </TextField>
              <TextField
                label="Agency Tier"
                select
                value={formData.tier || prospectingAnswers.tier || ''}
                onChange={(e) => { setFormData({ ...formData, tier: e.target.value }); setProspectingAnswers({ ...prospectingAnswers, tier: e.target.value }); }}
                fullWidth
              >
                <MenuItem value="">-- Select Tier --</MenuItem>
                <MenuItem value="T1">Tier 1 (T1-10)</MenuItem>
                <MenuItem value="T2">Tier 2 (T11-25)</MenuItem>
                <MenuItem value="T3">Tier 3 (T26-50)</MenuItem>
                <MenuItem value="T4">Tier 4 (T51-100)</MenuItem>
                <MenuItem value="T5">Tier 5 (T101-500)</MenuItem>
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
                error={!!countriesError}
                helperText={countriesError}
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
              <Tab label="Account Info" />
              <Tab label="Lead Conversion" />
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
                  <MenuItem value="Account">Account</MenuItem>
                  <MenuItem value="On hold">On hold</MenuItem>
                </TextField>
                <TextField
                  label="Agency Tier"
                  select
                  value={formData.tier || prospectingAnswers.tier || ''}
                  onChange={(e) => { setFormData({ ...formData, tier: e.target.value }); setProspectingAnswers({ ...prospectingAnswers, tier: e.target.value }); }}
                  fullWidth
                >
                  <MenuItem value="">-- Select Tier --</MenuItem>
                  <MenuItem value="T1">Tier 1 (T1-10)</MenuItem>
                  <MenuItem value="T2">Tier 2 (T11-25)</MenuItem>
                  <MenuItem value="T3">Tier 3 (T26-50)</MenuItem>
                  <MenuItem value="T4">Tier 4 (T51-100)</MenuItem>
                  <MenuItem value="T5">Tier 5 (T101-500)</MenuItem>
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
                  error={!!countriesError}
                  helperText={countriesError}
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
                <ProspectingQuestionnaire
                  value={prospectingAnswers}
                  onChange={(next) => { setProspectingAnswers(next); if (next.tier) setFormData((f) => ({ ...f, tier: next.tier as string })); }}
                  options={prospectOptions}
                  basic={{
                    name: formData.name,
                    website: formData.website,
                    country: formData.country,
                    region: formData.region,
                    city: formData.city,
                    industry: formData.industry,
                    tier: formData.tier,
                    contactPerson: formData.contactPerson,
                    email: formData.email,
                    phoneNumber: formData.phoneNumber,
                    ownerName: (editingAccount as any)?.owner ? `${(editingAccount as any).owner.firstName} ${(editingAccount as any).owner.lastName}` : '',
                  }}
                />
                <Divider />
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
                isOwner={(editingAccount as any).ownerId === currentUser?.id}
                onAssigned={() => { setOpenEdit(false); fetchAccounts(); }}
              />
            )}
            <Box sx={{ flex: 1 }} />
            <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
            <Button
              onClick={handleSaveAccount}
              variant="outlined"
              disabled={!formData.name.trim() || !!duplicateWarning}
            >
              Save
            </Button>
            <Button
              onClick={handleSaveAsLead}
              variant="contained"
              disabled={!formData.name.trim() || !!duplicateWarning}
            >
              Convert as Lead
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={stakeholderDialog.open} onClose={() => setStakeholderDialog({ open: false, account: null })} maxWidth="md" fullWidth>
          <DialogTitle>
            Buying Committee — {stakeholderDialog.account?.name}
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Map a person to each role. A named member needs an email and a phone number, and every
              account without a named member is highlighted in Prospects and Opportunities. It does not
              block creating leads or opportunities.
            </Typography>
            {stakeholderLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <BuyingCommitteeEditor
                value={stakeholderForm}
                onChange={setStakeholderForm}
                designations={designations}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStakeholderDialog({ open: false, account: null })}>Cancel</Button>
            <Button onClick={saveStakeholders} variant="contained" disabled={stakeholderLoading}>Save</Button>
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
