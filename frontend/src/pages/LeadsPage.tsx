import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Card,
  CardContent,
  Typography,
  Grid,
  OutlinedInput,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { Search as SearchIcon, ViewAgendaOutlined as ListIcon, ViewWeekOutlined as KanbanIcon } from '@mui/icons-material';
import Layout from '@components/Layout';
import { apiClient } from '../services/api';
import { Lead } from '../types';
import { formatCurrency } from '@utils/format';

const statusColor: Record<string, 'info' | 'primary' | 'success' | 'error' | 'warning'> = {
  Open: 'info',
  Qualified: 'success',
  Disqualified: 'error',
};

const statusDisplay: Record<string, string> = {
  Open: 'Open',
  Qualified: 'Qualified',
  Converted: 'Converted',
  Disqualified: 'Disqualified',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  // Dialogs
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState<Lead | null>(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phoneNumber: '',
    value: '',
    expectedCloseDate: '',
    productIds: [] as string[],
    remark: '',
    source: '',
    status: '',
  });

  const fetchLeads = React.useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: pageSize };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (sourceFilter) params.source = sourceFilter;
      if (dateFromFilter) params.fromDate = dateFromFilter;
      if (dateToFilter) params.toDate = dateToFilter;

      const response = await apiClient.get('/leads', { params });
      setLeads(response.data.data || []);
      setTotal(response.data.meta?.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, sourceFilter, dateFromFilter, dateToFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sourceFilter, dateFromFilter, dateToFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    apiClient.get('/products').then((r) => setProducts(r.data.data || []));
  }, []);

  const handleCreate = async () => {
    try {
      const productNames = form.productIds.map((id) => products.find((p) => p.id === id)?.name).filter(Boolean);
      await apiClient.post('/leads', {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        company: form.company,
        phoneNumber: form.phoneNumber,
        value: form.value ? Number(form.value) : 0,
        expectedCloseDate: form.expectedCloseDate || undefined,
        source: form.source || undefined,
        productIds: form.productIds,
        productNames: productNames,
        remark: form.remark,
      });
      setOpenCreate(false);
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        company: '',
        phoneNumber: '',
        value: '',
        expectedCloseDate: '',
        productIds: [],
        remark: '',
        source: '',
        status: '',
      });
      fetchLeads();
    } catch (error) {
      console.error('Error creating lead:', error);
    }
  };

  const handleUpdate = async () => {
    if (!openEdit) return;
    try {
      const productNames = form.productIds.map((id) => products.find((p) => p.id === id)?.name).filter(Boolean);

      // If status changed to Qualified, convert to opportunity
      if (form.status === 'Qualified' && openEdit.status !== 'Qualified') {
        await apiClient.post(`/leads/${openEdit.id}/convert-to-opportunity`, {});
        alert('Lead qualified! An opportunity has been created.');
        setOpenEdit(null);
        fetchLeads();
        return;
      }

      // Otherwise, update lead normally
      await apiClient.patch(`/leads/${openEdit.id}`, {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        company: form.company,
        phoneNumber: form.phoneNumber,
        value: form.value ? Number(form.value) : 0,
        expectedCloseDate: form.expectedCloseDate || undefined,
        source: form.source || undefined,
        status: form.status || undefined,
        productIds: form.productIds,
        productNames: productNames,
        remark: form.remark,
      });
      setOpenEdit(null);
      fetchLeads();
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  const handleConvert = async (lead: Lead) => {
    try {
      await apiClient.post(`/leads/${lead.id}/convert-to-account`, {});
      fetchLeads();
    } catch (error) {
      console.error('Error converting lead:', error);
    }
  };

  const handleDelete = async (leadId: string) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await apiClient.delete(`/leads/${leadId}`);
        fetchLeads();
      } catch (error) {
        console.error('Error deleting lead:', error);
      }
    }
  };

  const handleOpenEdit = (lead: Lead) => {
    setOpenEdit(lead);
    setForm({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      company: lead.company || '',
      phoneNumber: lead.phoneNumber || '',
      value: lead.value.toString(),
      expectedCloseDate: lead.expectedCloseDate ? lead.expectedCloseDate.toString().split('T')[0] : '',
      source: lead.source || '',
      status: lead.status || '',
      productIds: (lead as any).productIds && (lead as any).productIds.length > 0
        ? (lead as any).productIds
        : lead.productId ? [lead.productId] : [],
      remark: lead.remark || '',
    });
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">
            Leads Management
          </Typography>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => {
              if (newMode !== null) setViewMode(newMode);
            }}
            size="small"
          >
            <ToggleButton value="list" aria-label="list view">
              <ListIcon sx={{ mr: 0.5 }} />
              List
            </ToggleButton>
            <ToggleButton value="kanban" aria-label="kanban view">
              <KanbanIcon sx={{ mr: 0.5 }} />
              Kanban
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <OutlinedInput
                  fullWidth
                  placeholder="Search by name, email, company..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  }
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  select
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  size="small"
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="Open">Open</MenuItem>
                  <MenuItem value="Qualified">Qualified</MenuItem>
                  <MenuItem value="Disqualified">Disqualified</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  select
                  label="Source"
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  size="small"
                >
                  <MenuItem value="">All Sources</MenuItem>
                  <MenuItem value="inbound">Inbound</MenuItem>
                  <MenuItem value="referral">Referral</MenuItem>
                  <MenuItem value="cold outreach">Cold Outreach</MenuItem>
                  <MenuItem value="website">Website</MenuItem>
                  <MenuItem value="event">Event</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button variant="contained" fullWidth onClick={() => setOpenCreate(true)}>
                  Add Lead
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="From Date"
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="To Date"
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* List View */}
        {viewMode === 'list' && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      {lead.firstName} {lead.lastName}
                    </TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>{lead.company || '-'}</TableCell>
                    <TableCell>{formatCurrency(lead.value)}</TableCell>
                    <TableCell>
                      <Chip label={statusDisplay[lead.status] || lead.status} color={statusColor[lead.status] || 'default'} size="small" />
                    </TableCell>
                    <TableCell>
                      {(lead as any).productNames && (lead as any).productNames.length > 0
                        ? (lead as any).productNames.join(', ')
                        : lead.productName || '-'}
                    </TableCell>
                    <TableCell>{new Date(lead.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button size="small" variant="text" onClick={() => handleOpenEdit(lead)}>
                        Edit
                      </Button>
                      <Button size="small" variant="text" color="error" onClick={() => handleDelete(lead.id)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Kanban View */}
        {viewMode === 'kanban' && (
          <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
            {[
              { key: 'Open', statuses: ['Open'], label: 'Open' },
              { key: 'Converted', statuses: ['Qualified', 'Converted'], label: 'Converted' },
              { key: 'Disqualified', statuses: ['Disqualified'], label: 'Disqualified' }
            ].map((column) => {
              const statusLeads = leads.filter((lead) => column.statuses.includes(lead.status));
              return (
                <Box
                  key={column.key}
                  sx={{
                    flex: '0 0 320px',
                    bgcolor: '#f5f5f5',
                    borderRadius: 2,
                    p: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Chip
                      label={column.label}
                      color={statusColor[column.key] || 'default'}
                      size="small"
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {statusLeads.length}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {statusLeads.map((lead) => (
                      <Card
                        key={lead.id}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { boxShadow: 3 },
                        }}
                        onClick={() => handleOpenEdit(lead)}
                      >
                        <CardContent sx={{ pb: 1 }}>
                          <Typography sx={{ fontWeight: 600, mb: 1 }} noWrap>
                            {lead.firstName} {lead.lastName}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" noWrap>
                            {lead.email}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                            <Typography variant="body2" color="textSecondary">
                              Value
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatCurrency(lead.value)}
                            </Typography>
                          </Box>
                          {((lead as any).productNames && (lead as any).productNames.length > 0 || lead.productName) && (
                            <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #eee' }}>
                              <Typography variant="caption" color="textSecondary">
                                {(lead as any).productNames && (lead as any).productNames.length > 0
                                  ? (lead as any).productNames.join(', ')
                                  : lead.productName}
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={openCreate || !!openEdit} onClose={() => { setOpenCreate(false); setOpenEdit(null); }} maxWidth="sm" fullWidth>
          <DialogTitle>{openEdit ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="First Name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Last Name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              disabled={!!openEdit}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Phone"
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Value"
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Expected Close Date"
              type="date"
              value={form.expectedCloseDate}
              onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              select
              label="Source"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              sx={{ mb: 2 }}
            >
              <MenuItem value="">Select Source</MenuItem>
              <MenuItem value="inbound">Inbound</MenuItem>
              <MenuItem value="referral">Referral</MenuItem>
              <MenuItem value="cold outreach">Cold Outreach</MenuItem>
              <MenuItem value="website">Website</MenuItem>
              <MenuItem value="event">Event</MenuItem>
            </TextField>
            <TextField
              fullWidth
              select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              sx={{ mb: 2 }}
            >
              <MenuItem value="">Select Status</MenuItem>
              <MenuItem value="Open">Open</MenuItem>
              <MenuItem value="Qualified">Qualified (creates opportunity)</MenuItem>
              <MenuItem value="Disqualified">Disqualified</MenuItem>
            </TextField>
            <TextField
              fullWidth
              select
              label="Products (Multi-Select)"
              value={form.productIds}
              onChange={(e) => setForm({ ...form, productIds: typeof e.target.value === 'string' ? [e.target.value] : e.target.value })}
              SelectProps={{ multiple: true }}
              sx={{ mb: 1 }}
            >
              {products.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.name}
                </MenuItem>
              ))}
            </TextField>
            {form.productIds.length > 0 && (
              <Box sx={{ mb: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                  Selected Products:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {form.productIds.map((productId) => {
                    const product = products.find((p) => p.id === productId);
                    return (
                      <Chip
                        key={productId}
                        label={product?.name || productId}
                        onDelete={() => setForm({ ...form, productIds: form.productIds.filter((id) => id !== productId) })}
                        size="small"
                      />
                    );
                  })}
                </Box>
              </Box>
            )}
            <TextField
              fullWidth
              label="Remark"
              multiline
              rows={3}
              value={form.remark}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setOpenCreate(false); setOpenEdit(null); }}>Cancel</Button>
            <Button onClick={openEdit ? handleUpdate : handleCreate} variant="contained">
              {openEdit ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
