import React from 'react';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import Layout from '@components/Layout';
import DataTable from '@components/DataTable';
import { api } from '@services/api';
import { Account } from '@types/index';

const COLUMNS = [
  { id: 'name', label: 'Account Name' },
  { id: 'industry', label: 'Industry' },
  { id: 'website', label: 'Website' },
  { id: 'type', label: 'Type' },
  { id: 'status', label: 'Status' },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [loading, setLoading] = React.useState(false);
  const [openDialog, setOpenDialog] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    industry: '',
    website: '',
    phoneNumber: '',
    type: 'Prospect',
  });

  const fetchAccounts = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getAccounts(page, pageSize);
      if (response.data.success) {
        setAccounts(response.data.data || []);
        setTotal(response.data.meta?.total || 0);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  React.useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleAddClick = () => {
    setFormData({
      name: '',
      industry: '',
      website: '',
      phoneNumber: '',
      type: 'Prospect',
    });
    setOpenDialog(true);
  };

  const handleCreateAccount = async () => {
    try {
      await api.createAccount(formData);
      setOpenDialog(false);
      fetchAccounts();
    } catch (error) {
      console.error('Error creating account:', error);
    }
  };

  const handleRowClick = (account: Account) => {
    // TODO: Navigate to account detail page
    console.log('Account clicked:', account);
  };

  return (
    <Layout>
      <Box>
        <DataTable
          columns={COLUMNS}
          rows={accounts}
          total={total}
          page={page}
          pageSize={pageSize}
          loading={loading}
          title="Accounts"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onAddClick={handleAddClick}
          onRowClick={handleRowClick}
        />

        {/* Create Account Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Account</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Account Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
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
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateAccount} variant="contained">
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
