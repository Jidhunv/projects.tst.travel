// Shared constants for the question master: stage names, answer types, key prefixes.

export const ALL_STAGE_NAMES = ['Customer engagement', 'Demonstration', 'Proposal', 'Negotiation', 'Closed-Won', 'Handover', 'Closed-Lost'];

export const QTYPES = ['text', 'number', 'currency', 'date', 'select', 'yesno', 'contact', 'product', 'productMulti', 'attendees', 'attendance'];

// Prefix used when a new question's key is generated (e.g. QUAL-7K2X).
export const STAGE_PREFIX: Record<string, string> = {
  'Customer engagement': 'QUAL',
  Demonstration: 'DEMO',
  Proposal: 'PROP',
  Negotiation: 'NEG',
  'Closed-Won': 'WON',
  Handover: 'HAND',
  'Closed-Lost': 'LOST',
};
