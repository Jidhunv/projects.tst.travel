"use strict";
// Shared constants for the question master: stage names, answer types, key prefixes.
Object.defineProperty(exports, "__esModule", { value: true });
exports.STAGE_PREFIX = exports.QTYPES = exports.ALL_STAGE_NAMES = void 0;
exports.ALL_STAGE_NAMES = ['Customer engagement', 'Demonstration', 'Proposal', 'Negotiation', 'Closed-Won', 'Handover', 'Closed-Lost'];
exports.QTYPES = ['text', 'number', 'currency', 'date', 'select', 'yesno', 'contact', 'product', 'productMulti', 'attendees', 'attendance'];
// Prefix used when a new question's key is generated (e.g. QUAL-7K2X).
exports.STAGE_PREFIX = {
    'Customer engagement': 'QUAL',
    Demonstration: 'DEMO',
    Proposal: 'PROP',
    Negotiation: 'NEG',
    'Closed-Won': 'WON',
    Handover: 'HAND',
    'Closed-Lost': 'LOST',
};
//# sourceMappingURL=questionMaster.js.map