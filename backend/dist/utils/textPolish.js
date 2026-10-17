"use strict";
// Offline clean-up for dictated text. Used on its own when no AI key is configured,
// and as the safety net if the AI call fails. It fixes the things speech-to-text gets
// wrong mechanically (spacing, capitals, spoken punctuation, industry acronyms); real
// grammar correction is done by the AI step in textPolish.service.ts.
Object.defineProperty(exports, "__esModule", { value: true });
exports.basicPolish = basicPolish;
exports.polishSystemPrompt = polishSystemPrompt;
// Industry terms speech engines write in lower case or split into letters.
const TERMS = [
    [/\bg\.?\s?d\.?\s?s\b/gi, 'GDS'], [/\bamadeus\b/gi, 'Amadeus'], [/\bsabre\b/gi, 'Sabre'], [/\bgalileo\b/gi, 'Galileo'],
    [/\btravelport\b/gi, 'Travelport'], [/\bn\.?\s?d\.?\s?c\b/gi, 'NDC'], [/\bl\.?\s?c\.?\s?c\b/gi, 'LCC'],
    [/\bb\.?\s?s\.?\s?p\b/gi, 'BSP'], [/\biata\b/gi, 'IATA'], [/\bmidt\b/gi, 'MIDT'], [/\bp\.?\s?n\.?\s?r\b/gi, 'PNR'],
    [/\bo\.?\s?b\.?\s?t\b/gi, 'OBT'], [/\bt\.?\s?m\.?\s?c\b/gi, 'TMC'], [/\bapi\b/gi, 'API'], [/\bsso\b/gi, 'SSO'],
    [/\buat\b/gi, 'UAT'], [/\bvat\b/gi, 'VAT'], [/\bkpi(s)?\b/gi, (_m, s) => `KPI${s ? 's' : ''}`],
    [/\bcrm\b/gi, 'CRM'], [/\bpdf\b/gi, 'PDF'], [/\bsms\b/gi, 'SMS'], [/\bsaudi\b/gi, 'Saudi'], [/\briyadh\b/gi, 'Riyadh'],
    [/\bjeddah\b/gi, 'Jeddah'], [/\bdubai\b/gi, 'Dubai'],
];
// Spoken punctuation -> symbols.
const SPOKEN = [
    [/\s*\b(?:new paragraph)\b[\s,.]*/gi, '\n\n'], [/\s*\b(?:new line|next line)\b[\s,.]*/gi, '\n'],
    [/\s*\b(?:full stop|period)\b\s*/gi, '. '], [/\s*\bcomma\b\s*/gi, ', '], [/\s*\bquestion mark\b\s*/gi, '? '],
    [/\s*\bexclamation (?:mark|point)\b\s*/gi, '! '], [/\s*\bcolon\b\s*/gi, ': '], [/\s*\bsemicolon\b\s*/gi, '; '],
];
function basicPolish(input, ctx) {
    // URLs and e-mail addresses are lifted out first so the punctuation rules cannot split them.
    const keep = [];
    let t = (input || '')
        .replace(/\r/g, '')
        .replace(/https?:\/\/\S+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gi, (m) => `\u0001${keep.push(m) - 1}\u0001`);
    for (const [re, rep] of SPOKEN)
        t = t.replace(re, rep);
    t = t.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    // "the the" -> "the"
    t = t.replace(/\b(\w+)(\s+\1\b)+/gi, '$1');
    // spacing around punctuation
    t = t.replace(/\s+([,.;:!?])/g, '$1').replace(/([,.;:!?])(?=[^\s\d"')\]\n.,;:!?])/g, '$1 ');
    // pronoun I and contractions
    t = t.replace(/\bi\b/g, 'I').replace(/\bI(?=['’](?:m|ve|ll|d)\b)/g, 'I');
    for (const [re, rep] of TERMS)
        t = t.replace(re, rep);
    // capitalise the first letter of each sentence / line
    t = t.replace(/(^|[.!?]\s+|\n)([a-z])/g, (_m, a, b) => a + b.toUpperCase());
    const restore = (x) => x.replace(/\u0001(\d+)\u0001/g, (_m, i) => keep[Number(i)]);
    if (ctx === 'ticket_title')
        return restore(t.replace(/\s*\n\s*/g, ' ').replace(/[.]+$/, '')).slice(0, 255);
    // finish an unterminated last sentence
    if (t && !/[.!?:)]$/.test(t))
        t += '.';
    return restore(t);
}
const DOMAIN = {
    sales: 'The text is a salesperson\'s dictated notes from a visit or call with a corporate client or a travel agency (a company that books travel). ' +
        'Typical vocabulary: GDS (Amadeus, Sabre, Galileo/Travelport), NDC, LCC, BSP, IATA, MIDT, OBT (online booking tool), TMC, corporate travel policy, ' +
        'fares, ticketing, refunds, commission, markup, B2B portal, API integration, demo, proposal, decision maker, follow-up, tier. ',
    ticket: 'The text is a dictated description of a software problem reported by a client, usually a corporate or a travel agency using our travel booking platform. ' +
        'Typical vocabulary: booking engine, search results, fare rules, PNR, ticketing, queue, voucher, invoice, refund, payment gateway, login/SSO, API timeout, ' +
        'reports, user roles, GDS connection. Keep any error message, code, reference number or URL exactly as given. ',
    ticket_title: 'The text is the title of a software issue reported by a travel-industry client. Make it one short, clear line (no trailing full stop). ',
};
function polishSystemPrompt(ctx) {
    return ('You are a careful proofreader. ' + DOMAIN[ctx] +
        'The text was typed or dictated by voice, so expect misheard words, missing punctuation and wrong capitalisation. ' +
        'Correct spelling, grammar, punctuation and capitalisation, and fix words that are clearly speech-recognition mistakes using the vocabulary above. ' +
        'Keep the meaning, tone, person and order. Do NOT add facts, names, numbers or dates that are not in the text, and do not remove information. ' +
        'Keep names, numbers, dates, amounts, codes and URLs exactly as written. If a word is unclear, leave it as it is. ' +
        'Keep the writer\'s language (do not translate). Keep line breaks. Reply with the corrected text only - no quotes, no commentary.');
}
//# sourceMappingURL=textPolish.js.map