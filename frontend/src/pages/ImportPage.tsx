import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  AlertTitle,
  Select,
  MenuItem,
  TextField,
  Chip,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Typography,
  Grid,
} from '@mui/material';
import Layout from '@components/Layout';
import { apiClient } from '../services/api';

const MIDT_FIELDS = [
  { field: 'name', label: 'Company Name', required: true },
  { field: 'industry', label: 'Industry', required: false },
  { field: 'website', label: 'Website', required: false },
  { field: 'phoneNumber', label: 'Phone Number', required: false },
  { field: 'email', label: 'Email', required: false },
  { field: 'contactPerson', label: 'Contact Person', required: false },
  { field: 'city', label: 'City', required: false },
  { field: 'region', label: 'Region', required: false },
  { field: 'country', label: 'Country', required: false },
  { field: 'size', label: 'Company Size', required: false },
  { field: 'type', label: 'Type (Prospect/Customer)', required: false },
];

interface ImportRow {
  rowNumber: number;
  data: Record<string, any>;
  status: 'success' | 'error' | 'duplicate';
  errors: string[];
  isDuplicate: boolean;
  duplicateOf?: string;
}

interface PreviewData {
  totalRows: number;
  successRows: ImportRow[];
  errorRows: ImportRow[];
  duplicateRows: ImportRow[];
  columnMapping: Record<string, string>;
}

