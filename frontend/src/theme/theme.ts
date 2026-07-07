import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
      contrastText: '#fff',
    },
    secondary: {
      main: '#ec4899',
      light: '#f472b6',
      dark: '#db2777',
      contrastText: '#fff',
    },
    success: {
      main: '#10b981',
      light: '#6ee7b7',
      dark: '#059669',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    error: {
      main: '#ef4444',
      light: '#fca5a5',
      dark: '#dc2626',
    },
    info: {
      main: '#0ea5e9',
      light: '#38bdf8',
      dark: '#0284c7',
    },
    background: {
      default: '#f0f9ff',
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
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
      color: '#1e293b',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      color: '#1e293b',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: '#334155',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: '#64748b',
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
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)',
          '&:hover': {
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            boxShadow: '0 15px 35px rgba(99, 102, 241, 0.5)',
            transform: 'translateY(-2px)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
          boxShadow: '0 10px 25px rgba(236, 72, 153, 0.4)',
          '&:hover': {
            background: 'linear-gradient(135deg, #db2777 0%, #e11d48 100%)',
            boxShadow: '0 15px 35px rgba(236, 72, 153, 0.5)',
            transform: 'translateY(-2px)',
          },
        },
        containedSuccess: {
          background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
          boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
          '&:hover': {
            background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
            boxShadow: '0 15px 35px rgba(16, 185, 129, 0.5)',
            transform: 'translateY(-2px)',
          },
        },
        outlinedPrimary: {
          borderColor: '#6366f1',
          color: '#6366f1',
          '&:hover': {
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderColor: '#4f46e5',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
          '&:hover': {
            boxShadow: '0 12px 32px rgba(99, 102, 241, 0.15)',
            borderColor: 'rgba(99, 102, 241, 0.3)',
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
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: '#fff',
        },
        colorSecondary: {
          background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
          color: '#fff',
        },
        colorSuccess: {
          background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
          color: '#fff',
        },
        colorWarning: {
          background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
          color: '#fff',
        },
        colorError: {
          background: 'linear-gradient(135deg, #ef4444 0%, #f43f5e 100%)',
          color: '#fff',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.8)',
            transition: 'all 0.3s',
            '& fieldset': {
              borderColor: 'rgba(99, 102, 241, 0.3)',
            },
            '&:hover fieldset': {
              borderColor: '#6366f1',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#6366f1',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
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
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
          },
          '&.Mui-selected': {
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%)',
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: '#ffffff',
          fontWeight: 700,
        },
        body: {
          '&:hover': {
            backgroundColor: 'rgba(99, 102, 241, 0.05)',
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
