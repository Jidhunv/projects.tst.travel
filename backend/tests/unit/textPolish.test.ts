import { basicPolish, polishSystemPrompt } from '../../src/utils/textPolish';

describe('basicPolish (dictation clean-up)', () => {
  it('capitalises sentences, fixes "i", spacing and the final full stop', () => {
    expect(basicPolish('i met the manager today  and he said  they like the demo', 'sales'))
      .toBe('I met the manager today and he said they like the demo.');
  });

  it('turns spoken punctuation into symbols', () => {
    expect(basicPolish('visited the agency comma they use amadeus full stop next step is a proposal', 'sales'))
      .toBe('Visited the agency, they use Amadeus. Next step is a proposal.');
    expect(basicPolish('first point new line second point', 'ticket')).toBe('First point\nSecond point.');
  });

  it('writes industry terms correctly', () => {
    const out = basicPolish('they want n d c content and the g d s is sabre with iata and bsp reports', 'sales');
    expect(out).toContain('NDC');
    expect(out).toContain('GDS');
    expect(out).toContain('Sabre');
    expect(out).toContain('IATA');
    expect(out).toContain('BSP');
  });

  it('removes repeated words and space before punctuation', () => {
    expect(basicPolish('the the search is is slow , very slow', 'ticket')).toBe('The search is slow, very slow.');
  });

  it('leaves codes, numbers and URLs alone', () => {
    const out = basicPolish('error E-4021 at https://portal.example.com/search after 3.5 seconds', 'ticket');
    expect(out).toContain('E-4021');
    expect(out).toContain('https://portal.example.com/search');
    expect(out).toContain('3.5 seconds');
  });

  it('makes a ticket title a single line with no full stop', () => {
    expect(basicPolish('cannot issue tickets for lcc fares full stop', 'ticket_title')).toBe('Cannot issue tickets for LCC fares');
    expect(basicPolish('line one new line line two', 'ticket_title')).toBe('Line one Line two');
  });

  it('does not double-end a sentence', () => {
    expect(basicPolish('Is the portal down?', 'ticket')).toBe('Is the portal down?');
    expect(basicPolish('', 'sales')).toBe('');
  });
});

describe('polishSystemPrompt', () => {
  it('gives the model the right domain for each use and forbids inventing facts', () => {
    expect(polishSystemPrompt('sales')).toMatch(/travel agency/);
    expect(polishSystemPrompt('sales')).toMatch(/Amadeus/);
    expect(polishSystemPrompt('ticket')).toMatch(/software problem/);
    expect(polishSystemPrompt('ticket')).toMatch(/error message/);
    expect(polishSystemPrompt('ticket_title')).toMatch(/one short, clear line/);
    for (const c of ['sales', 'ticket', 'ticket_title'] as const) expect(polishSystemPrompt(c)).toMatch(/Do NOT add facts/);
  });
});
