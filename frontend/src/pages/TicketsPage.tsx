import React, { useState, useEffect } from 'react';
import {
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
import Layout from '@components/Layout';
import AssignOwner from '@components/AssignOwner';
import { apiClient } from '../services/api';
import useAuth from '../hooks/useAuth';

export const TicketsPage: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');
  const [formData, setFormData] = useState({
    ticketNumber: '',
    title: '',
    description: '',
    priority: 'Medium',
    status: 'Open',
    category: '',
    accountId: '',
    slaResponseHours: '',
    slaResolutionHours: '',
  });

  useEffect(() => {
    fetchTickets();
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
        accountId: '',
        slaResponseHours: '',
        slaResolutionHours: '',
      });
    }
    setOpenDialog(true);
  };

  const handleSave = async () => {
    try {
      if (selectedTicket) {
        const response = await apiClient.patch(`/tickets/${selectedTicket.id}`, formData);
        setTickets(tickets.map((t) => (t.id === selectedTicket.id ? response.data.data : t)));
      } else {
        const response = await apiClient.post('/tickets', formData);
        setTickets([...tickets, response.data.data]);
      }
      setOpenDialog(false);
    } catch (error) {
      console.error('Error saving ticket:', error);
    }
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
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Ticket #</TableCell>
                  <TableCell>Title</TableCell>
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
                    <TableCell>{ticket.title}</TableCell>
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
                    bgcolor: '#f5f5f5',
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

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{selectedTicket ? 'Edit Ticket' : 'New Ticket'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Ticket Number"
              value={formData.ticketNumber}
              disabled
              sx={{ mb: 2 }}
              helperText={selectedTicket ? 'Auto-generated' : 'Will be auto-generated'}
            />
            <TextField
              fullWidth
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              sx={{ mb: 2 }}
            />
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
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};
