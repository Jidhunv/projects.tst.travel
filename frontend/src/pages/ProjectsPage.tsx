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
  LinearProgress,
  Typography,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  OutlinedInput,
  InputAdornment,
} from '@mui/material';
import { ViewAgendaOutlined as ListIcon, ViewWeekOutlined as KanbanIcon, Search as SearchIcon } from '@mui/icons-material';
import Layout from '@components/Layout';
import { apiClient } from '../services/api';
import useAuth from '../hooks/useAuth';
import { Project, ProjectMilestone } from '../types';

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

export const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openMilestoneDialog, setOpenMilestoneDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [viewMode, setViewMode] = useState<'card' | 'list' | 'kanban'>('card');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');
  const [formData, setFormData] = useState({
    projectName: '',
    status: 'Planning',
    startDate: '',
    endDate: '',
    goLiveDate: '',
    budget: '',
    revenue: '',
    progressPercent: '',
    contractId: '',
    accountId: '',
    productIds: [] as string[],
  });
  const [milestoneData, setMilestoneData] = useState({
    milestoneType: '',
    milestoneName: '',
    completedDate: '',
    remarks: '',
  });

  useEffect(() => {
    fetchProjects();
    fetchAccounts();
    fetchProducts();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await apiClient.get('/projects');
      setProjects(response.data.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await apiClient.get('/accounts');
      setAccounts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchMilestones = async (projectId: string) => {
    try {
      const response = await apiClient.get(`/projects/${projectId}/milestones`);
      setMilestones(response.data.data);
    } catch (error) {
      console.error('Error fetching milestones:', error);
    }
  };

  const handleOpenDialog = (project?: Project) => {
    if (project) {
      setSelectedProject(project);
      setFormData({
        projectName: project.projectName,
        status: project.status,
        startDate: project.startDate.toString().split('T')[0],
        endDate: project.endDate?.toString().split('T')[0] || '',
        goLiveDate: project.goLiveDate?.toString().split('T')[0] || '',
        budget: project.budget.toString(),
        revenue: project.revenue.toString(),
        progressPercent: project.progressPercent.toString(),
        contractId: project.contract.id,
        accountId: project.account.id,
        productIds: [],
      });
      fetchMilestones(project.id);
    } else {
      setSelectedProject(null);
      setFormData({
        projectName: '',
        status: 'Planning',
        startDate: '',
        endDate: '',
        goLiveDate: '',
        budget: '',
        revenue: '',
        progressPercent: '',
        contractId: '',
        accountId: '',
        productIds: [],
      });
    }
    setTabValue(0);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedProject(null);
  };

  const handleSave = async () => {
    try {
      if (selectedProject) {
        const response = await apiClient.patch(`/projects/${selectedProject.id}`, formData);
        setProjects(projects.map((p) => (p.id === selectedProject.id ? response.data.data : p)));
      } else {
        const response = await apiClient.post('/projects', formData);
        setProjects([...projects, response.data.data]);
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      try {
        await apiClient.delete(`/projects/${id}`);
        setProjects(projects.filter((p) => p.id !== id));
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  const handleAddMilestone = async () => {
    if (!selectedProject) return;
    try {
      const response = await apiClient.post(`/projects/${selectedProject.id}/milestones`, milestoneData);
      setMilestones([...milestones, response.data.data]);
      setMilestoneData({
        milestoneType: '',
        milestoneName: '',
        completedDate: '',
        remarks: '',
      });
      setOpenMilestoneDialog(false);
    } catch (error) {
      console.error('Error adding milestone:', error);
    }
  };

  const handleApproveMilestone = async (milestoneId: string) => {
    try {
      const response = await apiClient.patch(`/projects/milestones/${milestoneId}/approve`, {
        approvedBy: 'current-user-id',
      });
      setMilestones(
        milestones.map((m) => (m.id === milestoneId ? response.data.data : m))
      );
    } catch (error) {
      console.error('Error approving milestone:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'success' | 'warning' | 'error' | 'default' | 'primary' | 'info'> = {
      Planning: 'default',
      'In Progress': 'primary',
      UAT: 'warning',
      Deployed: 'success',
      'On Hold': 'error',
      Closed: 'default',
    };
    return colors[status] || 'default';
  };

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const projectDate = new Date(project.startDate);
    const fromDate = fromDateFilter ? new Date(fromDateFilter) : null;
    const toDate = toDateFilter ? new Date(toDateFilter) : null;

    return (
      project.projectName.toLowerCase().includes(search.toLowerCase()) &&
      (!statusFilter || project.status === statusFilter) &&
      (!fromDate || projectDate >= fromDate) &&
      (!toDate || projectDate <= new Date(toDate.getTime() + 86400000))
    );
  });

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Projects</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newMode) => {
                if (newMode !== null) setViewMode(newMode);
              }}
              size="small"
            >
              <ToggleButton value="card" aria-label="card view">
                <ListIcon sx={{ mr: 0.5 }} />
                Cards
              </ToggleButton>
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
              New Project
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 2, p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <OutlinedInput
              placeholder="Search by project name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              startAdornment={<InputAdornment position="start"><SearchIcon /></InputAdornment>}
              size="small"
              sx={{ minWidth: 250 }}
            />
            <TextField
              select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="Planning">Planning</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="On Hold">On Hold</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
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

        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent>
              <Typography color="textSecondary">No projects yet</Typography>
            </CardContent>
          </Card>
        ) : viewMode === 'card' ? (
          <Grid container spacing={2}>
          {filteredProjects.map((project) => (
            <Grid item xs={12} md={6} key={project.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6">{project.projectName}</Typography>
                    <Chip label={project.status} color={getStatusColor(project.status)} size="small" />
                  </Box>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    {project.account.name} | Budget: ${project.budget.toLocaleString()}
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Progress</Typography>
                      <Typography variant="body2">{project.progressPercent}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={project.progressPercent} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="text" onClick={() => handleOpenDialog(project)}>
                      Edit
                    </Button>
                    {(user?.role?.name === 'Admin' || user?.role?.name === 'Manager') && (
                      <Button size="small" variant="text" color="error" onClick={() => handleDelete(project.id)}>
                        Delete
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          </Grid>
        ) : viewMode === 'list' ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Project Name</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Budget</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Start Date</TableCell>
                  <TableCell>End Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{project.projectName}</TableCell>
                    <TableCell>{project.account.name}</TableCell>
                    <TableCell>
                      <Chip label={project.status} color={getStatusColor(project.status)} size="small" />
                    </TableCell>
                    <TableCell>${project.budget.toLocaleString()}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={project.progressPercent} sx={{ flex: 1, minWidth: 100 }} />
                        <Typography variant="body2">{project.progressPercent}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{new Date(project.startDate).toLocaleDateString()}</TableCell>
                    <TableCell>{project.endDate ? new Date(project.endDate).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>
                      <Button size="small" variant="text" onClick={() => handleOpenDialog(project)}>
                        Edit
                      </Button>
                      {(user?.role?.name === 'Admin' || user?.role?.name === 'Manager') && (
                        <Button size="small" variant="text" color="error" onClick={() => handleDelete(project.id)}>
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
            {['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'].map((status) => {
              const statusProjects = filteredProjects.filter((project) => project.status === status);
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
                      {statusProjects.length}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {statusProjects.map((project) => (
                      <Card
                        key={project.id}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { boxShadow: 3 },
                        }}
                        onClick={() => handleOpenDialog(project)}
                      >
                        <CardContent sx={{ pb: 1 }}>
                          <Typography sx={{ fontWeight: 600, mb: 1 }} noWrap>
                            {project.projectName}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" noWrap sx={{ mb: 1 }}>
                            {project.account.name}
                          </Typography>
                          <Box sx={{ mb: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" color="textSecondary">
                                Progress
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                {project.progressPercent}%
                              </Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={project.progressPercent} sx={{ height: 6, borderRadius: 1 }} />
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px solid #eee' }}>
                            <Typography variant="caption" color="textSecondary">
                              Budget
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                              ${project.budget.toLocaleString()}
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

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedProject ? 'Edit Project' : 'New Project'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Tabs value={tabValue} onChange={(_, val) => setTabValue(val)}>
            <Tab label="Project Info" />
            {selectedProject && <Tab label="Milestones" />}
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <TextField
              fullWidth
              label="Project Name"
              value={formData.projectName}
              onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Status"
              select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              sx={{ mb: 2 }}
            >
              <MenuItem value="Planning">Planning</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="UAT">UAT</MenuItem>
              <MenuItem value="Deployed">Deployed</MenuItem>
              <MenuItem value="On Hold">On Hold</MenuItem>
              <MenuItem value="Closed">Closed</MenuItem>
            </TextField>
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
              label="Budget"
              type="number"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Progress %"
              type="number"
              value={formData.progressPercent}
              onChange={(e) => setFormData({ ...formData, progressPercent: e.target.value })}
              sx={{ mb: 2 }}
              inputProps={{ min: 0, max: 100 }}
            />
            <TextField
              fullWidth
              select
              label="Company"
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
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
              select
              label="Products"
              value={formData.productIds}
              onChange={(e) => setFormData({ ...formData, productIds: typeof e.target.value === 'string' ? [e.target.value] : e.target.value })}
              SelectProps={{ multiple: true }}
              sx={{ mb: 2 }}
            >
              {products.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.name}
                </MenuItem>
              ))}
            </TextField>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle2">Milestones</Typography>
                <Button size="small" variant="contained" onClick={() => setOpenMilestoneDialog(true)}>
                  Add
                </Button>
              </Box>
              {milestones.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  No milestones
                </Typography>
              ) : (
                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {milestones.map((m) => (
                    <Card key={m.id} sx={{ mb: 1, p: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {m.milestoneName}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {m.milestoneType}
                          </Typography>
                        </Box>
                        {m.approvalStatus === 'Pending' && (
                          <Button
                            size="small"
                            variant="text"
                            color="success"
                            onClick={() => handleApproveMilestone(m.id)}
                          >
                            Approve
                          </Button>
                        )}
                        <Chip label={m.approvalStatus} size="small" />
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
        open={openMilestoneDialog}
        onClose={() => setOpenMilestoneDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Milestone</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Milestone Type"
            value={milestoneData.milestoneType}
            onChange={(e) => setMilestoneData({ ...milestoneData, milestoneType: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Milestone Name"
            value={milestoneData.milestoneName}
            onChange={(e) => setMilestoneData({ ...milestoneData, milestoneName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Completed Date"
            type="date"
            value={milestoneData.completedDate}
            onChange={(e) => setMilestoneData({ ...milestoneData, completedDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Remarks"
            multiline
            rows={3}
            value={milestoneData.remarks}
            onChange={(e) => setMilestoneData({ ...milestoneData, remarks: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMilestoneDialog(false)}>Cancel</Button>
          <Button onClick={handleAddMilestone} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Layout>
  );
};
