/**
 * Shared Styles (FE-PR 1.0 - Part 6)
 *
 * CRITICAL: Improve clarity without adding meaning.
 * - Consistent spacing
 * - Typography
 * - Responsive design
 * - Keyboard navigation support
 * - ARIA-friendly patterns
 *
 * Explicit Guardrails:
 * - NO color semantics tied to correctness
 * - NO icons implying good/bad
 * - NO copy changes implying recommendation
 * - NO hiding ambiguous data
 *
 * If a visual choice implies judgment, remove it.
 */

import type { CSSProperties } from 'react';

/**
 * Color palette - neutral, no semantic meaning
 * ALL colors are variations of gray/neutral
 * NO red/green/yellow for success/failure/warning
 */
export const colors = {
  // Backgrounds - darker to lighter
  bgDarkest: '#1a1a1a',
  bgDarker: '#222222',
  bgDark: '#2a2a2a',
  bgMedium: '#333333',
  bgLight: '#444444',

  // Borders
  borderDark: '#333333',
  borderMedium: '#444444',
  borderLight: '#555555',

  // Text - lighter to darker
  textPrimary: '#e0e0e0',
  textSecondary: '#999999',
  textMuted: '#888888',
  textDisabled: '#666666',
  textFaint: '#555555',
} as const;

/**
 * Spacing scale - consistent intervals
 */
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
} as const;

/**
 * Typography - clear, readable, monospace for data
 */
export const typography = {
  fontFamily: {
    base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  },
  fontSize: {
    xs: '10px',
    sm: '11px',
    md: '12px',
    base: '13px',
    lg: '14px',
    xl: '16px',
    xxl: '20px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.5,
  },
} as const;

/**
 * Border radius - consistent rounding
 */
export const borderRadius = {
  sm: '2px',
  md: '4px',
  lg: '8px',
} as const;

/**
 * Common component styles - reusable patterns
 */
export const componentStyles: Record<string, CSSProperties> = {
  // Panel container
  panel: {
    marginBottom: spacing.xxl,
    padding: spacing.lg,
    background: colors.bgDarker,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.borderMedium}`,
  },

  // Panel heading
  panelHeading: {
    margin: `0 0 ${spacing.md} 0`,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    borderBottom: `1px solid ${colors.borderMedium}`,
    paddingBottom: spacing.sm,
    color: colors.textPrimary,
  },

  // Data row (label + value)
  row: {
    display: 'flex',
    marginBottom: spacing.xs,
    lineHeight: typography.lineHeight.normal,
  },

  // Field label
  fieldLabel: {
    minWidth: '140px',
    color: colors.textMuted,
    fontSize: typography.fontSize.base,
  },

  // Field value
  fieldValue: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.fontSize.base,
    wordBreak: 'break-word',
  },

  // List container
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },

  // List item
  listItem: {
    padding: spacing.md,
    background: colors.bgMedium,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.borderMedium}`,
  },

  // Empty state text
  emptyState: {
    color: colors.textDisabled,
    fontStyle: 'italic',
    fontSize: typography.fontSize.base,
  },

  // JSON/code block
  jsonBlock: {
    margin: 0,
    padding: spacing.md,
    background: colors.bgDarkest,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.mono,
    overflow: 'auto',
    maxHeight: '200px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    color: colors.textPrimary,
  },

  // Button - base style (no semantic colors)
  button: {
    padding: `${spacing.sm} ${spacing.lg}`,
    fontSize: typography.fontSize.base,
    border: `1px solid ${colors.borderLight}`,
    borderRadius: borderRadius.md,
    background: colors.bgMedium,
    color: colors.textPrimary,
    cursor: 'pointer',
    fontFamily: typography.fontFamily.base,
  },

  // Button - disabled state
  buttonDisabled: {
    padding: `${spacing.sm} ${spacing.lg}`,
    fontSize: typography.fontSize.base,
    border: `1px solid ${colors.borderDark}`,
    borderRadius: borderRadius.md,
    background: colors.bgDark,
    color: colors.textDisabled,
    cursor: 'not-allowed',
    fontFamily: typography.fontFamily.base,
  },

  // Input/textarea - base style
  input: {
    width: '100%',
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: typography.fontSize.base,
    border: `1px solid ${colors.borderLight}`,
    borderRadius: borderRadius.md,
    background: colors.bgMedium,
    color: colors.textPrimary,
    boxSizing: 'border-box',
    fontFamily: typography.fontFamily.base,
  },

  // Select dropdown
  select: {
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: typography.fontSize.base,
    border: `1px solid ${colors.borderMedium}`,
    borderRadius: borderRadius.md,
    background: colors.bgMedium,
    color: colors.textPrimary,
  },
} as const;

/**
 * Accessibility helpers
 */
export const a11y = {
  // Screen reader only (visually hidden)
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  } as CSSProperties,

  // Focus visible styles (for keyboard navigation)
  focusVisible: {
    outline: `2px solid ${colors.textMuted}`,
    outlineOffset: '2px',
  } as CSSProperties,
} as const;

/**
 * Responsive breakpoints
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;
