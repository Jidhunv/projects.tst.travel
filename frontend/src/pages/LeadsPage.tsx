import React from 'react';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import Layout from '@components/Layout';
import DataTable from '@components/DataTable';
import { api } from '@services/api';
import { Lead } from '../types';

const COLUMNS = [
  { id: 'firstName', label: 'First Name' },
  { id: 'lastName', label: 'Last Name' },
  { id: 'email', label: 'Email' },
  { id: 'company', label: 'Company' },
  { id: 'status', label: 'Status' },
  { id: 'source', label: 'Source' },
];

export default function LeadsPage() {
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [loading, setLoading] = React.useState(false);
  const [openDialog, setOpenDialog] = React.useState(false);
  const [formData, setFormData] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phoneNumber: '',
    jobTitle: '',
    source: 'website',
  });

  const fetchLeads = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getLeads(page, pageSize);
      if (response.data.success) {
        setLeads(response.data.data || []);
        setTotal(response.data.meta?.total || 0);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  React.useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleAddClick = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      company: '',
      phoneNumber: '',
      jobTitle: '',
      source: 'website',
    });
    setOpenDialog(true);
  };

  const handleCreateLead = async () => {
    try {
      await api.createLead(formData);
      setOpenDialog(false);
      fetchLeads();
    } catch (error) {
      console.error('Error creating lead:', error);
    }
  };

  const handleRowClick = (lead: Lead) => {
    // TODO: Navigate to lead detail page
    console.log('Lead clicked:', lead);
  };

  return (
    <Layout>
      <Box>
        <DataTable
          columns={COLUMNS}
          rows={leads}
          total={total}
          page={page}
          pageSize={pageSize}
          loading={loading}
          title="Leads"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onAddClick={handleAddClick}
          onRowClick={handleRowClick}
        />

        {/* Create Lead Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Lead</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="First Name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                fullWidth
              />
              <TextField
                label="Phone Number"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                fullWidth
              />
              <TextField
                label="Job Title"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateLead} variant="contained">
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
