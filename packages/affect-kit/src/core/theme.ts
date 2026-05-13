// Shared Lit property converter for the `theme` attribute across all
// components. Theme is the single switch that flips ink/paper polarity:
//
//   'light' (default) — dark ink on white paper
//   'dark'            — white ink on dark paper
//   'auto'            — follow prefers-color-scheme via @media
//
// Theme is orthogonal to color-mode: theme picks the page; color-mode
// picks what gets painted on it. The components implement theme via
// internal --_ink / --_paper custom properties; this module just types
// and converts the public attribute.

import type { Theme } from './types';

/** @internal */
export const themeConverter = {
  fromAttribute(value: string | null): Theme {
    if (value === 'dark') return 'dark';
    if (value === 'auto') return 'auto';
    return 'light';
  },
  toAttribute(value: Theme): string {
    return value;
  },
};
