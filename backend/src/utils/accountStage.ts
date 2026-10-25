// Where an account sits in the sales flow, shown in the accounts list. It follows the
// account's leads, so an account is a Prospect only when a lead has actually been
// converted to a prospect, and never just because its lead questionnaire is complete.
//   Account -> Lead (lead questionnaire complete) -> Qualified (qualification questionnaire
//   complete) -> Prospect (converted from a qualified lead) -> Opportunity (converted to a deal)

export type AccountStage = 'Account' | 'On hold' | 'Lead' | 'Qualified' | 'Prospect' | 'Opportunity';

export function accountStage(type: string | null | undefined, leadQuestionnaireComplete: boolean, leadStatuses: string[]): AccountStage {
  if (leadStatuses.includes('Converted')) return 'Opportunity';
  if (leadStatuses.includes('Prospect')) return 'Prospect';
  if (leadStatuses.includes('Qualified')) return 'Qualified';
  if (leadQuestionnaireComplete) return 'Lead';
  if (type === 'On hold') return 'On hold';
  return 'Account';
}
