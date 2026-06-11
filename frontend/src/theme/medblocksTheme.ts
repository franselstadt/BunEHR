/**
 * BunEHR — Ghibli × Claude Code Design System
 *
 * Three muted pastel tones on warm parchment:
 *   Periwinkle  #7B93B8  — primary actions, links, active state
 *   Sage green  #8FAE93  — success, vitals normal, positive
 *   Terracotta  #B8846A  — warnings, accents, critical
 *
 * Base palette:
 *   Parchment   #F7F3EC  — page background
 *   Linen       #FEFAF4  — card / surface
 *   Warm border #DDD5C5  — dividers, card outlines
 *   Ink brown   #3B3228  — primary text (warm, not harsh black)
 *   Mist        #8A7E72  — secondary text
 */
import { createTheme } from '@mui/material/styles'

// ── Token palette ─────────────────────────────────────────────────────────────
export const tokens = {
  periwinkle:     '#7B93B8',
  periwinkleLight:'#EAF0F8',
  sage:           '#8FAE93',
  sageLight:      '#EBF3EC',
  terra:          '#B8846A',
  terraLight:     '#F5ECE7',
  parchment:      '#F7F3EC',
  linen:          '#FEFAF4',
  warmBorder:     '#DDD5C5',
  warmBorderDark: '#C8BBA8',
  inkBrown:       '#3B3228',
  mist:           '#8A7E72',
  sidebar:        '#2C2820',
  sidebarHover:   '#3D352C',
  sidebarActive:  '#4A3F35',
  sidebarText:    '#C8BCAD',
  sidebarMuted:   '#6B5E52',
} as const

