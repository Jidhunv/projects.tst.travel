import React from 'react';
import { TableCell, TableSortLabel } from '@mui/material';

export type SortDir = 'asc' | 'desc';

export interface SortState {
  sortBy: string;
  sortDir: SortDir;
}

// Clicking a column heading: a new column sorts ascending, the same column flips its direction.
export function nextSort(current: SortState, key: string): SortState {
  if (current.sortBy === key) {
    return { sortBy: key, sortDir: current.sortDir === 'asc' ? 'desc' : 'asc' };
  }
  return { sortBy: key, sortDir: 'asc' };
}

interface HeaderCellProps {
  label: string;
  sortKey?: string;
  sort?: SortState;
  onSort?: (next: SortState) => void;
  align?: 'left' | 'right' | 'center';
  minWidth?: number;
}

// A table heading that sorts when clicked. Without a sortKey (or handler) it is a plain heading.
export function SortableHeaderCell({ label, sortKey, sort, onSort, align = 'left', minWidth }: HeaderCellProps) {
  if (!sortKey || !sort || !onSort) {
    return (
      <TableCell align={align} style={{ minWidth }} sx={{ fontWeight: 600 }}>
        {label}
      </TableCell>
    );
  }
  const active = sort.sortBy === sortKey;
  return (
    <TableCell align={align} style={{ minWidth }} sx={{ fontWeight: 600 }} sortDirection={active ? sort.sortDir : false}>
      <TableSortLabel active={active} direction={active ? sort.sortDir : 'asc'} onClick={() => onSort(nextSort(sort, sortKey))}>
        {label}
      </TableSortLabel>
    </TableCell>
  );
}

// Empty values sort last. Dates compare by time, numbers by value, text by locale order.
function compareValues(a: unknown, b: unknown): number {
  const empty = (v: unknown) => v === null || v === undefined || v === '';
  if (empty(a) || empty(b)) return empty(a) === empty(b) ? 0 : empty(a) ? 1 : -1;
  const x = a instanceof Date ? a.getTime() : a;
  const y = b instanceof Date ? b.getTime() : b;
  if (typeof x === 'number' && typeof y === 'number') return x - y;
  return String(x).localeCompare(String(y));
}

// Sorts rows in the browser, for report tables that are not paged on the server.
// A blank sortBy (no sort chosen yet) keeps the original order.
export function sortRows<T>(rows: T[], sort: SortState, getters: Record<string, (row: T) => unknown>): T[] {
  const get = getters[sort.sortBy];
  if (!get) return rows;
  const dir = sort.sortDir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => compareValues(get(a), get(b)) * dir);
}
