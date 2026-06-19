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
  Grid,
  Typography,
} from '@mui/material';
import Layout from '@components/Layout';
import { apiClient } from '../services/api';
import { Contract } from '../types';

export const ContractsPage: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState({
    contractNumber: '',
    title: '',
    type: '',
    value: '',
    startDate: '',
    endDate: '',
    renewalDate: '',
    paymentTerms: '',
    slaTerms: '',
    accountId: '',
  });

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const response = await apiClient.get('/contracts');
      setContracts(response.data.data);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const handleOpenDialog = (contract?: Contract) => {
    if (contract) {
      setSelectedContract(contract);
      setFormData({
        contractNumber: contract.contractNumber,
        title: contract.title,
        type: contract.type,
        value: contract.value.toString(),
        startDate: contract.startDate.toString().split('T')[0],
        endDate: contract.endDate.toString().split('T')[0],
        renewalDate: contract.renewalDate?.toString().split('T')[0] || '',
        paymentTerms: contract.paymentTerms || '',
        slaTerms: contract.slaTerms || '',
        accountId: contract.account.id,
      });
    } else {
      setSelectedContract(null);
      setFormData({
        contractNumber: '',
        title: '',
        type: '',
        value: '',
        startDate: '',
        endDate: '',
        renewalDate: '',
        paymentTerms: '',
        slaTerms: '',
        accountId: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedContract(null);
  };

  const handleSave = async () => {
    try {
      if (selectedContract) {
        const response = await apiClient.patch(`/contracts/${selectedContract.id}`, formData);
        setContracts(
          contracts.map((c) => (c.id === selectedContract.id ? response.data.data : c))
        );
      } else {
        const response = await apiClient.post('/contracts', formData);
        setContracts([...contracts, response.data.data]);
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving contract:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      try {
        await apiClient.delete(`/contracts/${id}`);
        setContracts(contracts.filter((c) => c.id !== id));
      } catch (error) {
        console.error('Error deleting contract:', error);
      }
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await apiClient.patch(`/contracts/${id}/approve`, {
        approvedBy: 'current-user-id',
      });
      setContracts(contracts.map((c) => (c.id === id ? response.data.data : c)));
    } catch (error) {
      console.error('Error approving contract:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'success' | 'warning' | 'error' | 'default' | 'primary' | 'info'> = {
      Draft: 'default',
      'Sent for Approval': 'warning',
      Approved: 'success',
      Active: 'primary',
      Expired: 'error',
      Terminated: 'error',
    };
    return colors[status] || 'default';
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Contracts</Typography>
        <Button variant="contained" onClick={() => handleOpenDialog()}>
          New Contract
        </Button>
      </Box>

      {contracts.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="textSecondary">No contracts yet</Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Contract Number</TableCell>
                <TableCell>Title</TableCell>
                <TableCell align="right">Value</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{contract.contractNumber}</TableCell>
                  <TableCell>{contract.title}</TableCell>
                  <TableCell align="right">${contract.value.toLocaleString()}</TableCell>
                  <TableCell>{contract.account.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={contract.status}
                      color={getStatusColor(contract.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(contract.startDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => handleOpenDialog(contract)}
                    >
                      Edit
                    </Button>
                    {contract.status === 'Sent for Approval' && (
                      <Button
                        size="small"
                        variant="text"
                        color="success"
                        onClick={() => handleApprove(contract.id)}
                      >
                        Approve
                      </Button>
                    )}
                    <Button
                      size="small"
                      variant="text"
                      color="error"
                      onClick={() => handleDelete(contract.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedContract ? 'Edit Contract' : 'New Contract'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Contract Number"
            value={formData.contractNumber}
            onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
            disabled={!!selectedContract}
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
            label="Type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Value"
            type="number"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="End Date"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Renewal Date"
            type="date"
            value={formData.renewalDate}
            onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Payment Terms"
            value={formData.paymentTerms}
            onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="SLA Terms"
            value={formData.slaTerms}
            onChange={(e) => setFormData({ ...formData, slaTerms: e.target.value })}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Layout>
  );
};
