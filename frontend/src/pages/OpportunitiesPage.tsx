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
import AssignOwner from '@components/AssignOwner';
import { apiClient } from '../services/api';
import { Opportunity } from '../types';
import { formatCurrency } from '@utils/format';

const stageColor: Record<string, 'info' | 'primary' | 'success' | 'error' | 'warning'> = {
  Prospecting: 'info',
  Qualification: 'info',
  Proposal: 'primary',
  Negotiation: 'warning',
  'Closed-Won': 'success',
  'Closed-Lost': 'error',
};

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Filters
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [amountFromFilter, setAmountFromFilter] = useState('');
  const [amountToFilter, setAmountToFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  // Dialogs
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState<Opportunity | null>(null);
  const [openCloseWon, setOpenCloseWon] = useState<Opportunity | null>(null);
  const [openCloseLost, setOpenCloseLost] = useState<Opportunity | null>(null);

  const [form, setForm] = useState({
    name: '',
    amount: '',
    stage: '',
    probability: '',
    forecastedCloseDate: '',
    description: '',
  });

  const [lostReason, setLostReason] = useState('');

  const fetchOpportunities = React.useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: pageSize };
      if (search) params.search = search;
      if (stageFilter) params.stage = stageFilter;
      if (amountFromFilter) params.amountFrom = amountFromFilter;
      if (amountToFilter) params.amountTo = amountToFilter;
      if (dateFromFilter) params.fromDate = dateFromFilter;
      if (dateToFilter) params.toDate = dateToFilter;

      const response = await apiClient.get('/opportunities', { params });
      setOpportunities(response.data.data || []);
      setTotal(response.data.meta?.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, stageFilter, amountFromFilter, amountToFilter, dateFromFilter, dateToFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, stageFilter, amountFromFilter, amountToFilter, dateFromFilter, dateToFilter]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const handleCreate = async () => {
    try {
      await apiClient.post('/opportunities', {
        name: form.name,
        amount: form.amount ? Number(form.amount) : 0,
        stage: form.stage,
        probability: form.probability ? Number(form.probability) : 0,
        forecastedCloseDate: form.forecastedCloseDate || undefined,
        description: form.description,
      });
      setOpenCreate(false);
      setForm({
        name: '',
        amount: '',
        stage: '',
        probability: '',
        forecastedCloseDate: '',
        description: '',
      });
      fetchOpportunities();
    } catch (error) {
      console.error('Error creating opportunity:', error);
    }
  };

  const handleUpdate = async () => {
    if (!openEdit) return;
    try {
      // Keep status in sync when a closing stage is chosen from the dropdown.
      const status =
        form.stage === 'Closed-Won' ? 'Won' :
        form.stage === 'Closed-Lost' ? 'Lost' : 'Open';
      await apiClient.patch(`/opportunities/${openEdit.id}`, {
        name: form.name,
        amount: form.amount ? Number(form.amount) : 0,
        stage: form.stage,
        status,
        probability: form.stage === 'Closed-Won' ? 100 : (form.probability ? Number(form.probability) : 0),
        forecastedCloseDate: form.forecastedCloseDate || undefined,
        description: form.description,
      });
      setOpenEdit(null);
      fetchOpportunities();
    } catch (error) {
      console.error('Error updating opportunity:', error);
    }
  };

  const handleDelete = async (opportunityId: string) => {
    if (window.confirm('Are you sure you want to delete this opportunity?')) {
      try {
        await apiClient.delete(`/opportunities/${opportunityId}`);
        fetchOpportunities();
      } catch (error) {
        console.error('Error deleting opportunity:', error);
      }
    }
  };

  const handleCloseWon = async () => {
    if (!openCloseWon) return;
    try {
      await apiClient.patch(`/opportunities/${openCloseWon.id}`, {
        status: 'Won',
        stage: 'Closed-Won',
        probability: 100,
      });
      setOpenCloseWon(null);
      fetchOpportunities();
    } catch (error) {
      console.error('Error closing opportunity as won:', error);
    }
  };

  const handleCloseLost = async () => {
    if (!openCloseLost) return;
    try {
      await apiClient.patch(`/opportunities/${openCloseLost.id}`, {
        status: 'Lost',
        stage: 'Closed-Lost',
        probability: 0,
        closedReason: lostReason,
      });
      setOpenCloseLost(null);
      setLostReason('');
      fetchOpportunities();
    } catch (error) {
      console.error('Error closing opportunity as lost:', error);
    }
  };

  const handleOpenEdit = (opportunity: Opportunity) => {
    setOpenEdit(opportunity);
    setForm({
      name: opportunity.name,
      amount: opportunity.amount.toString(),
      stage: opportunity.stage,
      probability: opportunity.probability.toString(),
      forecastedCloseDate: opportunity.forecastedCloseDate ? opportunity.forecastedCloseDate.toString().split('T')[0] : '',
      description: opportunity.description || '',
    });
  };

  const handleOpenCreate = () => {
    setOpenCreate(true);
    setForm({
      name: '',
      amount: '',
      stage: 'Prospecting',
      probability: '',
      forecastedCloseDate: '',
      description: '',
    });
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">
            Opportunities Management
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button variant="contained" onClick={handleOpenCreate}>
              Add Opportunity
            </Button>
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
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <OutlinedInput
                  fullWidth
                  placeholder="Search opportunities..."
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
                  label="Stage"
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  size="small"
                >
                  <MenuItem value="">All Stages</MenuItem>
                  <MenuItem value="Prospecting">Prospecting</MenuItem>
                  <MenuItem value="Qualification">Qualification</MenuItem>
                  <MenuItem value="Proposal">Proposal</MenuItem>
                  <MenuItem value="Negotiation">Negotiation</MenuItem>
                  <MenuItem value="Closed-Won">Closed-Won</MenuItem>
                  <MenuItem value="Closed-Lost">Closed-Lost</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Amount From"
                  type="number"
                  value={amountFromFilter}
                  onChange={(e) => setAmountFromFilter(e.target.value)}
                  size="small"
                  inputProps={{ step: '1000' }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Amount To"
                  type="number"
                  value={amountToFilter}
                  onChange={(e) => setAmountToFilter(e.target.value)}
                  size="small"
                  inputProps={{ step: '1000' }}
                />
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
              <TableHead>
                <TableRow>
                  <TableCell>Opportunity Name</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Stage</TableCell>
                  <TableCell>Probability</TableCell>
                  <TableCell>Close Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {opportunities.map((opp) => (
                  <TableRow key={opp.id}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{opp.name}</TableCell>
                    <TableCell align="right">{formatCurrency(opp.amount)}</TableCell>
                    <TableCell>
                      <Chip label={opp.stage} color={stageColor[opp.stage] || 'default'} size="small" />
                    </TableCell>
                    <TableCell>{opp.probability}%</TableCell>
                    <TableCell>{new Date(opp.forecastedCloseDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button size="small" variant="text" onClick={() => handleOpenEdit(opp)}>
                        Edit
                      </Button>
                      <AssignOwner module="opportunities" recordId={opp.id} currentOwnerId={(opp as any).ownerId} currentAssigneeIds={(opp as any).assigneeIds} onAssigned={fetchOpportunities} />
                      <Button size="small" variant="text" color="error" onClick={() => handleDelete(opp.id)}>
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
            {['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed-Won', 'Closed-Lost'].map((stage) => {
              const stageOpps = opportunities.filter((opp) => opp.stage === stage);
              const isClosed = stage.startsWith('Closed-');
              const bgColor = stage === 'Closed-Won' ? '#e8f5e9' : stage === 'Closed-Lost' ? '#ffebee' : '#f5f5f5';

              return (
                <Box
                  key={stage}
                  sx={{
                    flex: '0 0 300px',
                    bgcolor: bgColor,
                    borderRadius: 2,
                    p: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Chip
                      label={stage}
                      color={stageColor[stage] || 'default'}
                      size="small"
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {stageOpps.length}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {stageOpps.map((opp) => (
                      <Card
                        key={opp.id}
                        sx={{
                          cursor: 'pointer',
                          opacity: isClosed ? 0.85 : 1,
                          '&:hover': { boxShadow: 3 },
                        }}
                        onClick={() => handleOpenEdit(opp)}
                      >
                        <CardContent sx={{ pb: 1 }}>
                          <Typography sx={{ fontWeight: 600, mb: 1 }} noWrap>
                            {opp.name}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" color="textSecondary">
                              Amount
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatCurrency(opp.amount)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: isClosed ? 1 : 0 }}>
                            <Typography variant="body2" color="textSecondary">
                              Probability
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {opp.probability}%
                            </Typography>
                          </Box>
                          {isClosed && (
                            <Box sx={{ pt: 1, borderTop: '1px solid #eee' }}>
                              {(opp as any).closedAt && (
                                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                                  Closed: {new Date((opp as any).closedAt).toLocaleDateString()}
                                </Typography>
                              )}
                              {(opp as any).closedReason && (
                                <Typography variant="caption" color="textSecondary">
                                  Reason: {(opp as any).closedReason}
                                </Typography>
                              )}
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
          <DialogTitle>{openEdit ? 'Edit Opportunity' : 'Add New Opportunity'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Opportunity Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              select
              label="Stage"
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value })}
              sx={{ mb: 2 }}
            >
              <MenuItem value="Prospecting">Prospecting</MenuItem>
              <MenuItem value="Qualification">Qualification</MenuItem>
              <MenuItem value="Proposal">Proposal</MenuItem>
              <MenuItem value="Negotiation">Negotiation</MenuItem>
              <MenuItem value="Closed-Won">Closed-Won</MenuItem>
              <MenuItem value="Closed-Lost">Closed-Lost</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Probability (%)"
              type="number"
              value={form.probability}
              onChange={(e) => setForm({ ...form, probability: e.target.value })}
              sx={{ mb: 2 }}
              inputProps={{ min: 0, max: 100 }}
            />
            <TextField
              fullWidth
              label="Expected Close Date"
              type="date"
              value={form.forecastedCloseDate}
              onChange={(e) => setForm({ ...form, forecastedCloseDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setOpenCreate(false); setOpenEdit(null); }}>Cancel</Button>
            <Button onClick={openEdit ? handleUpdate : handleCreate} variant="contained">
              {openEdit ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Close Won Dialog */}
        <Dialog open={!!openCloseWon} onClose={() => setOpenCloseWon(null)} maxWidth="sm" fullWidth>
          <DialogTitle>Mark Opportunity as Won</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography>
              Are you sure you want to mark <strong>{openCloseWon?.name}</strong> as Won?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCloseWon(null)}>Cancel</Button>
            <Button onClick={handleCloseWon} variant="contained" color="success">
              Confirm Won
            </Button>
          </DialogActions>
        </Dialog>

        {/* Close Lost Dialog */}
        <Dialog open={!!openCloseLost} onClose={() => setOpenCloseLost(null)} maxWidth="sm" fullWidth>
          <DialogTitle>Mark Opportunity as Lost</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography sx={{ mb: 2 }}>
              Reason for losing <strong>{openCloseLost?.name}</strong>:
            </Typography>
            <TextField
              fullWidth
              label="Reason"
              multiline
              rows={4}
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="Enter reason why this opportunity was lost..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setOpenCloseLost(null); setLostReason(''); }}>Cancel</Button>
            <Button onClick={handleCloseLost} variant="contained" color="error">
              Mark Lost
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
