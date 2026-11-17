import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" lets the built app run from any folder,
// e.g. http://localhost/work-time-calculator/dist/ under XAMPP.
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: { port: 5174, open: true },
});
