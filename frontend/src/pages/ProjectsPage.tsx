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
} from '@mui/material';
import Layout from '@components/Layout';
import { apiClient } from '../services/api';
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openMilestoneDialog, setOpenMilestoneDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
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
  });
  const [milestoneData, setMilestoneData] = useState({
    milestoneType: '',
    milestoneName: '',
    completedDate: '',
    remarks: '',
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await apiClient.get('/projects');
      setProjects(response.data.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
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

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Projects</Typography>
        <Button variant="contained" onClick={() => handleOpenDialog()}>
          New Project
        </Button>
      </Box>

      {projects.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="textSecondary">No projects yet</Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {projects.map((project) => (
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
                    <Button size="small" variant="text" color="error" onClick={() => handleDelete(project.id)}>
                      Delete
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
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
