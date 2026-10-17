import https from 'https';
import { basicPolish, polishSystemPrompt, PolishContext } from '../utils/textPolish';
import logger from '../utils/logger';

export interface PolishResult {
  text: string;
  engine: 'ai' | 'basic';
  note?: string; // why the AI step was skipped, when it was
}

const MAX_CHARS = 4000;

// Calls the Anthropic Messages API directly. Only used when AI_POLISH_API_KEY is set (deliberately not the generic ANTHROPIC_API_KEY, so a key on the machine for other tools is never used by accident),
// which means the text being polished is sent to Anthropic - nothing is sent otherwise.
function callAnthropic(system: string, text: string): Promise<string> {
  const key = process.env.AI_POLISH_API_KEY as string;
  const model = process.env.POLISH_MODEL || 'claude-haiku-4-5-20251001';
  const body = JSON.stringify({ model, max_tokens: 2000, system, messages: [{ role: 'user', content: text }] });
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST', timeout: 20000,
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (!res.statusCode || res.statusCode >= 300) return reject(new Error(`AI service returned ${res.statusCode}`));
          try {
            const out = JSON.parse(data)?.content?.find((b: any) => b.type === 'text')?.text;
            if (typeof out === 'string' && out.trim()) resolve(out.trim());
            else reject(new Error('AI service returned no text'));
          } catch { reject(new Error('AI service returned an unreadable reply')); }
        });
      }
    );
    req.on('timeout', () => { req.destroy(new Error('AI service timed out')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

class TextPolishService {
  isAiEnabled() { return !!process.env.AI_POLISH_API_KEY; }

  async polish(raw: string, ctx: PolishContext): Promise<PolishResult> {
    const text = raw.slice(0, MAX_CHARS);
    // Always apply the offline clean-up first: it also fixes spoken punctuation, which helps the AI step.
    const cleaned = basicPolish(text, ctx);
    if (!this.isAiEnabled()) return { text: cleaned, engine: 'basic', note: 'AI proofreading is not switched on, so only basic clean-up was applied.' };
    try {
      const out = await callAnthropic(polishSystemPrompt(ctx), cleaned);
      // Guard against a runaway rewrite: the result must stay in the same size range as the input.
      if (out.length > cleaned.length * 2 + 80 || out.length < cleaned.length * 0.4) throw new Error('AI result looked unreliable');
      return { text: ctx === 'ticket_title' ? out.replace(/\s*\n\s*/g, ' ').replace(/[.]+$/, '') : out, engine: 'ai' };
    } catch (e: any) {
      // Never log the text itself - it can contain client details.
      logger.warn(`Text polish fell back to basic clean-up: ${e?.message}`);
      return { text: cleaned, engine: 'basic', note: 'AI proofreading was unavailable just now; basic clean-up was applied.' };
    }
  }
}

export default new TextPolishService();
