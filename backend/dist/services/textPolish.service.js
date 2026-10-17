"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = __importDefault(require("https"));
const textPolish_1 = require("../utils/textPolish");
const logger_1 = __importDefault(require("../utils/logger"));
const MAX_CHARS = 4000;
// Calls the Anthropic Messages API directly. Only used when AI_POLISH_API_KEY is set (deliberately not the generic ANTHROPIC_API_KEY, so a key on the machine for other tools is never used by accident),
// which means the text being polished is sent to Anthropic - nothing is sent otherwise.
function callAnthropic(system, text) {
    const key = process.env.AI_POLISH_API_KEY;
    const model = process.env.POLISH_MODEL || 'claude-haiku-4-5-20251001';
    const body = JSON.stringify({ model, max_tokens: 2000, system, messages: [{ role: 'user', content: text }] });
    return new Promise((resolve, reject) => {
        const req = https_1.default.request({
            hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST', timeout: 20000,
            headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-length': Buffer.byteLength(body) },
        }, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
                if (!res.statusCode || res.statusCode >= 300)
                    return reject(new Error(`AI service returned ${res.statusCode}`));
                try {
                    const out = JSON.parse(data)?.content?.find((b) => b.type === 'text')?.text;
                    if (typeof out === 'string' && out.trim())
                        resolve(out.trim());
                    else
                        reject(new Error('AI service returned no text'));
                }
                catch {
                    reject(new Error('AI service returned an unreadable reply'));
                }
            });
        });
        req.on('timeout', () => { req.destroy(new Error('AI service timed out')); });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}
class TextPolishService {
    isAiEnabled() { return !!process.env.AI_POLISH_API_KEY; }
    async polish(raw, ctx) {
        const text = raw.slice(0, MAX_CHARS);
        // Always apply the offline clean-up first: it also fixes spoken punctuation, which helps the AI step.
        const cleaned = (0, textPolish_1.basicPolish)(text, ctx);
        if (!this.isAiEnabled())
            return { text: cleaned, engine: 'basic', note: 'AI proofreading is not switched on, so only basic clean-up was applied.' };
        try {
            const out = await callAnthropic((0, textPolish_1.polishSystemPrompt)(ctx), cleaned);
            // Guard against a runaway rewrite: the result must stay in the same size range as the input.
            if (out.length > cleaned.length * 2 + 80 || out.length < cleaned.length * 0.4)
                throw new Error('AI result looked unreliable');
            return { text: ctx === 'ticket_title' ? out.replace(/\s*\n\s*/g, ' ').replace(/[.]+$/, '') : out, engine: 'ai' };
        }
        catch (e) {
            // Never log the text itself - it can contain client details.
            logger_1.default.warn(`Text polish fell back to basic clean-up: ${e?.message}`);
            return { text: cleaned, engine: 'basic', note: 'AI proofreading was unavailable just now; basic clean-up was applied.' };
        }
    }
}
exports.default = new TextPolishService();
//# sourceMappingURL=textPolish.service.js.map