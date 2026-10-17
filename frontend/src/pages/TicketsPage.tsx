import React, { useState, useEffect } from 'react';
import {
  Alert,
  Tab,
  Tabs,
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
  Box,
  Chip,
  Card,
  CardContent,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  OutlinedInput,
  InputAdornment,
} from '@mui/material';
import { Search as SearchIcon, ViewAgendaOutlined as ListIcon, ViewWeekOutlined as KanbanIcon } from '@mui/icons-material';
import VoiceTextField from '@components/VoiceTextField';
import TicketIssuesPanel from '@components/TicketIssuesPanel';
import SearchableSelect from '@components/SearchableSelect';
import { useAccountOptions } from '@hooks/useAccountOptions';
import Layout from '@components/Layout';
import AssignOwner from '@components/AssignOwner';
import { api, apiClient } from '../services/api';
import useAuth from '../hooks/useAuth';

// What kind of ticket it is. A ticket keeps whatever category it already has even if it is not in this
// list (older tickets used free text).
const TICKET_CATEGORIES = ['Bug', 'Enhancement', 'Training'];
const categoryOptions = (current: string) => (current && !TICKET_CATEGORIES.includes(current) ? [current, ...TICKET_CATEGORIES] : TICKET_CATEGORIES);

export const TicketsPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const canSeeIssues = hasPermission('issue_log', 'read');
  const [dialogTab, setDialogTab] = useState(0);
  const [tickets, setTickets] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    ticketNumber: '',
    title: '',
    description: '',
    priority: 'Medium',
    status: 'Open',
    category: '',
    productId: '',
    accountId: '',
    slaResponseHours: '',
    slaResolutionHours: '',
  });
  const [products, setProducts] = useState<any[]>([]);
  const productName = (id?: string) => products.find((p) => p.id === id)?.name || '';

  const { accounts: clientOptions, loading: clientsLoading, error: clientsError, search: searchClients } = useAccountOptions(formData.accountId);

  useEffect(() => {
    fetchTickets();
    api.getProducts(1, 500).then((r) => setProducts(r.data.data || [])).catch(() => setProducts([]));
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await apiClient.get('/tickets');
      setTickets(response.data.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const handleOpenDialog = (ticket?: any) => {
    if (ticket) {
      setSelectedTicket(ticket);
      setFormData({
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        category: ticket.category || '',
        productId: ticket.productId || '',
        accountId: ticket.account.id,
        slaResponseHours: ticket.slaResponseHours?.toString() || '',
        slaResolutionHours: ticket.slaResolutionHours?.toString() || '',
      });
    } else {
      setSelectedTicket(null);
      setFormData({
        ticketNumber: '',
        title: '',
        description: '',
        priority: 'Medium',
        status: 'Open',
        category: '',
        productId: '',
        accountId: '',
        slaResponseHours: '',
        slaResolutionHours: '',
      });
    }
    setSaveError('');
    setDialogTab(0);
    setOpenDialog(true);
  };

  const handleSave = async () => {
    setSaveError('');
    if (!formData.accountId) { setSaveError('Select the client this ticket is for'); return; }
    if (!formData.title.trim()) { setSaveError('Enter a title'); return; }
    if (!formData.description.trim()) { setSaveError('Enter a description'); return; }
    setSaving(true);
    try {
      if (selectedTicket) {
        await apiClient.patch(`/tickets/${selectedTicket.id}`, { ...formData, productId: formData.productId || null });
      } else {
        await apiClient.post('/tickets', { ...formData, productId: formData.productId || null });
      }
      setOpenDialog(false);
      await fetchTickets(); // reload so the client name and ticket number show correctly
    } catch (error: any) {
      console.error('Error saving ticket:', error);
      setSaveError(error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Could not save the ticket');
    } finally {
      setSaving(false);
    }
  };

  const refreshAfterIssueChange = async () => {
    await fetchTickets();
    if (!selectedTicket) return;
    try {
      const r = await apiClient.get(`/tickets/${selectedTicket.id}`);
      const t = r.data.data;
      if (t) { setSelectedTicket(t); setFormData((f) => ({ ...f, status: t.status })); }
    } catch (e) { console.error('Error refreshing the ticket:', e); }
  };

  const handleResolve = async (ticketId: string) => {
    const notes = prompt('Enter resolution notes:');
    if (notes) {
      try {
        const response = await apiClient.patch(`/tickets/${ticketId}/resolve`, { resolutionNotes: notes });
        setTickets(tickets.map((t) => (t.id === ticketId ? response.data.data : t)));
      } catch (error) {
        console.error('Error resolving ticket:', error);
      }
    }
  };

  const handleClose = async (ticketId: string) => {
    try {
      const response = await apiClient.patch(`/tickets/${ticketId}/close`, {});
      setTickets(tickets.map((t) => (t.id === ticketId ? response.data.data : t)));
    } catch (error) {
      console.error('Error closing ticket:', error);
    }
  };

  const handleDelete = async (ticketId: string) => {
    try {
      await apiClient.delete(`/tickets/${ticketId}`);
      setTickets(tickets.filter((t) => t.id !== ticketId));
    } catch (error) {
      console.error('Error deleting ticket:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, 'error' | 'warning' | 'info' | 'default' | 'success'> = {
      Critical: 'error',
      High: 'warning',
      Medium: 'info',
      Low: 'default',
    };
    return colors[priority] || 'default';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'error' | 'warning' | 'info' | 'default' | 'success'> = {
      Open: 'default',
      'In Progress': 'info',
      'Pending Customer': 'warning',
      Resolved: 'success',
      Closed: 'default',
    };
    return colors[status] || 'default';
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const ticketDate = new Date(ticket.createdAt);
    const fromDate = fromDateFilter ? new Date(fromDateFilter) : null;
    const toDate = toDateFilter ? new Date(toDateFilter) : null;

    return (
      (ticket.title.toLowerCase().includes(search.toLowerCase()) ||
       ticket.ticketNumber.toLowerCase().includes(search.toLowerCase())) &&
      (!priorityFilter || ticket.priority === priorityFilter) &&
      (!statusFilter || ticket.status === statusFilter) &&
      (!fromDate || ticketDate >= fromDate) &&
      (!toDate || ticketDate <= new Date(toDate.getTime() + 86400000)) // Add 1 day to include entire date
    );
  });

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Support Tickets</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
            <Button variant="contained" onClick={() => handleOpenDialog()}>
              New Ticket
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 2, p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <OutlinedInput
              placeholder="Search by title or ticket #"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              startAdornment={<InputAdornment position="start"><SearchIcon /></InputAdornment>}
              size="small"
              sx={{ minWidth: 250 }}
            />
            <TextField
              select
              label="Priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="">All Priorities</MenuItem>
              <MenuItem value="Critical">Critical</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="Low">Low</MenuItem>
            </TextField>
            <TextField
              select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="Open">Open</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Pending Customer">Pending Customer</MenuItem>
              <MenuItem value="Resolved">Resolved</MenuItem>
              <MenuItem value="Closed">Closed</MenuItem>
            </TextField>
            <TextField
              type="date"
              label="From Date"
              value={fromDateFilter}
              onChange={(e) => setFromDateFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 140 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="date"
              label="To Date"
              value={toDateFilter}
              onChange={(e) => setToDateFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 140 }}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </Card>

        {filteredTickets.length === 0 ? (
          <Card>
            <CardContent>
              <Typography color="textSecondary">No tickets yet</Typography>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ticket #</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell>Assignee</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{ticket.ticketNumber}</TableCell>
                    <TableCell>{ticket.title}{ticket.category && <Typography variant="caption" color="text.secondary" display="block">{ticket.category}</Typography>}</TableCell>
                    <TableCell>{productName(ticket.productId) || '-'}</TableCell>
                    <TableCell>
                      <Chip label={ticket.priority} color={getPriorityColor(ticket.priority)} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={ticket.status} color={getStatusColor(ticket.status)} size="small" />
                    </TableCell>
                    <TableCell>{ticket.account.name}</TableCell>
                    <TableCell>{ticket.assignee?.firstName || 'Unassigned'}</TableCell>
                    <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button size="small" variant="text" onClick={() => handleOpenDialog(ticket)}>
                        Edit
                      </Button>
                      <AssignOwner module="tickets" recordId={ticket.id} currentOwnerId={(ticket as any).assignee?.id} currentAssigneeIds={(ticket as any).assigneeIds} onAssigned={fetchTickets} />
                      {ticket.status !== 'Resolved' && (
                        <Button size="small" variant="text" color="success" onClick={() => handleResolve(ticket.id)}>
                          Resolve
                        </Button>
                      )}
                      {ticket.status === 'Resolved' && (
                        <Button size="small" variant="text" color="info" onClick={() => handleClose(ticket.id)}>
                          Close
                        </Button>
                      )}
                      {(user?.role?.name === 'Admin' || user?.role?.name === 'Manager') && (
                        <Button
                          size="small"
                          variant="text"
                          color="error"
                          onClick={() => {
                            if (window.confirm('Delete this ticket?')) {
                              handleDelete(ticket.id);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
            {['Open', 'In Progress', 'Pending Customer', 'Resolved', 'Closed'].map((status) => {
              const statusTickets = filteredTickets.filter((ticket) => ticket.status === status);
              return (
                <Box
                  key={status}
                  sx={{
                    flex: '0 0 320px',
                    bgcolor: 'action.hover',
                    borderRadius: 2,
                    p: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Chip
                      label={status}
                      color={getStatusColor(status) as any}
                      size="small"
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {statusTickets.length}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {statusTickets.map((ticket) => (
                      <Card
                        key={ticket.id}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { boxShadow: 3 },
                        }}
                        onClick={() => handleOpenDialog(ticket)}
                      >
                        <CardContent sx={{ pb: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                            <Typography sx={{ fontWeight: 600 }} noWrap>
                              {ticket.ticketNumber}
                            </Typography>
                            <Chip label={ticket.priority} color={getPriorityColor(ticket.priority)} size="small" />
                          </Box>
                          <Typography variant="body2" noWrap sx={{ mb: 1 }}>
                            {ticket.title}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" noWrap sx={{ display: 'block', mb: 1 }}>
                            {ticket.account.name}
                          </Typography>
                          <Box sx={{ pt: 1, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="textSecondary">
                              {ticket.assignee?.firstName || 'Unassigned'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {new Date(ticket.createdAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>{selectedTicket ? 'Edit Ticket' : 'New Ticket'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {canSeeIssues && (
              <Tabs value={dialogTab} onChange={(_, v) => setDialogTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="Details" />
                <Tab label="Issues" disabled={!selectedTicket} />
              </Tabs>
            )}
            {canSeeIssues && !selectedTicket && <Alert severity="info" sx={{ mb: 2 }}>Save the ticket first, then open it again to add its issues as a checklist.</Alert>}
            {dialogTab === 1 && selectedTicket ? (
              <TicketIssuesPanel ticketId={selectedTicket.id} ticketStatus={formData.status} onTicketChanged={refreshAfterIssueChange} />
            ) : (
              <>
            <TextField
              fullWidth
              label="Ticket Number"
              value={formData.ticketNumber}
              disabled
              sx={{ mb: 2 }}
              helperText={selectedTicket ? 'Auto-generated' : 'Will be auto-generated'}
            />
            {saveError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError('')}>{saveError}</Alert>}
            <SearchableSelect
              label="Client (type to search)"
              value={formData.accountId}
              onChange={(id) => setFormData({ ...formData, accountId: id || '' })}
              options={clientOptions}
              onSearch={searchClients}
              loading={clientsLoading}
              error={clientsError}
              helperText={clientsError ? 'Could not load clients' : 'The corporate or travel agency this issue is for'}
              required
            />
            <VoiceTextField
              context="ticket_title"
              required
              label="Title"
              value={formData.title}
              onChange={(v) => setFormData({ ...formData, title: v })}
              sx={{ mb: 2 }}
            />
            <VoiceTextField
              context="ticket"
              required
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(v) => setFormData({ ...formData, description: v })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Priority"
              select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              sx={{ mb: 2 }}
            >
              <MenuItem value="Critical">Critical</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="Low">Low</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Status"
              select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              sx={{ mb: 2 }}
            >
              <MenuItem value="Open">Open</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Pending Customer">Pending Customer</MenuItem>
              <MenuItem value="Resolved">Resolved</MenuItem>
              <MenuItem value="Closed">Closed</MenuItem>
            </TextField>
            <TextField
              fullWidth
              select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              sx={{ mb: 2 }}
            >
              <MenuItem value="">Not set</MenuItem>
              {categoryOptions(formData.category).map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField
              fullWidth
              select
              label="Product"
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              helperText={products.length === 0 ? 'No products yet - add them under Masters → Products' : 'Which product this issue is about'}
              sx={{ mb: 2 }}
            >
              <MenuItem value="">Not set</MenuItem>
              {products.map((pr) => <MenuItem key={pr.id} value={pr.id}>{pr.name}</MenuItem>)}
            </TextField>
            <TextField
              fullWidth
              label="SLA Response Hours"
              type="number"
              value={formData.slaResponseHours}
              onChange={(e) => setFormData({ ...formData, slaResponseHours: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="SLA Resolution Hours"
              type="number"
              value={formData.slaResolutionHours}
              onChange={(e) => setFormData({ ...formData, slaResolutionHours: e.target.value })}
            />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>{dialogTab === 1 ? 'Close' : 'Cancel'}</Button>
            {dialogTab === 0 && <Button onClick={handleSave} variant="contained" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>}
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};
