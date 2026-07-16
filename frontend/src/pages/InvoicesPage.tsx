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
  Tab,
  Tabs,
} from '@mui/material';
import Layout from '@components/Layout';
import { apiClient } from '../services/api';
import { Invoice, Payment } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

export const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    amount: '',
    tax: '',
    invoiceDate: '',
    dueDate: '',
    billingCycle: 'Monthly',
    description: '',
    contractId: '',
    accountId: '',
    projectId: '',
  });
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentDate: '',
    paymentMethod: 'Bank Transfer',
    transactionReference: '',
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await apiClient.get('/invoices');
      setInvoices(response.data.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const handleOpenDialog = (invoice?: Invoice) => {
    if (invoice) {
      setSelectedInvoice(invoice);
      setFormData({
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount.toString(),
        tax: (invoice.tax || 0).toString(),
        invoiceDate: invoice.invoiceDate.toString().split('T')[0],
        dueDate: invoice.dueDate.toString().split('T')[0],
        billingCycle: invoice.billingCycle || 'Monthly',
        description: invoice.description || '',
        contractId: invoice.contract.id,
        accountId: invoice.account.id,
        projectId: invoice.project?.id || '',
      });
    } else {
      setSelectedInvoice(null);
      setFormData({
        invoiceNumber: '',
        amount: '',
        tax: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        billingCycle: 'Monthly',
        description: '',
        contractId: '',
        accountId: '',
        projectId: '',
      });
    }
    setTabValue(0);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedInvoice(null);
  };

  const handleSave = async () => {
    try {
      if (selectedInvoice) {
        const response = await apiClient.patch(`/invoices/${selectedInvoice.id}`, formData);
        setInvoices(invoices.map((i) => (i.id === selectedInvoice.id ? response.data.data : i)));
      } else {
        const response = await apiClient.post('/invoices', formData);
        setInvoices([...invoices, response.data.data]);
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving invoice:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      try {
        await apiClient.delete(`/invoices/${id}`);
        setInvoices(invoices.filter((i) => i.id !== id));
      } catch (error) {
        console.error('Error deleting invoice:', error);
      }
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;
    try {
      const response = await apiClient.post(`/invoices/${selectedInvoice.id}/payments`, paymentData);
      const updatedInvoice = {
        ...selectedInvoice,
        payments: [...(selectedInvoice.payments || []), response.data.data],
      };
      setSelectedInvoice(updatedInvoice);
      setInvoices(invoices.map((i) => (i.id === selectedInvoice.id ? updatedInvoice : i)));
      setPaymentData({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Bank Transfer',
        transactionReference: '',
      });
      setOpenPaymentDialog(false);
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'success' | 'warning' | 'error' | 'default' | 'primary' | 'info'> = {
      Draft: 'default',
      Sent: 'primary',
      'Partially Paid': 'warning',
      Paid: 'success',
      Overdue: 'error',
      Cancelled: 'error',
    };
    return colors[status] || 'default';
  };

  const totalBilled = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalPaid = invoices.reduce((sum, i) => sum + i.payments.reduce((pSum, p) => pSum + p.amount, 0), 0);
  const totalOutstanding = totalBilled - totalPaid;

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Invoices</Typography>
        <Button variant="contained" onClick={() => handleOpenDialog()}>
          New Invoice
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Billed
              </Typography>
              <Typography variant="h6">${totalBilled.toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Paid
              </Typography>
              <Typography variant="h6" sx={{ color: 'green' }}>
                ${totalPaid.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Outstanding
              </Typography>
              <Typography variant="h6" sx={{ color: 'orange' }}>
                ${totalOutstanding.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {invoices.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="textSecondary">No invoices yet</Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Invoice Number</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{invoice.invoiceNumber}</TableCell>
                  <TableCell align="right">${invoice.amount.toLocaleString()}</TableCell>
                  <TableCell align="right">${invoice.totalAmount.toLocaleString()}</TableCell>
                  <TableCell>{invoice.account.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={invoice.status}
                      color={getStatusColor(invoice.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => handleOpenDialog(invoice)}
                    >
                      Edit
                    </Button>
                    {invoice.status !== 'Paid' && (
                      <Button
                        size="small"
                        variant="text"
                        color="success"
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setOpenPaymentDialog(true);
                        }}
                      >
                        Payment
                      </Button>
                    )}
                    <Button
                      size="small"
                      variant="text"
                      color="error"
                      onClick={() => handleDelete(invoice.id)}
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
        <DialogTitle>{selectedInvoice ? 'Edit Invoice' : 'New Invoice'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Tabs value={tabValue} onChange={(_, val) => setTabValue(val)}>
            <Tab label="Invoice Info" />
            {selectedInvoice && <Tab label="Payments" />}
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <TextField
              fullWidth
              label="Invoice Number"
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              disabled={!!selectedInvoice}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Tax"
              type="number"
              value={formData.tax}
              onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Invoice Date"
              type="date"
              value={formData.invoiceDate}
              onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Due Date"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Billing Cycle"
              select
              value={formData.billingCycle}
              onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
              sx={{ mb: 2 }}
            >
              <MenuItem value="Monthly">Monthly</MenuItem>
              <MenuItem value="Quarterly">Quarterly</MenuItem>
              <MenuItem value="Semi-Annual">Semi-Annual</MenuItem>
              <MenuItem value="Annual">Annual</MenuItem>
              <MenuItem value="Milestone-Based">Milestone-Based</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle2">Payments</Typography>
                <Button size="small" variant="contained" onClick={() => setOpenPaymentDialog(true)}>
                  Add Payment
                </Button>
              </Box>
              {!selectedInvoice || selectedInvoice.payments.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  No payments recorded
                </Typography>
              ) : (
                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {selectedInvoice.payments.map((payment) => (
                    <Card key={payment.id} sx={{ mb: 1, p: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            ${payment.amount.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {new Date(payment.paymentDate).toLocaleDateString()} - {payment.paymentMethod}
                          </Typography>
                        </Box>
                      </Box>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openPaymentDialog}
        onClose={() => setOpenPaymentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Amount"
            type="number"
            value={paymentData.amount}
            onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Payment Date"
            type="date"
            value={paymentData.paymentDate}
            onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Payment Method"
            select
            value={paymentData.paymentMethod}
            onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
            sx={{ mb: 2 }}
          >
            <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
            <MenuItem value="Check">Check</MenuItem>
            <MenuItem value="Credit Card">Credit Card</MenuItem>
            <MenuItem value="Wire Transfer">Wire Transfer</MenuItem>
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label="Transaction Reference"
            value={paymentData.transactionReference}
            onChange={(e) => setPaymentData({ ...paymentData, transactionReference: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPaymentDialog(false)}>Cancel</Button>
          <Button onClick={handleRecordPayment} variant="contained">
            Record
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Layout>
  );
};
