import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config();

export default defineConfig({
  base: '/',
  define: {
    "process.env": process.env,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@Actions": path.resolve(__dirname, "./src/actions"),
      "@Reducers": path.resolve(__dirname, "./src/reducers"),
      "@Sagas": path.resolve(__dirname, "./src/sagas"),
      "@Utils": path.resolve(__dirname, "./src/utils"),
    },
  },
});
