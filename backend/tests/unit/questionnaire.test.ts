import { QUESTIONS, questionsFor, prerequisiteStages, visibleStages, validateValue, questionByKey, statusForStage, WON, LOST } from '../../src/utils/questionnaire';

describe('question bank', () => {
  it('has unique keys', () => {
    const keys = QUESTIONS.map((q) => q.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('has the four open stages, both outcomes, and at least four mandatory questions in each', () => {
    for (const s of ['Customer engagement', 'Demonstration', 'Proposal', 'Negotiation', WON, LOST]) {
      const mandatory = questionsFor(s).filter((q) => q.mandatory);
      expect(mandatory.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('keeps optional questions out of the gates', () => {
    expect(questionByKey('ENG-05')?.mandatory).toBe(false);
    expect(questionByKey('NEG-08')?.mandatory).toBe(false);
    expect(questionByKey('LOST-3b')?.mandatory).toBe(false);
    expect(questionByKey('LOST-4b')?.mandatory).toBe(false);
  });

  it('gives every choice question a list of options', () => {
    for (const q of QUESTIONS.filter((x) => x.type === 'select')) expect(q.options?.length).toBeGreaterThan(1);
  });
});

describe('stage gates', () => {
  it('requires every earlier open stage before a later one', () => {
    expect(prerequisiteStages('Customer engagement')).toEqual([]);
    // New deals start at Demonstration, so it needs nothing before it.
    expect(prerequisiteStages('Demonstration')).toEqual([]);
    expect(prerequisiteStages('Negotiation')).toEqual(['Demonstration', 'Proposal']);
    expect(prerequisiteStages(WON)).toEqual(['Demonstration', 'Proposal', 'Negotiation']);
    expect(prerequisiteStages(LOST)).toEqual([]);
  });

  it('shows the current stage and every stage before it, plus both outcome records, nothing later', () => {
    expect(visibleStages('Customer engagement')).toEqual(['Customer engagement', WON, LOST]);
    expect(visibleStages('Demonstration')).toEqual(['Demonstration', WON, LOST]);
    expect(visibleStages('Proposal')).toEqual(['Demonstration', 'Proposal', WON, LOST]);
    expect(visibleStages(WON)).toEqual(['Demonstration', 'Proposal', 'Negotiation', WON, 'Handover', LOST]);
  });

  it('gates entry into Handover on the handover questions as well as the win', () => {
    expect(prerequisiteStages('Handover')).toEqual(['Demonstration', 'Proposal', 'Negotiation', WON, 'Handover']);
    expect(questionsFor('Handover').filter((q) => q.mandatory).length).toBeGreaterThan(0);
  });

  it('keeps the deal status in step with its stage', () => {
    expect(statusForStage('Demonstration')).toBe('Open');
    expect(statusForStage(WON)).toBe('Won');
    expect(statusForStage('Handover')).toBe('Won');
    expect(statusForStage(LOST)).toBe('Lost');
  });
});

describe('answer validation', () => {
  it('rejects blanks: an answer or Unknown is required', () => {
    expect(validateValue(questionByKey('ENG-01')!, '  ')).toMatch(/Enter an answer/);
    expect(validateValue(questionByKey('ENG-01')!, 'Customer lacks a booking tool')).toBeNull();
  });

  it('checks numbers, dates and choices', () => {
    expect(validateValue(questionByKey('PROP-02')!, '-5')).not.toBeNull();
    expect(validateValue(questionByKey('PROP-02')!, '45000')).toBeNull();
    expect(validateValue(questionByKey('NEG-08')!, '150')).toMatch(/Probability/);
    expect(validateValue(questionByKey('PROP-06')!, '2026-13-40')).toMatch(/date/);
    expect(validateValue(questionByKey('PROP-06')!, '2026-11-30')).toBeNull();
    expect(validateValue(questionByKey('PROP-03')!, 'Maybe')).toMatch(/Choose one/);
    expect(validateValue(questionByKey('DEMO-10')!, 'Maybe')).toMatch(/Answer Yes, No or Pending/);
    expect(validateValue(questionByKey('DEMO-10')!, 'Yes')).toBeNull();
  });

  it('requires at least one product for a product list', () => {
    expect(validateValue(questionByKey('PROP-01')!, '[]')).not.toBeNull();
    expect(validateValue(questionByKey('PROP-01')!, '["a1b2"]')).toBeNull();
  });
});
