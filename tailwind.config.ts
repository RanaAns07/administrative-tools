import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        leads: {
          blue: "#1C3573",
          gold: "#FCE116",
          red: "#A91D22",
          gray: "#F3F4F6",
        },
      },
    },
  },
  plugins: [],
};
export default config;
