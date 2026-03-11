import type { Config } from "tailwindcss";

const config: Config {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          900: '#1e3a8a',
        },
        teal: {
          500: '#14b8a6',
        }
      },
    },
  },
  plugins: [],
};
export default config;
