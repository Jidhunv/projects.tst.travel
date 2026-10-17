import React from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, MenuItem,
  Select, Stack, TextField, TextFieldProps, Tooltip, Typography,
} from '@mui/material';
import { AutoFixHigh as ProofreadIcon, Mic as MicIcon, Stop as StopIcon } from '@mui/icons-material';
import { api } from '@services/api';

export type VoiceContext = 'sales' | 'ticket' | 'ticket_title';

type Props = Omit<TextFieldProps, 'value' | 'onChange' | 'variant'> & {
  value: string;
  onChange: (value: string) => void;
  // What is being written, so proofreading uses the right vocabulary:
  //  sales        - notes from a visit or call with a corporate or travel agency
  //  ticket       - a software issue raised by a client
  //  ticket_title - a short issue title
  context: VoiceContext;
};

const LANGS = [
  { code: 'en-US', label: 'English (US)' }, { code: 'en-GB', label: 'English (UK)' }, { code: 'en-IN', label: 'English (India)' },
  { code: 'ar-SA', label: 'Arabic (Saudi)' },
];
const getSR = (): any => (typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined);
const join = (a: string, b: string) => (!a ? b : !b ? a : /[\s]$/.test(a) ? a + b : `${a} ${b}`);
// Only one box may listen at a time: starting one stops whichever was active.
let stopActive: (() => void) | null = null;
const readLang = () => { try { return localStorage.getItem('voiceLang') || 'en-US'; } catch { return 'en-US'; } };

// A text box you can speak into, with a "Proofread" button that fixes spelling and grammar
// for the sales or ticket context. Dictation uses the browser's built-in speech service
// (Chrome / Edge); proofreading goes through the CRM server.
export default function VoiceTextField({ value, onChange, context, helperText, disabled, sx, ...rest }: Props) {
  const SR = React.useMemo(getSR, []);
  const [listening, setListening] = React.useState(false);
  const [interim, setInterim] = React.useState('');
  const [lang, setLang] = React.useState(readLang);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [preview, setPreview] = React.useState<{ original: string; polished: string; engine: string; note?: string } | null>(null);

  const recRef = React.useRef<any>(null);
  const wantRef = React.useRef(false);
  const baseRef = React.useRef('');
  const finalRef = React.useRef('');
  const valueRef = React.useRef(value);
  valueRef.current = value;
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const stop = React.useCallback(() => {
    wantRef.current = false;
    if (stopActive === stop) stopActive = null;
    try { recRef.current?.stop(); } catch { /* already stopped */ }
  }, []);
  React.useEffect(() => stop, [stop]);

  const start = () => {
    if (!SR) return;
    if (stopActive && stopActive !== stop) stopActive();
    stopActive = stop;
    setError('');
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    baseRef.current = valueRef.current;
    finalRef.current = '';
    rec.onresult = (e: any) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current = join(finalRef.current, String(r[0].transcript).trim());
        else live += r[0].transcript;
      }
      setInterim(live);
      onChangeRef.current(join(baseRef.current, finalRef.current));
    };
    rec.onerror = (e: any) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      wantRef.current = false;
      setError(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'The microphone is blocked. Allow it for this site in your browser, then try again.'
          : e.error === 'network' ? 'Voice input needs an internet connection.'
          : e.error === 'audio-capture' ? 'No microphone was found.' : `Voice input stopped (${e.error}).`
      );
    };
    // Browsers end a session after a pause; carry on until the user presses stop.
    rec.onend = () => {
      if (wantRef.current) { try { rec.start(); return; } catch { /* fall through */ } }
      setListening(false);
      setInterim('');
    };
    recRef.current = rec;
    wantRef.current = true;
    try { rec.start(); setListening(true); } catch { setError('Could not start the microphone.'); wantRef.current = false; }
  };

  // Typing while dictating becomes the new starting point, so nothing typed is overwritten.
  const handleTyped = (v: string) => { baseRef.current = v; finalRef.current = ''; onChange(v); };

  const proofread = async () => {
    stop();
    setBusy(true);
    setError('');
    try {
      const r = await api.polishText({ text: value, context });
      setPreview({ original: value, polished: r.data.data.text, engine: r.data.data.engine, note: r.data.data.note });
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not proofread the text');
    } finally { setBusy(false); }
  };

  const changeLang = (code: string) => {
    setLang(code);
    try { localStorage.setItem('voiceLang', code); } catch { /* storage unavailable */ }
    if (listening) { stop(); }
  };

  return (
    <Box sx={sx}>
      <TextField {...rest} fullWidth disabled={disabled} value={value} onChange={(e) => handleTyped(e.target.value)} helperText={helperText} />
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
        <Tooltip title={!SR ? 'Voice input needs Chrome or Edge' : listening ? 'Stop dictating' : 'Dictate with your voice'}>
          <span>
            <IconButton size="small" color={listening ? 'error' : 'primary'} disabled={disabled || !SR} onClick={listening ? stop : start} aria-label={listening ? 'Stop dictating' : 'Start dictating'}
              sx={listening ? { animation: 'voicePulse 1.2s ease-in-out infinite', '@keyframes voicePulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.45 } } } : undefined}>
              {listening ? <StopIcon fontSize="small" /> : <MicIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
        <Select size="small" variant="standard" value={lang} onChange={(e) => changeLang(e.target.value)} disabled={disabled || !SR || listening} sx={{ fontSize: 12, minWidth: 100 }} aria-label="Dictation language">
          {LANGS.map((l) => <MenuItem key={l.code} value={l.code}>{l.label}</MenuItem>)}
        </Select>
        <Tooltip title="Fix spelling and grammar for sales calls / client issues">
          <span>
            <Button size="small" startIcon={busy ? <CircularProgress size={14} /> : <ProofreadIcon fontSize="small" />} disabled={disabled || busy || !value.trim()} onClick={proofread}>Proofread</Button>
          </span>
        </Tooltip>
        {listening && <Typography variant="caption" color="error">Listening… {interim && <Box component="span" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>{interim}</Box>}</Typography>}
      </Stack>
      {error && <Alert severity="warning" sx={{ mt: 0.5, py: 0 }} onClose={() => setError('')}>{error}</Alert>}

      <Dialog open={!!preview} onClose={() => setPreview(null)} maxWidth="md" fullWidth>
        <DialogTitle>Proofread suggestion</DialogTitle>
        <DialogContent>
          {preview?.note && <Alert severity="info" sx={{ mb: 2 }}>{preview.note}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">What you wrote</Typography>
              <TextField fullWidth multiline minRows={4} value={preview?.original || ''} InputProps={{ readOnly: true }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">Corrected{preview?.engine === 'ai' ? ' (AI proofread)' : ' (basic clean-up)'} - you can still edit it</Typography>
              <TextField fullWidth multiline minRows={4} value={preview?.polished || ''} onChange={(e) => preview && setPreview({ ...preview, polished: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreview(null)}>Keep mine</Button>
          <Button variant="contained" onClick={() => { if (preview) onChange(preview.polished); setPreview(null); }}>Use corrected text</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
