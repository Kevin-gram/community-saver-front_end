import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Explicitly set entries so Vite can discover entry points for pre-bundling
    entries: ["index.html", "src/main.tsx"],
    include: ["react", "react-dom"],
    exclude: ["lucide-react"],
  },
});
