import type { Config } from "tailwindcss";

// Colours are CSS variables defined in globals.css (the design tokens).
const v = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      colors: {
        border: v("border"),
        input: v("input"),
        ring: v("ring"),
        background: v("background"),
        foreground: v("foreground"),
        primary: { DEFAULT: v("primary"), hover: v("primary-hover"), foreground: v("primary-foreground") },
        secondary: { DEFAULT: v("secondary"), foreground: v("secondary-foreground") },
        muted: { DEFAULT: v("muted"), foreground: v("muted-foreground") },
        accent: { DEFAULT: v("accent"), foreground: v("accent-foreground") },
        coral: { DEFAULT: v("coral"), hover: v("coral-hover"), foreground: v("coral-foreground") },
        mint: v("mint"),
        destructive: { DEFAULT: v("destructive"), foreground: v("destructive-foreground") },
        card: { DEFAULT: v("card"), foreground: v("card-foreground") },
        info: v("info"),
        success: v("success"),
        warning: v("warning"),
        sidebar: {
          DEFAULT: v("sidebar"),
          foreground: v("sidebar-foreground"),
          muted: v("sidebar-muted"),
          active: v("sidebar-active"),
        },
      },
      borderRadius: { xl: "1rem", lg: "0.75rem", md: "0.5rem", sm: "0.375rem" },
      boxShadow: {
        card: "0 1px 2px 0 rgb(13 27 23 / 0.05), 0 2px 8px -2px rgb(13 27 23 / 0.07)",
        lift: "0 2px 4px 0 rgb(13 27 23 / 0.06), 0 12px 28px -8px rgb(13 27 23 / 0.16)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-out-quart": "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
        display: ["var(--font-display)", "ui-serif", "Georgia", "Cambria", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