export const medblocksTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main:         tokens.periwinkle,
      light:        '#9AAFC7',
      dark:         '#5E7A9E',
      contrastText: '#FEFAF4',
    },
    secondary: {
      main:         tokens.sage,
      light:        '#A8C4AC',
      dark:         '#6D9273',
      contrastText: '#FEFAF4',
    },
    error:   { main: '#B05A5A' },
    warning: { main: tokens.terra },
    info:    { main: tokens.periwinkle },
    success: { main: tokens.sage },
    background: {
      default: tokens.parchment,
      paper:   tokens.linen,
    },
    text: {
      primary:   tokens.inkBrown,
      secondary: tokens.mist,
    },
    divider: tokens.warmBorder,
  },
  typography: {
    // Body: Nunito — humanist, warm, slightly rounded (Claude × Ghibli)
    // Headings: Cormorant Garamond — elegant warm serif (Ghibli scroll feel)
    fontFamily: '"Nunito", system-ui, -apple-system, sans-serif',
    h1: { fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 700, fontSize: '2.2rem',   letterSpacing: '-0.01em', color: tokens.inkBrown },
    h2: { fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 600, fontSize: '1.65rem',  letterSpacing:      '0em', color: tokens.inkBrown },
    h3: { fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 600, fontSize: '1.25rem',  letterSpacing:      '0em', color: tokens.inkBrown },
    h4: { fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 600, fontSize: '1.05rem',  color: tokens.inkBrown },
    h5: { fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 600, color: tokens.inkBrown },
    h6: { fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 600, color: tokens.inkBrown },
    body1:   { fontSize: '0.9375rem', lineHeight: 1.75, color: tokens.inkBrown, fontWeight: 400 },
    body2:   { fontSize: '0.875rem',  lineHeight: 1.65, color: tokens.mist,     fontWeight: 400 },
    caption: { fontSize: '0.75rem',   color: tokens.mist },
    button:  { fontFamily: '"Nunito", system-ui, sans-serif', fontWeight: 600, textTransform: 'none' as const },
    subtitle1: { fontFamily: '"Nunito", system-ui, sans-serif', fontWeight: 600 },
    subtitle2: { fontFamily: '"Nunito", system-ui, sans-serif', fontWeight: 600, fontSize: '0.875rem' },
    overline:  { fontFamily: '"Nunito", system-ui, sans-serif', fontWeight: 700 },
  },
  shape: { borderRadius: 8 },
  shadows: [
    'none',
    '0 1px 2px rgba(59,50,40,0.06)',
    '0 2px 4px rgba(59,50,40,0.07)',
    '0 3px 8px rgba(59,50,40,0.08)',
    '0 4px 12px rgba(59,50,40,0.09)',
    '0 6px 16px rgba(59,50,40,0.1)',
    '0 8px 24px rgba(59,50,40,0.11)',
    '0 10px 32px rgba(59,50,40,0.12)',
    '0 12px 40px rgba(59,50,40,0.13)',
    '0 14px 48px rgba(59,50,40,0.14)',
    '0 16px 56px rgba(59,50,40,0.15)',
    '0 18px 64px rgba(59,50,40,0.16)',
    '0 20px 72px rgba(59,50,40,0.17)',
    '0 22px 80px rgba(59,50,40,0.18)',
    '0 24px 88px rgba(59,50,40,0.19)',
    '0 26px 96px rgba(59,50,40,0.2)',
    '0 28px 104px rgba(59,50,40,0.21)',
    '0 30px 112px rgba(59,50,40,0.22)',
    '0 32px 120px rgba(59,50,40,0.23)',
    '0 34px 128px rgba(59,50,40,0.24)',
    '0 36px 136px rgba(59,50,40,0.25)',
    '0 38px 144px rgba(59,50,40,0.26)',
    '0 40px 152px rgba(59,50,40,0.27)',
    '0 42px 160px rgba(59,50,40,0.28)',
    '0 44px 168px rgba(59,50,40,0.29)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        * { box-sizing: border-box; }
        body { background: ${tokens.parchment}; color: ${tokens.inkBrown}; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${tokens.warmBorderDark}; border-radius: 3px; }
        ::selection { background: ${tokens.periwinkleLight}; }
      `,
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.linen,
          color:           tokens.inkBrown,
          borderBottom:    `1px solid ${tokens.warmBorder}`,
          boxShadow:       'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: tokens.sidebar,
          color:           tokens.sidebarText,
          borderRight:     'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.linen,
          border:          `1px solid ${tokens.warmBorder}`,
          boxShadow:       '0 1px 3px rgba(59,50,40,0.06)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform:  'none',
          fontWeight:      600,
          borderRadius:    6,
          letterSpacing:   '0.01em',
        },
        contained: {
          boxShadow:  'none',
          '&:hover':  { boxShadow: '0 2px 8px rgba(59,50,40,0.15)' },
        },
        outlined: {
          borderColor: tokens.warmBorderDark,
          '&:hover':   { borderColor: tokens.periwinkle, backgroundColor: tokens.periwinkleLight },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight:   500,
          fontSize:     '0.73rem',
          borderRadius: 5,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            fontWeight:      600,
            fontSize:        '0.78rem',
            color:           tokens.mist,
            backgroundColor: tokens.parchment,
            letterSpacing:   '0.04em',
            textTransform:   'uppercase',
            borderBottom:    `2px solid ${tokens.warmBorder}`,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: tokens.warmBorder, fontSize: '0.875rem' },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: tokens.linen,
            '& fieldset':         { borderColor: tokens.warmBorder },
            '&:hover fieldset':   { borderColor: tokens.warmBorderDark },
            '&.Mui-focused fieldset': { borderColor: tokens.periwinkle },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: { backgroundColor: tokens.linen },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8, fontSize: '0.875rem' },
        standardInfo:    { backgroundColor: tokens.periwinkleLight, color: tokens.inkBrown, border: `1px solid #C5D3E8` },
        standardSuccess: { backgroundColor: tokens.sageLight,       color: tokens.inkBrown, border: `1px solid #C2D8C5` },
        standardWarning: { backgroundColor: tokens.terraLight,       color: tokens.inkBrown, border: `1px solid #DBBFAE` },
        standardError:   { backgroundColor: '#F5EAEA',              color: tokens.inkBrown, border: `1px solid #D4B0B0` },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: tokens.warmBorder } },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight:    500,
          fontSize:      '0.875rem',
          color:         tokens.mist,
          '&.Mui-selected': { color: tokens.inkBrown, fontWeight: 600 },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: tokens.periwinkle, height: 2 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 4, height: 5, backgroundColor: tokens.warmBorder } },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: tokens.warmBorder },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: tokens.inkBrown,
          fontSize: '0.75rem',
          borderRadius: 5,
          padding: '6px 10px',
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: { boxShadow: '0 2px 8px rgba(59,50,40,0.18)' },
      },
    },
  },
})

// ── Clinical status badge colours ─────────────────────────────────────────────
export const statusColors: Record<string, string> = {
  ACTIVE:      tokens.periwinkle,
  ADMITTED:    tokens.periwinkle,
  DISCHARGED:  tokens.mist,
  CRITICAL:    '#B05A5A',
  STABLE:      tokens.sage,
  OBSERVATION: tokens.terra,
}

// ── Ward badge colours (muted pastels only) ───────────────────────────────────
export const wardColors: Record<string, string> = {
  'Emergency':        '#B05A5A',
  'ICU':              '#9B86B2',
  'Cardiology':       tokens.periwinkle,
  'General Medicine': tokens.sage,
  'Orthopedics':      tokens.terra,
  'Pediatrics':       '#C084A0',
  'Neurology':        '#9B86B2',
  'Oncology':         '#7A9AA8',
}
