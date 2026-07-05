import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      // During local dev with `vercel dev` this isn't needed,
      // but this keeps a plain `vite dev` workable if you point
      // VITE_GROQ_API_KEY at the browser build (see README).
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
