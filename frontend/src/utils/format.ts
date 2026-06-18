// Format a number as USD currency.
export const formatCurrency = (value: number | undefined | null): string => {
  const n = Number(value || 0);
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
};

// Compact currency for big headline numbers, e.g. $1.2M, $325K.
export const formatCurrencyCompact = (value: number | undefined | null): string => {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
};
