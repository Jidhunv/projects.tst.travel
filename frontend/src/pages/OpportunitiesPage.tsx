import React from 'react';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import Layout from '@components/Layout';
import DataTable from '@components/DataTable';
import { api } from '@services/api';
import { Opportunity } from '@types/index';

const COLUMNS = [
  { id: 'name', label: 'Opportunity Name' },
  { id: 'amount', label: 'Amount', format: (v: number) => `$${v?.toLocaleString() || 0}` },
  { id: 'stage', label: 'Stage' },
  { id: 'status', label: 'Status' },
  { id: 'forecastedCloseDate', label: 'Close Date', format: (v: string) => new Date(v).toLocaleDateString() },
];

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = React.useState<Opportunity[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [loading, setLoading] = React.useState(false);
  const [openDialog, setOpenDialog] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    amount: '',
    accountId: '',
    stage: 'Prospecting',
    forecastedCloseDate: '',
  });

  const fetchOpportunities = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getOpportunities(page, pageSize);
      if (response.data.success) {
        setOpportunities(response.data.data || []);
        setTotal(response.data.meta?.total || 0);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  React.useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const handleAddClick = () => {
    setFormData({
      name: '',
      amount: '',
      accountId: '',
      stage: 'Prospecting',
      forecastedCloseDate: '',
    });
    setOpenDialog(true);
  };

  const handleCreateOpportunity = async () => {
    try {
      await api.createOpportunity({
        ...formData,
        amount: parseFloat(formData.amount),
        forecastedCloseDate: new Date(formData.forecastedCloseDate),
      });
      setOpenDialog(false);
      fetchOpportunities();
    } catch (error) {
      console.error('Error creating opportunity:', error);
    }
  };

  const handleRowClick = (opportunity: Opportunity) => {
    // TODO: Navigate to opportunity detail page
    console.log('Opportunity clicked:', opportunity);
  };

  return (
    <Layout>
      <Box>
        <DataTable
          columns={COLUMNS}
          rows={opportunities}
          total={total}
          page={page}
          pageSize={pageSize}
          loading={loading}
          title="Opportunities"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onAddClick={handleAddClick}
          onRowClick={handleRowClick}
        />

        {/* Create Opportunity Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Opportunity</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Opportunity Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Account ID"
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Stage"
                select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                fullWidth
                SelectProps={{
                  native: true,
                }}
              >
                <option value="Prospecting">Prospecting</option>
                <option value="Qualification">Qualification</option>
                <option value="Proposal">Proposal</option>
                <option value="Negotiation">Negotiation</option>
              </TextField>
              <TextField
                label="Close Date"
                type="date"
                value={formData.forecastedCloseDate}
                onChange={(e) => setFormData({ ...formData, forecastedCloseDate: e.target.value })}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateOpportunity} variant="contained">
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
