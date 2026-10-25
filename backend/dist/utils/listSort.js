"use strict";
// Sorting for list screens. The client sends a key and a direction; only keys in the
// resource's whitelist reach the query, so no user text is ever put into an ORDER BY.
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSort = resolveSort;
// Returns the column and direction for a list. With no valid sortBy, the fallback key is used.
// A given sortBy defaults to ascending unless sortDir says desc.
function resolveSort(sortBy, sortDir, allowed, fallbackKey, fallbackDir = 'DESC') {
    if (typeof sortBy === 'string' && allowed[sortBy]) {
        const dir = sortDir === 'desc' ? 'DESC' : 'ASC';
        return { column: allowed[sortBy], dir };
    }
    return { column: allowed[fallbackKey], dir: fallbackDir };
}
//# sourceMappingURL=listSort.js.map