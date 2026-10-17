"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const textPolish_service_1 = __importDefault(require("../services/textPolish.service"));
// Mounted at /api/text: proofreading for dictated or typed notes.
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
const CONTEXTS = ['sales', 'ticket', 'ticket_title'];
const MAX_CHARS = 4000;
// Small per-user allowance (the AI step costs money): 30 requests a minute.
const hits = new Map();
const allow = (key) => {
    const now = Date.now();
    const e = hits.get(key);
    if (!e || now > e.reset) {
        hits.set(key, { n: 1, reset: now + 60000 });
        return true;
    }
    e.n += 1;
    return e.n <= 30;
};
setInterval(() => { const now = Date.now(); for (const [k, v] of hits)
    if (now > v.reset)
        hits.delete(k); }, 5 * 60000).unref();
router.get('/status', (_req, res) => res.json({ success: true, data: { ai: textPolish_service_1.default.isAiEnabled() } }));
router.post('/polish', async (req, res, next) => {
    try {
        if (!allow(req.user.id))
            throw new errorHandler_1.AppError(429, 'Too many requests - wait a moment and try again');
        const { text, context } = req.body || {};
        if (typeof text !== 'string' || !text.trim())
            throw new errorHandler_1.AppError(400, 'There is no text to proofread');
        if (text.length > MAX_CHARS)
            throw new errorHandler_1.AppError(400, `The text is too long to proofread at once (max ${MAX_CHARS} characters)`);
        if (!CONTEXTS.includes(context))
            throw new errorHandler_1.AppError(400, `context must be one of: ${CONTEXTS.join(', ')}`);
        res.json({ success: true, data: await textPolish_service_1.default.polish(text, context) });
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=text.js.map