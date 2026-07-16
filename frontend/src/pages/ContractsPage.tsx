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
  const [accounts, setAccounts] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
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
    status: 'Draft',
    accountId: '',
  });

  useEffect(() => {
    fetchContracts();
    fetchAccounts();
  }, []);

  const fetchContracts = async () => {
    try {
      const response = await apiClient.get('/contracts');
      setContracts(response.data.data);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await apiClient.get('/accounts?limit=1000');
      setAccounts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
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
        status: contract.status || 'Draft',
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
        status: 'Draft',
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
            <TableHead>
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
            select
            label="Company"
            value={formData.accountId}
            onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
            disabled={!!selectedContract}
            sx={{ mb: 2 }}
          >
            <MenuItem value="">Select Company</MenuItem>
            {accounts.map((account) => (
              <MenuItem key={account.id} value={account.id}>
                {account.name}
              </MenuItem>
            ))}
          </TextField>
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
          <TextField
            fullWidth
            select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            sx={{ mb: 2 }}
          >
            <MenuItem value="Draft">Draft</MenuItem>
            <MenuItem value="Sent for Approval">Sent for Approval</MenuItem>
            <MenuItem value="Approved">Approved</MenuItem>
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Expired">Expired</MenuItem>
            <MenuItem value="Terminated">Terminated</MenuItem>
          </TextField>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Upload Contract Documents
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                variant="outlined"
                component="label"
              >
                Browse Files
                <input
                  type="file"
                  multiple
                  hidden
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.txt"
                  onChange={(e) => {
                    if (e.target.files) {
                      setUploadedFiles([...uploadedFiles, ...Array.from(e.target.files)]);
                    }
                  }}
                />
              </Button>
              <Typography variant="body2" color="textSecondary">
                {uploadedFiles.length} file(s) selected
              </Typography>
            </Box>
            {uploadedFiles.length > 0 && (
              <Box sx={{ mt: 1 }}>
                {uploadedFiles.map((file, idx) => (
                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 0.5, bgcolor: 'action.hover', borderRadius: 1, mb: 0.5 }}>
                    <Typography variant="caption">{file.name}</Typography>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </Button>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
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
