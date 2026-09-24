// src/theme/index.ts
// Clinical design system: restrained palette, WCAG AA compliant.
// No neon, no gradients. Enterprise-grade medical tool aesthetic.

import { StyleSheet } from 'react-native';

export const Colors = {
  // Primary — trustworthy clinical blue
  primaryBlue: '#1A5C8A',
  primaryDark: '#0F3D5C',
  primaryLight: '#E8F1F8',

  // Surfaces
  surfaceWhite: '#FFFFFF',
  surfaceGray: '#F5F7FA',
  surfaceCard: '#FFFFFF',
  border: '#CED4DA',
  borderLight: '#E9ECEF',

  // Text — high contrast
  textPrimary: '#1A1D23',
  textSecondary: '#4A5568',
  textDisabled: '#9AA5B4',
  textInverse: '#FFFFFF',

  // Status
  successGreen: '#2D7D46',
  successLight: '#E8F5EC',
  warningAmber: '#B45309',
  warningLight: '#FEF3C7',
  errorRed: '#C0392B',
  errorLight: '#FDECEB',
  requiredRed: '#C0392B',

  // Sync status
  syncPending: '#B45309',
  syncSynced: '#2D7D46',
  syncFailed: '#C0392B',
  syncInProgress: '#1A5C8A',
} as const;

export const Fonts = {
  regular: 'System',
  medium: 'System',
  semibold: 'System',
  bold: 'System',
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    hero: 28,
  },
  lineHeights: {
    tight: 18,
    base: 22,
    relaxed: 26,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  section: 40,
} as const;

export const Radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 9999,
} as const;

// Minimum accessible touch target size (WCAG 2.5.5)
export const MIN_TOUCH_TARGET = 48;

// ── Shared Stylesheet ─────────────────────────────────────────────────────────

export const GlobalStyles = StyleSheet.create({
  // Layout
  flex1: { flex: 1 },
  screen: { flex: 1, backgroundColor: Colors.surfaceGray },
  container: { paddingHorizontal: Spacing.base },

  // Card
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
  },
  cardElevated: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },

  // Typography
  heroText: {
    fontSize: Fonts.sizes.hero,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '600',
    color: Colors.primaryDark,
    letterSpacing: 0.1,
  },
  questionPrompt: {
    fontSize: Fonts.sizes.md,
    fontWeight: '500',
    color: Colors.textPrimary,
    lineHeight: Fonts.lineHeights.relaxed,
  },
  questionId: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    color: Colors.primaryBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bodyText: {
    fontSize: Fonts.sizes.base,
    color: Colors.textSecondary,
    lineHeight: Fonts.lineHeights.base,
  },
  caption: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textDisabled,
    lineHeight: Fonts.lineHeights.tight,
  },
  label: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },

  // Primary button (large touch target)
  primaryButton: {
    backgroundColor: Colors.primaryBlue,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
  },
  primaryButtonText: {
    color: Colors.textInverse,
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Outline button
  outlineButton: {
    backgroundColor: 'transparent',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primaryBlue,
    paddingVertical: 13,
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
  },
  outlineButtonText: {
    color: Colors.primaryBlue,
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
  },

  // Text button
  textButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
  },
  textButtonText: {
    color: Colors.primaryBlue,
    fontSize: Fonts.sizes.base,
    fontWeight: '500',
  },

  // Input field
  inputField: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Fonts.sizes.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceWhite,
    minHeight: MIN_TOUCH_TARGET,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.base,
  },

  // Row utilities
  row: { flexDirection: 'row', alignItems: 'center' },
  spaceBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  // Center
  center: { alignItems: 'center', justifyContent: 'center' },
});
