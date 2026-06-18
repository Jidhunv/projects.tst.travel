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
} from '@mui/material';
import Layout from '@components/Layout';
import DataTable from '@components/DataTable';
import { api } from '@services/api';
import { Lead } from '../types';
import { formatCurrency } from '@utils/format';

const statusColor: Record<string, any> = {
  Open: 'info',
  Qualified: 'primary',
  Converted: 'success',
  Disqualified: 'error',
};

export default function LeadsPage() {
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [loading, setLoading] = React.useState(false);
  const [products, setProducts] = React.useState<any[]>([]);
  const [rejectionReasons, setRejectionReasons] = React.useState<string[]>([]);
  const [toast, setToast] = React.useState<{ msg: string; sev: 'success' | 'error' } | null>(null);

  const [openCreate, setOpenCreate] = React.useState(false);
  const [form, setForm] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phoneNumber: '',
    value: '',
    expectedCloseDate: '',
    productId: '',
  });

  const [lostDialog, setLostDialog] = React.useState<{ lead: Lead | null; reason: string }>({
    lead: null,
    reason: '',
  });

  const fetchLeads = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getLeads(page, pageSize);
      if (res.data.success) {
        setLeads(res.data.data || []);
        setTotal(res.data.meta?.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  React.useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  React.useEffect(() => {
    api.getProducts().then((r) => r.data.success && setProducts(r.data.data || []));
    api.getRejectionReasons().then((r) => r.data.success && setRejectionReasons(r.data.data || []));
  }, []);

  const handleCreate = async () => {
    try {
      const product = products.find((p) => p.id === form.productId);
      await api.createLead({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        company: form.company,
        phoneNumber: form.phoneNumber,
        value: form.value ? Number(form.value) : 0,
        expectedCloseDate: form.expectedCloseDate || undefined,
        productId: form.productId || undefined,
        productName: product?.name,
      });
      setOpenCreate(false);
      setForm({ firstName: '', lastName: '', email: '', company: '', phoneNumber: '', value: '', expectedCloseDate: '', productId: '' });
      setToast({ msg: 'Lead created', sev: 'success' });
      fetchLeads();
    } catch (e: any) {
      setToast({ msg: e.response?.data?.error || 'Failed to create lead', sev: 'error' });
    }
  };

  const handleConvert = async (lead: Lead) => {
    try {
      await api.convertLeadToOpportunity(lead.id);
      setToast({ msg: `Converted "${lead.firstName}" to an opportunity`, sev: 'success' });
      fetchLeads();
    } catch (e: any) {
      setToast({ msg: e.response?.data?.error || 'Conversion failed', sev: 'error' });
    }
  };

  const handleMarkLost = async () => {
    if (!lostDialog.lead || !lostDialog.reason) return;
    try {
      await api.markLeadLost(lostDialog.lead.id, lostDialog.reason);
      setToast({ msg: 'Lead closed as lost', sev: 'success' });
      setLostDialog({ lead: null, reason: '' });
      fetchLeads();
    } catch (e: any) {
      setToast({ msg: e.response?.data?.error || 'Failed', sev: 'error' });
    }
  };

  const columns = [
    { id: 'firstName', label: 'Name', render: (r: Lead) => `${r.firstName} ${r.lastName}` },
    { id: 'company', label: 'Company' },
    { id: 'productName', label: 'Product', render: (r: Lead) => r.productName || '-' },
    {
      id: 'value',
      label: 'Value',
      align: 'right' as const,
      render: (r: Lead) => formatCurrency(r.value),
    },
    {
      id: 'expectedCloseDate',
      label: 'Expected Close',
      render: (r: Lead) =>
        r.expectedCloseDate ? new Date(r.expectedCloseDate).toLocaleDateString() : '-',
    },
    {
      id: 'status',
      label: 'Status',
      render: (r: Lead) => (
        <Chip label={r.status} size="small" color={statusColor[r.status] || 'default'} />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (r: Lead) => {
        const closed = r.status === 'Converted' || r.status === 'Disqualified';
        if (closed) {
          return r.lostReason ? (
            <Chip label={r.lostReason} size="small" variant="outlined" color="error" />
          ) : (
            <span>-</span>
          );
        }
        return (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" onClick={() => handleConvert(r)}>
              Convert
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => setLostDialog({ lead: r, reason: '' })}
            >
              Lost
            </Button>
          </Stack>
        );
      },
    },
  ];

  return (
    <Layout>
      <Box>
        <DataTable
          columns={columns}
          rows={leads}
          total={total}
          page={page}
          pageSize={pageSize}
          loading={loading}
          title="Leads"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onAddClick={() => setOpenCreate(true)}
        />

        {/* Create lead */}
        <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Lead</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} fullWidth required />
              <TextField label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} fullWidth required />
              <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth required />
              <TextField label="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} fullWidth />
              <TextField label="Phone" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} fullWidth />
              <TextField label="Estimated Value ($)" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} fullWidth />
              <TextField label="Expected Close Date" type="date" value={form.expectedCloseDate} onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
              <TextField label="Product of Interest" select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} fullWidth>
                <MenuItem value="">None</MenuItem>
                {products.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name} ({formatCurrency(p.unitPrice)})
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} variant="contained">Create</Button>
          </DialogActions>
        </Dialog>

        {/* Close as lost */}
        <Dialog open={!!lostDialog.lead} onClose={() => setLostDialog({ lead: null, reason: '' })} maxWidth="xs" fullWidth>
          <DialogTitle>Close Lead as Lost</DialogTitle>
          <DialogContent>
            <TextField
              label="Reason"
              select
              value={lostDialog.reason}
              onChange={(e) => setLostDialog({ ...lostDialog, reason: e.target.value })}
              fullWidth
              sx={{ mt: 2 }}
            >
              {rejectionReasons.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLostDialog({ lead: null, reason: '' })}>Cancel</Button>
            <Button onClick={handleMarkLost} variant="contained" color="error" disabled={!lostDialog.reason}>
              Mark Lost
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
