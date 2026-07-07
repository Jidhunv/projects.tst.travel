import { useState } from 'react';

export function useLast30DaysFilter() {
  const [dateRange, setDateRange] = useState<'30days' | 'all'>('30days');

  const getDateFilters = () => {
    if (dateRange === 'all') {
      return { fromDate: '', toDate: '' };
    }

    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    return {
      fromDate: thirtyDaysAgo.toISOString().split('T')[0],
      toDate: today.toISOString().split('T')[0],
    };
  };

  const getHighlight = (createdAt: string): 'none' | 'recent7' | 'recent24' => {
    const created = new Date(createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    const daysDiff = hoursDiff / 24;

    if (hoursDiff <= 24) return 'recent24';
    if (daysDiff <= 7) return 'recent7';
    return 'none';
  };

  const getHighlightStyle = (highlight: 'none' | 'recent7' | 'recent24') => {
    switch (highlight) {
      case 'recent24':
        return { backgroundColor: '#fff3cd', fontWeight: 600 }; // Orange
      case 'recent7':
        return { backgroundColor: '#ffffeb', fontWeight: 500 }; // Yellow
      default:
        return {};
    }
  };

  return {
    dateRange,
    setDateRange,
    getDateFilters,
    getHighlight,
    getHighlightStyle,
  };
}
