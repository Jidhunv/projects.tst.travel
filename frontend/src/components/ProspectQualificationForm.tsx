import React from 'react';
import { Stack, TextField, Typography } from '@mui/material';

// Mirrors backend utils/leadQualification.ts. The server is the authority on validation.
export const LEAD_QUALIFICATION_QUESTIONS: Array<{ key: string; label: string; mandatory: boolean }> = [
  { key: 'lq1', mandatory: true, label: 'Why is this a genuine business opportunity, and why pursue it now?' },
  { key: 'lq2', mandatory: true, label: 'Which product or solution is relevant, and what confirmed customer problem does it solve?' },
  { key: 'lq3', mandatory: true, label: 'What evidence confirms the customer\'s need or interest?' },
  { key: 'lq4', mandatory: true, label: 'Who is the customer contact, what is their buying role, and who are the decision-maker and budget owner?' },
  { key: 'lq5', mandatory: true, label: 'How urgent is the need, and what is the impact of not acting?' },
  { key: 'lq6', mandatory: true, label: 'What is the current arrangement, and is a competitor or alternative involved?' },
  { key: 'lq7', mandatory: true, label: 'What is the estimated deal value, and what assumptions support it?' },
  { key: 'lq8', mandatory: true, label: 'What is the expected decision timeframe, and what risks could prevent conversion?' },
  { key: 'lq9', mandatory: true, label: 'What is the agreed next action, who owns it, and when is it due?' },
  { key: 'lq10', mandatory: false, label: 'Has the full buying committee been mapped?' },
  { key: 'lq11', mandatory: false, label: 'What is the expected purchase decision date?' },
  { key: 'lq12', mandatory: false, label: 'Are there additional opportunities or expansion possibilities?' },
];

export type LeadQualificationAnswers = Record<string, string>;

// Only the mandatory questions block qualification.
export const leadQualificationMissing = (answers: LeadQualificationAnswers) =>
  LEAD_QUALIFICATION_QUESTIONS.filter((q) => q.mandatory && !(answers[q.key] ?? '').trim()).map((q) => q.key);

interface Props {
  value: LeadQualificationAnswers;
  onChange: (next: LeadQualificationAnswers) => void;
}

// The questionnaire a lead must pass before it is qualified; a qualified lead can then become a prospect.
const ProspectQualificationForm: React.FC<Props> = ({ value, onChange }) => {
  const required = LEAD_QUALIFICATION_QUESTIONS.filter((q) => q.mandatory);
  const answered = required.length - leadQualificationMissing(value).length;
  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        Qualification questionnaire ({answered} of {required.length} mandatory answered)
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Answer the mandatory questions to qualify the lead. Only a qualified lead can be converted to a prospect.
      </Typography>
      {LEAD_QUALIFICATION_QUESTIONS.map((q, i) => (
        <TextField
          key={q.key}
          label={`${i + 1}. ${q.label}${q.mandatory ? '' : ' (optional)'}`}
          value={value[q.key] ?? ''}
          onChange={(e) => onChange({ ...value, [q.key]: e.target.value })}
          fullWidth
          multiline
          minRows={2}
          required={q.mandatory}
          InputLabelProps={{ shrink: true }}
        />
      ))}
    </Stack>
  );
};

export default ProspectQualificationForm;
