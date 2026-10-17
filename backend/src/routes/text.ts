import { Router, Response, NextFunction } from 'express';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import textPolish from '../services/textPolish.service';
import type { PolishContext } from '../utils/textPolish';

// Mounted at /api/text: proofreading for dictated or typed notes.
const router = Router();
router.use(verifyToken);

const CONTEXTS: PolishContext[] = ['sales', 'ticket', 'ticket_title'];
const MAX_CHARS = 4000;

// Small per-user allowance (the AI step costs money): 30 requests a minute.
const hits = new Map<string, { n: number; reset: number }>();
const allow = (key: string) => {
  const now = Date.now();
  const e = hits.get(key);
  if (!e || now > e.reset) { hits.set(key, { n: 1, reset: now + 60_000 }); return true; }
  e.n += 1;
  return e.n <= 30;
};
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (now > v.reset) hits.delete(k); }, 5 * 60_000).unref();

router.get('/status', (_req, res) => res.json({ success: true, data: { ai: textPolish.isAiEnabled() } }));

router.post('/polish', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!allow(req.user!.id)) throw new AppError(429, 'Too many requests - wait a moment and try again');
    const { text, context } = req.body || {};
    if (typeof text !== 'string' || !text.trim()) throw new AppError(400, 'There is no text to proofread');
    if (text.length > MAX_CHARS) throw new AppError(400, `The text is too long to proofread at once (max ${MAX_CHARS} characters)`);
    if (!CONTEXTS.includes(context)) throw new AppError(400, `context must be one of: ${CONTEXTS.join(', ')}`);
    res.json({ success: true, data: await textPolish.polish(text, context) });
  } catch (e) { next(e); }
});

export default router;
