import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// When deployed to GitHub Pages as a project site the app is served from
// https://<user>.github.io/<repo>/ , so the base path must match the repo name.
// Override with VITE_BASE for a custom domain or a different repo name.
const base = process.env.VITE_BASE ?? "/SahaCRM/";

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
