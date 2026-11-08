import type { Config } from "tailwindcss";

// shadcn/ui-style token setup: colours are CSS variables defined in globals.css.
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
      borderRadius: { xl: "0.875rem", lg: "0.625rem", md: "0.5rem", sm: "0.375rem" },
      boxShadow: {
        card: "0 1px 2px 0 rgb(16 34 47 / 0.04), 0 1px 3px 0 rgb(16 34 47 / 0.06)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
