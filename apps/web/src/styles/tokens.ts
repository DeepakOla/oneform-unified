/**
 * OneForm Brand Design Tokens
 *
 * Single source of truth for brand colors in JS/TS context.
 * CSS custom properties (--primary, --saffron-500, etc.) are the source
 * for Tailwind utilities. This file exports the same values for use in
 * JS logic (e.g. chart colors, dynamic class generation, Razorpay theme).
 *
 * Control all brand colors from here + apps/web/src/styles/globals.css
 */

export const brand = {
  /** OneForm Blue — primary brand color, all CTA buttons and links */
  primary: 'hsl(220, 85%, 54%)',       // tailwind: oneform-500
  primaryLight: 'hsl(220, 100%, 97%)', // tailwind: oneform-50 — light bg tints
  primaryDark: 'hsl(220, 80%, 44%)',   // tailwind: oneform-600 — hover states

  /** Saffron — India flag color, accent CTAs, highlights */
  saffron: 'hsl(27, 100%, 55%)',       // tailwind: saffron-500
  saffronDark: 'hsl(27, 100%, 45%)',   // tailwind: saffron-600

  /** India Green — success states, verified badges */
  indiaGreen: 'hsl(135, 70%, 31%)',    // tailwind: india-green-500
  indiaGreenDark: 'hsl(135, 70%, 25%)',// tailwind: india-green-600

  /** Semantic colors */
  destructive: 'hsl(0, 84%, 60%)',     // error states, delete actions
  warning: 'hsl(38, 92%, 50%)',        // warnings, pending states
  info: 'hsl(220, 85%, 54%)',          // same as primary — informational

  /** Chart palette (matches --chart-* CSS vars) */
  chart: [
    'oklch(0.809 0.105 251.813)',
    'oklch(0.623 0.214 259.815)',
    'oklch(0.546 0.245 262.881)',
    'oklch(0.488 0.243 264.376)',
    'oklch(0.424 0.199 265.638)',
  ],
} as const;

/** Razorpay theme colors — used in checkout modal options */
export const razorpayTheme = {
  color: brand.primary,
} as const;
