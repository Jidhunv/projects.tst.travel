import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import Layout from '@components/Layout';
import { apiClient } from '../services/api';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    entityType: '',
    entityId: '',
    action: '',
    fromDate: '',
    toDate: '',
  });
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const response = await apiClient.get('/audit-logs', { params });
      setLogs(response.data.data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const handleApplyFilters = () => {
    fetchLogs();
  };

  const handleViewDetails = (log: any) => {
    setSelectedLog(log);
    setOpenDialog(true);
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, 'success' | 'info' | 'error' | 'warning' | 'default'> = {
      CREATE: 'success',
      UPDATE: 'info',
      DELETE: 'error',
    };
    return colors[action] || 'default';
  };

  const getModuleName = (entityType: string): string => {
    const moduleNames: Record<string, string> = {
      accounts: 'Accounts',
      leads: 'Leads',
      opportunities: 'Opportunities',
      contacts: 'Contacts',
      invoices: 'Invoices',
      expenses: 'Expenses',
      projects: 'Projects',
      contracts: 'Contracts',
      tickets: 'Tickets',
      products: 'Products',
      suppliers: 'Suppliers',
      categories: 'Categories',
      users: 'Users',
      roles: 'Roles',
      sales_visits: 'Sales Visits',
    };
    return moduleNames[entityType] || entityType.charAt(0).toUpperCase() + entityType.slice(1);
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Audit Logs
        </Typography>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
              <TextField
                size="small"
                label="Entity Type"
                value={filters.entityType}
                onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
              />
              <TextField
                size="small"
                label="Entity ID"
                value={filters.entityId}
                onChange={(e) => setFilters({ ...filters, entityId: e.target.value })}
              />
              <TextField
                size="small"
                label="Action"
                select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="">All</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </TextField>
              <TextField
                size="small"
                label="From Date"
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                size="small"
                label="To Date"
                type="date"
                value={filters.toDate}
                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <Button variant="contained" onClick={handleApplyFilters} sx={{ alignSelf: 'flex-end' }}>
                Apply
              </Button>
            </Box>
          </CardContent>
        </Card>

        {logs.length === 0 ? (
          <Card>
            <CardContent>
              <Typography color="textSecondary">No audit logs found</Typography>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Module</TableCell>
                  <TableCell>Entity ID</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                    <TableCell><strong>{getModuleName(log.entityType)}</strong></TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {log.entityId.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Chip label={log.action} color={getActionColor(log.action)} size="small" />
                    </TableCell>
                    <TableCell>{log.user.email}</TableCell>
                    <TableCell>{log.ipAddress || 'N/A'}</TableCell>
                    <TableCell>
                      <Button size="small" variant="text" onClick={() => handleViewDetails(log)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Audit Log Details</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {selectedLog && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Basic Information
                </Typography>
                <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>Module:</strong> {getModuleName(selectedLog.entityType)} ({selectedLog.entityId})
                  </Typography>
                  <Typography variant="body2">
                    <strong>Action:</strong> {selectedLog.action}
                  </Typography>
                  <Typography variant="body2">
                    <strong>User:</strong> {selectedLog.user.email}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Timestamp:</strong> {new Date(selectedLog.createdAt).toLocaleString()}
                  </Typography>
                </Box>

                {selectedLog.oldValues && (
                  <>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Previous Values
                    </Typography>
                    <Box sx={{ mb: 2, p: 2, bgcolor: '#fff3cd', borderRadius: 1, fontFamily: 'monospace' }}>
                      <pre style={{ margin: 0, fontSize: '0.85rem', overflow: 'auto' }}>
                        {JSON.stringify(selectedLog.oldValues, null, 2)}
                      </pre>
                    </Box>
                  </>
                )}

                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  New Values
                </Typography>
                <Box sx={{ p: 2, bgcolor: '#d4edda', borderRadius: 1, fontFamily: 'monospace' }}>
                  <pre style={{ margin: 0, fontSize: '0.85rem', overflow: 'auto' }}>
                    {JSON.stringify(selectedLog.newValues, null, 2)}
                  </pre>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};
