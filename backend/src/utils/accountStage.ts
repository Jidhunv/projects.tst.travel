// The Type of an account in the lists. It is either Account (not yet a lead), Lead, or On hold.
// Everything further along the sales flow (qualified, prospect, opportunity) still shows as Lead;
// the prospects themselves carry the detail.
//   Account -> Lead (lead questionnaire complete, or any prospect created)
//   Lead -> On hold when every prospect of the account has been disqualified.

export type AccountStage = 'Account' | 'Lead' | 'On hold';

export function accountStage(type: string | null | undefined, leadQuestionnaireComplete: boolean, leadStatuses: string[]): AccountStage {
  // Every prospect disqualified: the account is on hold.
  if (leadStatuses.length > 0 && leadStatuses.every((s) => s === 'Disqualified')) return 'On hold';
  // Once an account has a prospect it stays a lead, even if its questionnaire is later edited.
  if (leadQuestionnaireComplete || leadStatuses.length > 0) return 'Lead';
  if (type === 'On hold') return 'On hold';
  return 'Account';
}
