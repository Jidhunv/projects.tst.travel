import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Box,
  TextField,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { SortableHeaderCell, SortState } from '@components/SortControl';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string;
  // Custom cell renderer that receives the whole row (for buttons, chips, etc.)
  render?: (row: any) => React.ReactNode;
  // Set for a column that sorts when its heading is clicked (the key the server sorts by).
  sortKey?: string;
}

interface DataTableProps {
  columns: Column[];
  rows: any[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRowClick?: (row: any) => void;
  // Optional row styling, for example to highlight a complete record.
  getRowSx?: (row: any) => Record<string, unknown> | undefined;
  onAddClick?: () => void;
  onSearchChange?: (search: string) => void;
  title: string;
  // Current sort. Columns with a sortKey sort the list when their heading is clicked.
  sort?: SortState;
  onSortChange?: (next: SortState) => void;
}

export default function DataTable({
  columns,
  rows,
  total,
  page,
  pageSize,
  loading,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  getRowSx,
  onAddClick,
  onSearchChange,
  title,
  sort,
  onSortChange,
}: DataTableProps) {
  const [search, setSearch] = React.useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    onSearchChange?.(value);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    onPageChange(newPage + 1);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    onPageSizeChange(parseInt(event.target.value, 10));
  };

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h5">{title}</Typography>
        {onAddClick && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAddClick}>
            Add New
          </Button>
        )}
      </Box>

      {/* Search */}
      {onSearchChange && (
        <Box sx={{ mb: 2 }}>
          <TextField
            placeholder="Search..."
            value={search}
            onChange={handleSearchChange}
            size="small"
            fullWidth
            sx={{ maxWidth: '300px' }}
          />
        </Box>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Table */}
      {!loading && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  {columns.map((column) => (
                    <SortableHeaderCell
                      key={column.id}
                      label={column.label}
                      sortKey={column.sortKey}
                      sort={sort}
                      onSort={onSortChange}
                      align={column.align || 'left'}
                      minWidth={column.minWidth}
                    />
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center" sx={{ py: 3 }}>
                      No data found
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, index) => (
                    <TableRow
                      key={index}
                      onClick={() => onRowClick?.(row)}
                      sx={{
                        cursor: onRowClick ? 'pointer' : 'default',
                        '&:hover': onRowClick ? { bgcolor: '#f9f9f9' } : {},
                        ...(getRowSx?.(row) ?? {}),
                      }}
                    >
                      {columns.map((column) => (
                        <TableCell key={column.id} align={column.align || 'left'}>
                          {column.render
                            ? column.render(row)
                            : column.format
                            ? column.format(row[column.id])
                            : row[column.id] || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            rowsPerPageOptions={[10, 20, 50]}
            component="div"
            count={total}
            rowsPerPage={pageSize}
            page={page - 1}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}
    </Box>
  );
}
