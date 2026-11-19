import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "PingFang SC", "Microsoft YaHei", "sans-serif"],
        display: ["var(--font-space-grotesk)", "var(--font-inter)", "PingFang SC", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        pop: {
          cream: "#FFF8E7",
          yellow: "#FFE500",
          mint: "#00E599",
          coral: "#FF5C5C",
          blue: "#3B82F6",
          purple: "#A855F7",
        },
      },
      boxShadow: {
        brutal: "5px 5px 0px #000000",
        "brutal-sm": "3px 3px 0px #000000",
        "brutal-dark": "5px 5px 0px #FFE500",
        "brutal-dark-sm": "3px 3px 0px #FFE500",
      },
    },
  },
  plugins: [],
};

export default config;
