import { createTheme } from '@mui/material/styles';

// Light theme: white and light grey surfaces with dark slate text. No blue or
// gradient accents; text fields have light green borders.
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#334155',
      light: '#64748b',
      dark: '#1e293b',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#475569',
      light: '#94a3b8',
      dark: '#334155',
      contrastText: '#ffffff',
    },
    success: {
      main: '#16a34a',
      light: '#86efac',
      dark: '#15803d',
    },
    warning: {
      main: '#d97706',
      light: '#fcd34d',
      dark: '#b45309',
    },
    error: {
      main: '#dc2626',
      light: '#fca5a5',
      dark: '#b91c1c',
    },
    info: {
      main: '#0369a1',
      light: '#7dd3fc',
      dark: '#075985',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#334155',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#0f172a',
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      color: '#0f172a',
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 700,
      color: '#0f172a',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 700,
      color: '#0f172a',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      color: '#0f172a',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      color: '#0f172a',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: '#0f172a',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: '#334155',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          borderRadius: 12,
          padding: '12px 24px',
          fontSize: '0.95rem',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        containedPrimary: {
          background: '#334155',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
          '&:hover': {
            background: '#1e293b',
            boxShadow: '0 6px 16px rgba(15, 23, 42, 0.2)',
          },
        },
        containedSecondary: {
          background: '#475569',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
          '&:hover': {
            background: '#334155',
          },
        },
        containedSuccess: {
          background: '#16a34a',
          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.2)',
          '&:hover': {
            background: '#15803d',
          },
        },
        outlinedPrimary: {
          borderColor: '#334155',
          color: '#334155',
          '&:hover': {
            backgroundColor: 'rgba(51, 65, 85, 0.08)',
            borderColor: '#1e293b',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
          border: '1px solid #e2e8f0',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: '#ffffff',
          '&:hover': {
            boxShadow: '0 6px 16px rgba(15, 23, 42, 0.1)',
            borderColor: '#cbd5e1',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.85rem',
        },
        colorPrimary: {
          background: '#334155',
          color: '#ffffff',
        },
        colorSecondary: {
          background: '#475569',
          color: '#ffffff',
        },
        colorSuccess: {
          background: '#16a34a',
          color: '#ffffff',
        },
        colorWarning: {
          background: '#d97706',
          color: '#ffffff',
        },
        colorError: {
          background: '#dc2626',
          color: '#ffffff',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            background: '#ffffff',
            color: '#0f172a',
            transition: 'all 0.3s',
            '& fieldset': {
              borderColor: '#86efac',
            },
            '&:hover fieldset': {
              borderColor: '#4ade80',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#22c55e',
              borderWidth: 2,
            },
          },
          '& .MuiInputLabel-root': {
            color: '#334155',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: '#ffffff',
          color: '#0f172a',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.1)',
          borderBottom: '1px solid #e2e8f0',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '4px 8px',
          transition: 'all 0.3s',
          '&:hover': {
            background: 'rgba(51, 65, 85, 0.08)',
          },
          '&.Mui-selected': {
            background: 'rgba(51, 65, 85, 0.12)',
            '&:hover': {
              background: 'rgba(51, 65, 85, 0.16)',
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          background: '#f1f5f9',
          color: '#0f172a',
          fontWeight: 700,
        },
        body: {
          '&:hover': {
            backgroundColor: '#f8fafc',
          },
        },
      },
    },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#818cf8',
      light: '#a5b4fc',
      dark: '#6366f1',
      contrastText: '#fff',
    },
    secondary: {
      main: '#f472b6',
      light: '#fbcfe8',
      dark: '#ec4899',
      contrastText: '#fff',
    },
    success: {
      main: '#6ee7b7',
      light: '#a7f3d0',
      dark: '#10b981',
    },
    warning: {
      main: '#fbbf24',
      light: '#fcd34d',
      dark: '#f59e0b',
    },
    error: {
      main: '#fca5a5',
      light: '#fecaca',
      dark: '#ef4444',
    },
    info: {
      main: '#38bdf8',
      light: '#7dd3fc',
      dark: '#0ea5e9',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#cbd5e1',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#f8fafc',
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      color: '#f8fafc',
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 700,
      color: '#f8fafc',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 700,
      color: '#f1f5f9',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      color: '#e2e8f0',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      color: '#e2e8f0',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: '#cbd5e1',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: '#94a3b8',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          borderRadius: 12,
          padding: '12px 24px',
          fontSize: '0.95rem',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
          boxShadow: '0 10px 25px rgba(129, 140, 248, 0.4)',
          '&:hover': {
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            boxShadow: '0 15px 35px rgba(129, 140, 248, 0.5)',
            transform: 'translateY(-2px)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #f472b6 0%, #f97316 100%)',
          boxShadow: '0 10px 25px rgba(244, 114, 182, 0.4)',
          '&:hover': {
            background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
            boxShadow: '0 15px 35px rgba(244, 114, 182, 0.5)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(129, 140, 248, 0.2)',
          backgroundColor: '#1e293b',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 12px 32px rgba(129, 140, 248, 0.25)',
            borderColor: 'rgba(129, 140, 248, 0.4)',
            transform: 'translateY(-4px)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.85rem',
        },
        colorPrimary: {
          background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
          color: '#0f172a',
        },
        colorSecondary: {
          background: 'linear-gradient(135deg, #f472b6 0%, #f97316 100%)',
          color: '#0f172a',
        },
        colorSuccess: {
          background: 'linear-gradient(135deg, #6ee7b7 0%, #6366f1 100%)',
          color: '#0f172a',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            background: 'rgba(30, 41, 59, 0.8)',
            transition: 'all 0.3s',
            '& fieldset': {
              borderColor: 'rgba(129, 140, 248, 0.3)',
            },
            '&:hover fieldset': {
              borderColor: '#818cf8',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#818cf8',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          boxShadow: '0 8px 24px rgba(129, 140, 248, 0.2)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '4px 8px',
          transition: 'all 0.3s',
          '&:hover': {
            background: 'linear-gradient(135deg, rgba(129, 140, 248, 0.15) 0%, rgba(167, 139, 250, 0.15) 100%)',
          },
          '&.Mui-selected': {
            background: 'linear-gradient(135deg, rgba(129, 140, 248, 0.2) 0%, rgba(167, 139, 250, 0.2) 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, rgba(129, 140, 248, 0.3) 0%, rgba(167, 139, 250, 0.3) 100%)',
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)',
          color: '#0f172a',
          fontWeight: 700,
        },
        body: {
          '&:hover': {
            backgroundColor: 'rgba(129, 140, 248, 0.1)',
          },
        },
      },
    },
  },
});
