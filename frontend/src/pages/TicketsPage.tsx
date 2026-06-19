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
} from '@mui/material';
import Layout from '@components/Layout';
import { apiClient } from '../services/api';

export const TicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [formData, setFormData] = useState({
    ticketNumber: '',
    title: '',
    description: '',
    priority: 'Medium',
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

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Support Tickets</Typography>
          <Button variant="contained" onClick={() => handleOpenDialog()}>
            New Ticket
          </Button>
        </Box>

        {tickets.length === 0 ? (
          <Card>
            <CardContent>
              <Typography color="textSecondary">No tickets yet</Typography>
            </CardContent>
          </Card>
        ) : (
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
                {tickets.map((ticket) => (
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{selectedTicket ? 'Edit Ticket' : 'New Ticket'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Ticket Number"
              value={formData.ticketNumber}
              onChange={(e) => setFormData({ ...formData, ticketNumber: e.target.value })}
              disabled={!!selectedTicket}
              sx={{ mb: 2 }}
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
