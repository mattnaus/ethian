// Tailwind CSS v4 uses CSS-first configuration.
// Most configuration is done in src/app/globals.css via @theme.
// This file is kept minimal for any tooling that requires it.

import type { Config } from "tailwindcss";

const config: Config = {
  // In v4, content scanning is automatic. You can specify paths here
  // if you need to override the defaults.
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
