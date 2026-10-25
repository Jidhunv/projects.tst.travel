import React from 'react';
import { Chip } from '@mui/material';

// Flags a lead or deal whose account's buying committee is empty or only partly
// filled (named members out of the 8 roles). Shown at every stage. A complete
// committee (8 of 8) shows nothing. Records from an older API response (no count)
// stay unmarked rather than flagged by mistake.
const NoCommitteeChip: React.FC<{ buyingCommitteeCount?: number; hasBuyingCommittee?: boolean }> = ({
  buyingCommitteeCount,
  hasBuyingCommittee,
}) => {
  if (buyingCommitteeCount === undefined) {
    if (hasBuyingCommittee !== false) return null;
    return <Chip size="small" color="warning" variant="outlined" label="No buying committee" sx={{ ml: 1 }} />;
  }
  if (buyingCommitteeCount >= 8) return null;
  if (buyingCommitteeCount === 0) {
    return <Chip size="small" color="warning" variant="outlined" label="No buying committee" sx={{ ml: 1 }} />;
  }
  return (
    <Chip
      size="small"
      color="info"
      variant="outlined"
      label={`Committee partial (${buyingCommitteeCount}/8)`}
      sx={{ ml: 1 }}
    />
  );
};

export default NoCommitteeChip;