export default function ImportPage() {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  // Step 0: File Upload
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Read file headers
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      setFileHeaders(headers);

      // Initialize column mapping
      const mapping: Record<string, string> = {};
      headers.forEach(header => {
        const matchedField = MIDT_FIELDS.find(f =>
          f.label.toLowerCase().includes(header.toLowerCase()) ||
          header.toLowerCase().includes(f.field.toLowerCase())
        );
        if (matchedField) {
          mapping[header] = matchedField.field;
        }
      });
      setColumnMapping(mapping);
      setStep(1);
    };
    reader.readAsText(selectedFile);
  };

  // Step 1: Column Mapping
  const handleMappingChange = (csvColumn: string, miditField: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [csvColumn]: miditField === '' ? undefined : miditField,
    }));
  };

  const handlePreview = async () => {
    if (!file || Object.keys(columnMapping).length === 0) {
      alert('Please select a file and configure mappings');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(columnMapping));

      const response = await apiClient.post('/accounts/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = response.data.data as PreviewData;
      setPreviewData(data);

      // Pre-select all success rows for saving
      const successRowNumbers = new Set(data.successRows.map(r => r.rowNumber));
      setSelectedRows(successRowNumbers);
      setStep(2);
    } catch (error) {
      alert('Error previewing data: ' + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Preview & Select
  const handleRowSelect = (rowNumber: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowNumber)) {
      newSelected.delete(rowNumber);
    } else {
      newSelected.add(rowNumber);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(new Set(previewData?.successRows.map(r => r.rowNumber) || []));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSave = async () => {
    if (selectedRows.size === 0) {
      alert('Please select at least one row to save');
      return;
    }

    setSaving(true);
    try {
      const rowsToSave = previewData?.successRows.filter(r => selectedRows.has(r.rowNumber)) || [];

      await apiClient.post('/accounts/import/save', {
        rows: rowsToSave,
      });

      alert(`Successfully imported ${rowsToSave.length} records`);
      setStep(0);
      setFile(null);
      setColumnMapping({});
      setPreviewData(null);
      setSelectedRows(new Set());
    } catch (error) {
      alert('Error saving data: ' + (error as any).message);
    } finally {
      setSaving(false);
    }
  };

  const steps = ['Upload File', 'Map Columns', 'Review & Save'];

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Import MIDT Records
        </Typography>

        <Stepper activeStep={step} sx={{ mb: 4 }}>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 0: File Upload */}
        {step === 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Step 1: Upload CSV or Excel File
              </Typography>
              <Box sx={{ border: '2px dashed #ccc', p: 3, textAlign: 'center', borderRadius: 1, cursor: 'pointer' }}>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  id="file-input"
                />
                <label htmlFor="file-input" style={{ cursor: 'pointer', width: '100%', display: 'block' }}>
                  <Typography>Click to upload or drag and drop</Typography>
                  <Typography variant="caption" color="textSecondary">
                    CSV or Excel files supported
                  </Typography>
                </label>
              </Box>
              {file && <Typography sx={{ mt: 2 }}>Selected: {file.name}</Typography>}
            </CardContent>
          </Card>
        )}

        {/* Step 1: Column Mapping */}
        {step === 1 && (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Step 2: Map CSV Columns to MIDT Fields
                </Typography>
              </Box>
              <Alert severity="warning" sx={{ mb: 3 }}>
                <AlertTitle>Required Fields</AlertTitle>
                The following fields are mandatory and must be mapped:
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {MIDT_FIELDS.filter(f => f.required).map(field => (
                    <Chip key={field.field} label={field.label} color="error" variant="outlined" />
                  ))}
                </Box>
              </Alert>
              <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'primary.main' }}>
                      <TableCell sx={{ fontWeight: 'bold', color: 'white', width: '80px' }}>Index</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'white', width: '200px' }}>Column</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>MIDT Field</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fileHeaders.map((header, index) => {
                      const selectedField = columnMapping[header];
                      const selectedFieldObj = MIDT_FIELDS.find(f => f.field === selectedField);
                      const isRequired = selectedFieldObj?.required;

                      return (
                        <TableRow key={header} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>{header}</TableCell>
                          <TableCell>
                            <Select
                              value={columnMapping[header] || ''}
                              onChange={e => handleMappingChange(header, e.target.value)}
                              size="small"
                              fullWidth
                              sx={{
                                ...(isRequired && {
                                  '& .MuiOutlinedInput-root': {
                                    borderColor: 'success.main',
                                    '& fieldset': {
                                      borderColor: 'success.main',
                                      borderWidth: 2,
                                    },
                                  },
                                }),
                              }}
                            >
                              <MenuItem value="">-- SELECT --</MenuItem>
                              {MIDT_FIELDS.map(field => (
                                <MenuItem key={field.field} value={field.field}>
                                  {field.required && <Typography sx={{ color: 'error.main', mr: 1 }}>*</Typography>}
                                  {field.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button variant="outlined" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={handlePreview}
                  disabled={loading || Object.keys(columnMapping).filter(k => columnMapping[k]).length === 0}
                >
                  {loading ? <CircularProgress size={24} /> : 'Preview Import'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Preview & Save */}
        {step === 2 && previewData && (
          <Box>
            <Alert severity="success" sx={{ mb: 3 }}>
              <AlertTitle>Import Preview</AlertTitle>
              Success: {previewData.successRows.length} | Errors: {previewData.errorRows.length} | Duplicates: {previewData.duplicateRows.length}
            </Alert>

            {/* Success Rows */}
            {previewData.successRows.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ flex: 1 }}>
                      ✅ Valid Records ({previewData.successRows.length})
                    </Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedRows.size === previewData.successRows.length}
                          onChange={handleSelectAll}
                        />
                      }
                      label="Select All"
                    />
                  </Box>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#e8f5e9' }}>
                          <TableCell padding="checkbox">
                            <Checkbox />
                          </TableCell>
                          <TableCell>Row</TableCell>
                          {MIDT_FIELDS.filter(f => Object.values(columnMapping).includes(f.field)).map(field => (
                            <TableCell key={field.field}>{field.label}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {previewData.successRows.map(row => (
                          <TableRow key={row.rowNumber}>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedRows.has(row.rowNumber)}
                                onChange={() => handleRowSelect(row.rowNumber)}
                              />
                            </TableCell>
                            <TableCell>{row.rowNumber}</TableCell>
                            {MIDT_FIELDS.filter(f => Object.values(columnMapping).includes(f.field)).map(field => (
                              <TableCell key={field.field}>{row.data[field.field]}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

            {/* Error Rows */}
            {previewData.errorRows.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    ❌ Invalid Records ({previewData.errorRows.length})
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#ffebee' }}>
                          <TableCell>Row</TableCell>
                          <TableCell>Errors</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {previewData.errorRows.map(row => (
                          <TableRow key={row.rowNumber}>
                            <TableCell>{row.rowNumber}</TableCell>
                            <TableCell>
                              {row.errors.map((error, i) => (
                                <Box key={i} sx={{ color: 'error.main', fontSize: '0.875rem' }}>
                                  • {error}
                                </Box>
                              ))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

            {/* Duplicate Rows */}
            {previewData.duplicateRows.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    🔄 Duplicate Records ({previewData.duplicateRows.length})
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#fff3e0' }}>
                          <TableCell>Row</TableCell>
                          <TableCell>Company Name</TableCell>
                          <TableCell>Duplicate Of</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {previewData.duplicateRows.map(row => (
                          <TableRow key={row.rowNumber}>
                            <TableCell>{row.rowNumber}</TableCell>
                            <TableCell>{row.data.name}</TableCell>
                            <TableCell>{row.duplicateOf}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving || selectedRows.size === 0}
              >
                {saving ? <CircularProgress size={24} /> : `Save ${selectedRows.size} Records`}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Layout>
  );
}
